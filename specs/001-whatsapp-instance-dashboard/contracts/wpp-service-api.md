# WPP Connect Service API Contract

**Branch**: `001-whatsapp-instance-dashboard` | **Date**: 2026-06-01

API interna do serviço WPP Connect (Cloud Run).
Chamada exclusivamente pelas API Routes do Next.js — nunca exposta diretamente ao cliente.

Base URL (interno): `https://wpp-service-<hash>.run.app`
Autenticação: `Authorization: Bearer <WPP_SERVICE_SECRET>` (GCP Secret Manager)

---

## Sessions

### `POST /sessions/:sessionId/start`
Inicia ou retoma uma sessão WPP Connect.
`sessionId` = `<tenant_id>_<instance_id>` (slug único por instância).

Se a sessão já existir (token salvo no Supabase), tenta retomar sem QR Code.
Se não existir ou expirada, gera novo QR Code.

**Response 200 — retomada sem QR**:
```json
{ "status": "online", "session_id": "abc_xyz" }
```

**Response 200 — novo QR Code necessário**:
```json
{
  "status": "qr_ready",
  "session_id": "abc_xyz",
  "qr_code": "data:image/png;base64,...",
  "expires_at": "2026-06-01T10:01:00Z"
}
```

**Response 409**: sessão já está online
```json
{ "status": "online", "session_id": "abc_xyz" }
```

---

### `POST /sessions/:sessionId/stop`
Encerra a sessão e desconecta do WhatsApp.
Salva o estado da sessão (logout) e remove o token do Supabase.

**Response 200**: `{ "status": "offline" }`

---

### `GET /sessions/:sessionId/status`
Retorna o status atual da sessão no WPP Connect.

**Response 200**:
```json
{
  "session_id": "abc_xyz",
  "status": "online",       -- "online" | "offline" | "reconnecting" | "pending"
  "phone_number": "5511999990000",
  "last_seen_at": "2026-06-01T10:00:00Z"
}
```

---

### `POST /sessions/:sessionId/send`
Envia uma mensagem de texto via instância gerenciada.
Chamado por sistemas externos que passam pela camada de API do Next.js.

**Request body**:
```json
{
  "to": "5511999990001@c.us",
  "message": "Texto da mensagem"
}
```

**Response 200**:
```json
{ "message_id": "wpp-msg-id", "status": "sent" }
```

**Response 503**: instância offline
```json
{ "error": "INSTANCE_OFFLINE", "status": "offline" }
```

---

## Webhooks de Saída (WPP Service → Next.js)

O WPP Service envia POSTs para `NEXTJS_WEBHOOK_URL` configurado via env var.
Payload assinado com HMAC-SHA256 usando `WPP_WEBHOOK_SECRET`.

### Evento: `session_status`
```json
{
  "event": "session_status",
  "session_id": "tenant-uuid_instance-uuid",
  "status": "offline",
  "timestamp": "2026-06-01T09:55:00Z",
  "metadata": {
    "reason": "disconnected"   -- motivo quando disponível
  }
}
```

**Status possíveis**: `online` | `offline` | `reconnecting` | `qr_ready` | `qr_expired`

### Evento: `qr_invalidated`
Disparado quando um QR Code é escaneado com sucesso — invalida os demais QR Codes pendentes.
```json
{
  "event": "qr_invalidated",
  "session_id": "tenant-uuid_instance-uuid",
  "reason": "scanned",
  "timestamp": "2026-06-01T10:00:30Z"
}
```

### Evento: `dispatch_result`
Resultado de um envio de mensagem (para log de metadados).
```json
{
  "event": "dispatch_result",
  "session_id": "tenant-uuid_instance-uuid",
  "recipient_count": 1,
  "delivery_status": "success",
  "error_code": null,
  "timestamp": "2026-06-01T10:02:00Z"
}
```

---

## Configuração de Ambiente (Cloud Run)

| Variável | Descrição | Fonte |
|----------|-----------|-------|
| `WPP_SERVICE_SECRET` | Shared secret para autenticar chamadas Next.js → WPP | GCP Secret Manager |
| `WPP_WEBHOOK_SECRET` | Shared secret para assinar webhooks WPP → Next.js | GCP Secret Manager |
| `NEXTJS_WEBHOOK_URL` | URL do endpoint `/api/webhooks/wpp` | Env var Cloud Run |
| `SUPABASE_URL` | URL do projeto Supabase | Env var |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role para salvar session_data | GCP Secret Manager |
| `SESSION_ENCRYPTION_KEY` | Chave para criptografar session_data com pgcrypto | GCP Secret Manager |
