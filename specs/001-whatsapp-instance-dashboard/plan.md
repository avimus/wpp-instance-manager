# Implementation Plan: WhatsApp Instance Control Dashboard

**Branch**: `001-whatsapp-instance-dashboard` | **Date**: 2026-06-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-whatsapp-instance-dashboard/spec.md`

---

## Summary

Plataforma SaaS multi-tenant para gerenciamento de instâncias WhatsApp via WPP Connect.
Admin tem visão centralizada de todas as instâncias (todos os tenants), com status em
tempo real, logs e controle de ciclo de vida. Clientes acessam apenas suas próprias
instâncias, podem ver logs e reconectar via QR Code sem acionar suporte. Alertas
automáticos por email (Resend) e WhatsApp (instância de sistema dedicada) são enviados
quando uma instância fica offline, com debounce de 30 minutos por instância.

**Arquitetura**: Next.js 14 (Vercel) para frontend e API Routes + WPP Connect Server
(Cloud Run, min-instances=1) para gerenciamento de sessões + Supabase para auth,
banco de dados, RLS e realtime. Logs estruturados via pino → Cloud Logging.

---

## Technical Context

**Language/Version**: TypeScript 5.x — Next.js 14 (App Router), Node.js 20 LTS

**Primary Dependencies**:
- `next` 14, `react` 18, `tailwindcss`, `shadcn/ui` (componentes)
- `@supabase/supabase-js`, `@supabase/ssr` (auth + DB + realtime)
- `resend` (email de alertas)
- `pino` (logs estruturados)
- `wppconnect-server` (WPP Connect Service, repositório separado)
- `zod` (validação de schema nas API Routes)

**Storage**:
- Supabase Postgres (dados primários: tenants, instances, logs, alerts)
- `instances.session_data` (token WPP criptografado com pgcrypto)

**Testing**:
- `vitest` + `@testing-library/react` (unit / componentes)
- `playwright` (E2E — fluxos de admin e cliente)
- Supabase local (integration tests contra banco real)

**Target Platform**:
- Frontend + API Routes: Vercel (Serverless Functions + Edge Middleware)
- WPP Connect Service: Google Cloud Run (southamerica-east1, min-instances=1, 1Gi RAM)

**Project Type**: web-service (fullstack) + managed background service (WPP)

**Performance Goals**:
- Dashboard load: <5s para 200 instâncias (SC-001, SC-007)
- Status update (Supabase Realtime): <30s end-to-end (SC-002)
- Log queries 90 dias: <3s com índices Postgres (SC-006)
- Alert delivery end-to-end: <5 min (SC-004)

**Constraints**:
- 99.9% uptime mensal (SC-008) — garantido por Vercel SLA + Cloud Run managed
- Zero cross-tenant data leakage — enforcement via RLS no Postgres (SC-005)
- Conteúdo de mensagens nunca armazenado (FR-016)
- Quota de instâncias por plano enforçada antes de INSERT (FR-017)

**Scale/Scope**:
- 200+ instâncias visíveis simultaneamente no dashboard admin (SC-007)
- 50 instâncias concorrentes por tenant (constitution)
- Multi-tenant: N tenants, cada um com até `plan.max_instances` instâncias

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Evidência |
|-----------|--------|-----------|
| I. Multi-Tenancy by Design | ✅ PASS | RLS em todas as tabelas; `tenant_id` obrigatório em todas as queries; FR-006 |
| II. Reliability First | ✅ PASS | Cloud Run min-instances=1; auto-reconexão WPP; healthchecks; SC-008 |
| III. Observability as a Feature | ✅ PASS | pino → Cloud Logging; Supabase event_logs; Cloud Monitoring alertas; campos obrigatórios: tenant_id, instance_id, timestamp |
| IV. Simplicity Over Premature Abstraction | ✅ PASS | Next.js API Routes (sem framework separado); Supabase elimina múltiplos serviços GCP; ver Complexity Tracking |
| V. Clean, Typed Code | ✅ PASS | TypeScript strict; Supabase generated types; Zod para validação de input; sem `any` em produção |
| VI. Cloud-Native on Google Cloud | ⚠️ PARTIAL | Cloud Run ✅. Supabase substituindo Firebase+Cloud SQL — desvio justificado (ver Complexity Tracking) |

**Re-check Phase 1**: Todos os princípios confirmados após design do data model e contratos.
O desvio do Princípio VI foi registrado e justificado no Complexity Tracking.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-whatsapp-instance-dashboard/
├── plan.md              # Este arquivo
├── spec.md              # Especificação de produto
├── research.md          # Decisões de arquitetura (Phase 0)
├── data-model.md        # Schema Postgres + RLS (Phase 1)
├── quickstart.md        # Guia de setup local e deploy (Phase 1)
├── contracts/
│   ├── rest-api.md      # API Routes do Next.js (Phase 1)
│   └── wpp-service-api.md  # API interna do WPP Service (Phase 1)
└── tasks.md             # Gerado pelo /speckit-tasks (NÃO criado aqui)
```

### Source Code (repository root)

```text
src/                                  # Next.js 14 App (frontend + API)
├── app/
│   ├── (admin)/                      # Layout e páginas do painel admin
│   │   ├── layout.tsx                # Middleware de role: admin only
│   │   ├── dashboard/page.tsx        # Listagem centralizada de instâncias
│   │   ├── tenants/page.tsx          # Gerenciamento de tenants
│   │   ├── tenants/[id]/page.tsx     # Detalhes e edição de tenant
│   │   └── instances/[id]/page.tsx  # Detalhes de instância (admin view)
│   ├── (client)/                     # Layout e páginas do painel cliente
│   │   ├── layout.tsx                # Middleware de role: client only
│   │   ├── dashboard/page.tsx        # Instâncias do próprio tenant
│   │   └── instances/[id]/page.tsx  # Status + logs + QR Code
│   ├── api/
│   │   ├── tenants/route.ts          # GET, POST /api/tenants
│   │   ├── tenants/[id]/route.ts     # GET, PATCH /api/tenants/:id
│   │   ├── instances/route.ts        # GET, POST /api/instances
│   │   ├── instances/[id]/route.ts   # GET, PATCH, DELETE
│   │   ├── instances/[id]/reconnect/route.ts
│   │   ├── instances/[id]/restart/route.ts
│   │   ├── instances/[id]/logs/route.ts
│   │   ├── instances/[id]/notifications/route.ts
│   │   ├── plans/route.ts
│   │   ├── webhooks/wpp/route.ts     # Recebe eventos do WPP Service
│   │   └── health/route.ts
│   ├── login/page.tsx
│   └── layout.tsx
├── components/
│   ├── admin/
│   │   ├── InstancesTable.tsx        # Tabela de instâncias com filtros
│   │   ├── TenantForm.tsx
│   │   └── InstanceActions.tsx       # Restart, Delete buttons
│   ├── client/
│   │   ├── InstanceStatusCard.tsx
│   │   ├── QRCodeModal.tsx           # Modal de reconexão com QR
│   │   └── EventLogTable.tsx
│   └── shared/
│       ├── StatusBadge.tsx           # Online/Offline/Reconnecting badge
│       └── RealtimeProvider.tsx      # Supabase Realtime subscription wrapper
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client (anon key)
│   │   ├── server.ts                 # Server client (service role)
│   │   └── types.ts                  # Generated types (supabase gen types)
│   ├── wpp/
│   │   └── client.ts                 # HTTP client para o WPP Service
│   ├── notifications/
│   │   ├── email.ts                  # Resend integration
│   │   └── whatsapp.ts               # Alerta via instância de sistema
│   ├── alerts/
│   │   └── debounce.ts               # Lógica de janela de 30min
│   └── logger.ts                     # pino configurado para Cloud Logging
└── middleware.ts                      # Auth check + role routing

wpp-service/                           # WPP Connect Manager (Cloud Run)
├── src/
│   ├── sessions/
│   │   ├── manager.ts                # Cria/retoma/encerra sessões WPP
│   │   └── persistence.ts            # Salva/carrega session_data do Supabase
│   ├── webhooks/
│   │   └── sender.ts                 # Envia eventos para o Next.js
│   └── server.ts                     # Express HTTP server (endpoints /sessions/*)
├── Dockerfile
└── package.json

supabase/
├── migrations/
│   ├── 001_create_plans.sql
│   ├── 002_create_tenants.sql
│   ├── 003_create_profiles.sql
│   ├── 004_create_instances.sql
│   ├── 005_create_notification_configs.sql
│   ├── 006_create_event_logs.sql
│   ├── 007_create_dispatch_events.sql
│   ├── 008_create_alert_windows.sql
│   ├── 009_create_alert_deliveries.sql
│   ├── 010_rls_policies.sql
│   └── 011_realtime_enable.sql
└── seed.sql                           # plans + admin user + tenant de teste
```

**Structure Decision**: Web application com dois repositórios lógicos no mesmo
monorepo (`src/` para Next.js, `wpp-service/` para o serviço Cloud Run).
A separação é necessária porque o WPP Connect não pode rodar em Serverless Functions
do Vercel (requer processo persistente). O `supabase/` armazena migrations versionadas.

---

## Complexity Tracking

| Violação | Por que necessária | Alternativa mais simples rejeitada por |
|----------|--------------------|----------------------------------------|
| Supabase (não GCP) substituindo Firebase Auth + Cloud SQL + Pub/Sub | Auth + Postgres + Realtime + RLS em um serviço gerenciado reduz drasticamente a complexidade de integração | Firebase Auth + Cloud SQL requer configuração manual de RLS via middleware, aumentando superfície de bugs de segurança de tenant isolation (viola Princípio I mais gravemente do que viola o Princípio VI) |
| WPP Service como serviço separado (Cloud Run) | WPP Connect requer processo Node.js de longa duração com sessões WebSocket persistentes — incompatível com Vercel Serverless | Rodar WPP Connect dentro do Next.js: impossível em serverless; Cloud Functions GCP: mesmo problema de cold starts e timeout |
| Instância WPP dedicada para alertas | Alertas WhatsApp não podem vir da instância que está offline | Usar apenas email: válido, mas reduz o valor do produto conforme spec (FR-012 exige suporte a WhatsApp) |
