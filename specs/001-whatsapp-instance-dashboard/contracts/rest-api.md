# REST API Contract: WhatsApp Instance Control Dashboard

**Branch**: `001-whatsapp-instance-dashboard` | **Date**: 2026-06-01

Base URL (produção): `https://<app>.vercel.app/api`

Todas as rotas requerem autenticação via Supabase JWT (`Authorization: Bearer <token>`).
O middleware de autenticação valida o token e extrai `role` e `tenant_id` do payload JWT.

---

## Autenticação

### `POST /api/auth/login`
Delegado ao Supabase Auth SDK — não é uma rota customizada.
Clientes usam `supabase.auth.signInWithPassword({ email, password })` diretamente do frontend.

---

## Tenants (Admin only)

### `GET /api/tenants`
Lista todos os tenants.
**Role**: admin

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Acme Corp",
      "status": "active",
      "plan": { "id": "uuid", "name": "pro", "max_instances": 5 },
      "primary_contact_email": "contato@acme.com",
      "instance_count": 3,
      "created_at": "2026-06-01T00:00:00Z"
    }
  ]
}
```

### `POST /api/tenants`
Cria um novo tenant.
**Role**: admin

**Request body**:
```json
{
  "name": "Acme Corp",
  "plan_id": "uuid",
  "primary_contact_email": "contato@acme.com"
}
```

**Response 201**: tenant criado (mesmo schema do GET)

**Response 409**: tenant com mesmo nome já existe

### `GET /api/tenants/:id`
Detalhes de um tenant.
**Role**: admin

### `PATCH /api/tenants/:id`
Atualiza tenant (nome, status, plano).
**Role**: admin

**Request body** (campos opcionais):
```json
{
  "name": "Acme Corp Updated",
  "status": "suspended",
  "plan_id": "uuid"
}
```

**Efeito imediato**: mudança de `plan_id` altera a quota de instâncias instantaneamente.
Se o tenant tiver mais instâncias do que o novo plano permite, as instâncias existentes
não são deletadas, mas novas criações são bloqueadas até reduzir abaixo da nova quota.

---

## Instances (Admin: todas | Client: somente próprias)

### `GET /api/instances`
Lista instâncias. Admin vê todas; client vê apenas as do próprio tenant.
Filtros opcionais: `?tenant_id=uuid&status=offline&search=5511`

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "tenant_name": "Acme Corp",
      "phone_number": "5511999990000",
      "display_name": "Suporte Acme",
      "status": "online",
      "last_seen_at": "2026-06-01T10:00:00Z",
      "created_at": "2026-06-01T00:00:00Z"
    }
  ],
  "total": 42
}
```

### `POST /api/instances` *(Admin only)*
Cria nova instância para um tenant.

**Request body**:
```json
{
  "tenant_id": "uuid",
  "phone_number": "5511999990000",
  "display_name": "Suporte Acme"
}
```

**Validações**:
- `tenant_id` deve existir e estar `active`.
- Tenant não pode exceder a quota do plano (`max_instances`).
- `phone_number` deve ser único por tenant.

**Response 201**:
```json
{
  "data": {
    "id": "uuid",
    "status": "pending",
    "qr_code": "data:image/png;base64,..."
  }
}
```

**Response 422**: quota excedida
```json
{ "error": "QUOTA_EXCEEDED", "detail": "Plan 'basic' allows 1 instance. Tenant has 1." }
```

### `GET /api/instances/:id`
Detalhes de uma instância + estatísticas recentes.
**Role**: admin (qualquer) | client (somente própria)

**Response 200**:
```json
{
  "data": {
    "id": "uuid",
    "tenant_id": "uuid",
    "phone_number": "5511999990000",
    "display_name": "Suporte Acme",
    "status": "online",
    "last_seen_at": "2026-06-01T10:00:00Z",
    "notification_configs": [
      { "channel": "email", "recipient": "ops@acme.com", "is_global": false }
    ],
    "recent_events": 5,
    "dispatch_count_24h": 12
  }
}
```

**Response 403**: client tentando acessar instância de outro tenant.

### `PATCH /api/instances/:id` *(Admin only)*
Atualiza display_name ou notification_configs de uma instância.

### `DELETE /api/instances/:id` *(Admin only)*
Remove permanentemente a instância e encerra a sessão no WPP Service.

**Response 200**: `{ "message": "Instance deleted" }`

### `POST /api/instances/:id/restart` *(Admin only)*
Reinicia a instância no WPP Service (encerra sessão e inicia nova).

**Response 200**:
```json
{ "status": "reconnecting", "qr_code": "data:image/png;base64,..." }
```

### `POST /api/instances/:id/reconnect`
Inicia fluxo de reconexão via QR Code.
**Role**: admin (qualquer instância) | client (somente própria instância)

Gera um QR Code independente para esta sessão de reconexão.
Múltiplos QR Codes podem coexistir; o primeiro scan bem-sucedido invalida os demais.

**Response 200**:
```json
{
  "qr_code": "data:image/png;base64,...",
  "expires_at": "2026-06-01T10:01:00Z"
}
```

**Response 409**: instância já está `online`
```json
{ "error": "ALREADY_ONLINE" }
```

---

## Event Logs (Admin: todos | Client: somente próprios)

### `GET /api/instances/:id/logs`
Histórico de eventos de uma instância.

**Query params**:
- `from`: ISO date (default: `now - 30 days`)
- `to`: ISO date (default: `now`)
- `type`: filtra por `event_type` (ex: `status_change`)
- `severity`: `info | warning | error`
- `limit`: default 50, max 200
- `offset`: para paginação

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "event_type": "status_change",
      "severity": "warning",
      "description": "Instance transitioned from online to offline",
      "metadata": { "previous_status": "online", "new_status": "offline" },
      "created_at": "2026-06-01T09:55:00Z"
    }
  ],
  "total": 247,
  "limit": 50,
  "offset": 0
}
```

---

## Notification Configs (Admin only)

### `PUT /api/instances/:id/notifications`
Substitui toda a configuração de notificações da instância.

**Request body**:
```json
{
  "configs": [
    { "channel": "email", "recipient": "ops@empresa.com", "is_global": false },
    { "channel": "whatsapp", "recipient": "5511999990001", "is_global": false }
  ]
}
```

**Response 200**: configs atualizadas

---

## Webhooks (Interno — WPP Service → Next.js)

### `POST /api/webhooks/wpp`
Recebe eventos do WPP Connect Service. Autenticado via shared secret
(`WPP_WEBHOOK_SECRET` no header `X-WPP-Signature`).

**Request body** (exemplo de status change):
```json
{
  "event": "session_status",
  "session_id": "tenant-uuid_instance-uuid",
  "status": "offline",
  "timestamp": "2026-06-01T09:55:00Z"
}
```

**Ações executadas internamente**:
1. Atualizar `instances.status` e `instances.last_seen_at`.
2. Inserir entrada em `event_logs`.
3. Se `offline`: verificar `alert_windows` → se nova janela, despachar alertas.
4. Se `online` (após offline): verificar se estável por 2min → despachar notificação de recuperação.

**Response**: sempre `200 OK` (falhas são logadas, não retornadas ao WPP Service).

---

## Plans (Admin only)

### `GET /api/plans`
Lista planos disponíveis.

**Response 200**:
```json
{
  "data": [
    { "id": "uuid", "name": "basic", "max_instances": 1 },
    { "id": "uuid", "name": "pro", "max_instances": 5 },
    { "id": "uuid", "name": "enterprise", "max_instances": -1 }
  ]
}
```

---

## Erros Padrão

| HTTP Status | Código | Quando |
|-------------|--------|--------|
| 400 | `VALIDATION_ERROR` | Body inválido, campo faltando |
| 401 | `UNAUTHORIZED` | JWT ausente ou expirado |
| 403 | `FORBIDDEN` | Role insuficiente ou tenant incorreto |
| 404 | `NOT_FOUND` | Recurso não encontrado |
| 409 | `CONFLICT` | Conflito de unicidade (ex: phone_number duplicado) |
| 422 | `QUOTA_EXCEEDED` | Limite de instâncias do plano atingido |
| 500 | `INTERNAL_ERROR` | Erro inesperado (logado no Cloud Logging) |

Formato padrão de erro:
```json
{
  "error": "CÓDIGO_ERRO",
  "detail": "Descrição legível do erro"
}
```
