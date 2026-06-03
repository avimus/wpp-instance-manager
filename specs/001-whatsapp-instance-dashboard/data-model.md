# Data Model: WhatsApp Instance Control Dashboard

**Branch**: `001-whatsapp-instance-dashboard` | **Date**: 2026-06-01

Todas as tabelas vivem no Supabase Postgres (schema `public`).
Row Level Security (RLS) habilitado em todas as tabelas.

---

## Entidades e Schema

### `plans`

Define os planos de assinatura disponíveis. Populada pelo admin via seed ou painel.

```sql
CREATE TABLE plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,          -- 'basic' | 'pro' | 'enterprise'
  max_instances int NOT NULL,                 -- -1 = ilimitado (enterprise)
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

**Valores padrão de seed**:
| name | max_instances |
|------|--------------|
| basic | 1 |
| pro | 5 |
| enterprise | -1 (ilimitado) |

---

### `tenants`

Organização (conta de cliente). Um tenant agrupa instâncias e usuários clientes.

```sql
CREATE TABLE tenants (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  status              text NOT NULL DEFAULT 'active'   -- 'active' | 'suspended'
                      CHECK (status IN ('active', 'suspended')),
  plan_id             uuid NOT NULL REFERENCES plans(id),
  primary_contact_email text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
```

**RLS**:
- Admin: SELECT, INSERT, UPDATE, DELETE sem restrição.
- Client: SELECT WHERE `id = (auth.jwt() ->> 'tenant_id')::uuid`.

---

### `profiles`

Extensão de `auth.users` (criada automaticamente pelo Supabase Auth trigger).
Associa cada usuário a um tenant e define seu role.

```sql
CREATE TABLE profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  uuid REFERENCES tenants(id) ON DELETE SET NULL,  -- NULL para admins
  role       text NOT NULL CHECK (role IN ('admin', 'client')),
  full_name  text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**RLS**:
- Admin: SELECT todos os profiles; UPDATE/DELETE sem restrição.
- Client: SELECT/UPDATE apenas próprio profile (`id = auth.uid()`).

**Custom JWT Claim** (via Supabase Auth Hook):
```json
{
  "app_metadata": {
    "role": "client",
    "tenant_id": "<uuid>"
  }
}
```

---

### `instances`

Representa uma conexão WhatsApp gerenciada pelo WPP Connect.

```sql
CREATE TABLE instances (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number   text NOT NULL,
  display_name   text NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'online', 'offline', 'reconnecting')),
  session_data   text,                           -- token WPP Connect (criptografado via pgcrypto)
  last_seen_at   timestamptz,
  wpp_session_id text,                           -- nome da sessão no WPP Connect Service
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, phone_number)               -- número único por tenant
);

CREATE INDEX idx_instances_tenant_id ON instances(tenant_id);
CREATE INDEX idx_instances_status    ON instances(status);
```

**Estados e transições**:
```
pending ──► reconnecting ──► online
   │                           │
   └──────── offline ◄─────────┘
                 │
                 └──► reconnecting ──► online
```

**RLS**:
- Admin: acesso irrestrito a todas as instâncias.
- Client: SELECT/UPDATE onde `tenant_id = (auth.jwt() ->> 'tenant_id')::uuid`.
  Client não pode INSERT ou DELETE (gerenciado apenas pelo admin).

---

### `instance_notification_configs`

Destinatários de alerta configurados por instância.

```sql
CREATE TABLE instance_notification_configs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  channel     text NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  recipient   text NOT NULL,    -- email address ou número WhatsApp (ex: '5511999990000')
  is_global   boolean NOT NULL DEFAULT false,  -- true = destinatário admin global
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instance_id, channel, recipient)
);
```

**RLS**:
- Admin: acesso irrestrito.
- Client: SELECT apenas onde instance_id pertence ao seu tenant_id.

---

### `event_logs`

Log auditável de eventos de conexão e ciclo de vida das instâncias.
**Nunca contém conteúdo de mensagens** (FR-016).

```sql
CREATE TABLE event_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type  text NOT NULL,
                -- 'status_change' | 'qr_generated' | 'qr_scanned' | 'qr_expired'
                -- 'instance_created' | 'instance_deleted' | 'instance_restarted'
                -- 'alert_sent' | 'dispatch_attempt'
  severity    text NOT NULL DEFAULT 'info'
              CHECK (severity IN ('info', 'warning', 'error')),
  description text NOT NULL,
  metadata    jsonb,           -- dados extras sem PII (ex: {"previous_status": "online"})
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_logs_instance_id  ON event_logs(instance_id);
CREATE INDEX idx_event_logs_tenant_id    ON event_logs(tenant_id);
CREATE INDEX idx_event_logs_created_at   ON event_logs(created_at);
CREATE INDEX idx_event_logs_event_type   ON event_logs(event_type);
```

**Retenção**: Linha com `created_at < now() - interval '90 days'` pode ser arquivada
via pg_cron job semanal.

**RLS**:
- Admin: SELECT todos os event_logs.
- Client: SELECT onde `tenant_id = (auth.jwt() ->> 'tenant_id')::uuid`.

---

### `dispatch_events`

Registro de disparos de mensagens iniciados por sistemas externos via WPP Connect.
**Sem conteúdo de mensagem ou números individuais de destinatário** (FR-016).

```sql
CREATE TABLE dispatch_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id      uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipient_count  int NOT NULL DEFAULT 0,
  delivery_status  text NOT NULL
                   CHECK (delivery_status IN ('success', 'partial', 'failed', 'rejected')),
  error_code       text,           -- código de erro WPP Connect se houver
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dispatch_events_instance_id ON dispatch_events(instance_id);
CREATE INDEX idx_dispatch_events_tenant_id   ON dispatch_events(tenant_id);
CREATE INDEX idx_dispatch_events_created_at  ON dispatch_events(created_at);
```

**RLS**:
- Admin: SELECT todos.
- Client: SELECT onde `tenant_id = (auth.jwt() ->> 'tenant_id')::uuid`.

---

### `alert_windows`

Controla o debounce de 30 minutos por instância para alertas de "offline" (FR-010).

```sql
CREATE TABLE alert_windows (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id  uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL DEFAULT now(),
  window_end   timestamptz NOT NULL DEFAULT now() + interval '30 minutes',
  alert_sent   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instance_id, window_start)    -- uma janela ativa por instância por vez
);

CREATE INDEX idx_alert_windows_instance_id ON alert_windows(instance_id);
CREATE INDEX idx_alert_windows_window_end  ON alert_windows(window_end);
```

---

### `alert_deliveries`

Registro de cada tentativa de entrega de notificação de alerta.

```sql
CREATE TABLE alert_deliveries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  window_id    uuid NOT NULL REFERENCES alert_windows(id) ON DELETE CASCADE,
  instance_id  uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  channel      text NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  recipient    text NOT NULL,
  status       text NOT NULL CHECK (status IN ('sent', 'failed', 'bounced')),
  trigger_event text NOT NULL CHECK (trigger_event IN ('offline', 'recovered')),
  error        text,
  sent_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_alert_deliveries_window_id   ON alert_deliveries(window_id);
CREATE INDEX idx_alert_deliveries_instance_id ON alert_deliveries(instance_id);
```

---

## Relacionamentos

```
plans ──< tenants ──< instances ──< event_logs
                  │             ├── dispatch_events
                  │             ├── instance_notification_configs
                  │             └── alert_windows ──< alert_deliveries
                  └──< profiles (users)
```

---

## Supabase Realtime

Canal subscrito pelo frontend para atualizações em tempo real:

```typescript
// Subscription por tenant (client) ou global (admin)
supabase
  .channel('instances-status')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'instances',
    filter: `tenant_id=eq.${tenantId}`,  // omitir para admin
  }, handleStatusChange)
  .subscribe()
```

Realtime habilitado nas tabelas: `instances` (UPDATE de status).

---

## Criptografia

- `instances.session_data`: criptografado com `pgp_sym_encrypt` (pgcrypto) usando chave
  armazenada no GCP Secret Manager. Descriptografado apenas dentro do WPP Service
  ao restaurar sessão.
- Nenhum outro campo PII é armazenado além dos necessários para operação
  (`phone_number` é necessário para identificar a instância; não é conteúdo de mensagem).
