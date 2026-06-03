---
description: "Task list for WhatsApp Instance Control Dashboard"
---

# Tasks: WhatsApp Instance Control Dashboard

**Input**: Design documents from `specs/001-whatsapp-instance-dashboard/`

**Prerequisites**: plan.md âœ… | spec.md âœ… | data-model.md âœ… | contracts/ âœ… | research.md âœ…

**Tests**: NÃ£o incluÃ­dos (nÃ£o solicitados na especificaÃ§Ã£o). Adicionar `/speckit-tasks` com
instruÃ§Ã£o de TDD se desejado.

**Organization**: Tasks agrupadas por user story. Cada story Ã© independentemente implementÃ¡vel
e testÃ¡vel apÃ³s a Phase 2 (Foundational) estar completa.

---

## Format: `- [ ] [ID] [P?] [Story?] Description â€” file/path`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependÃªncias incompletas)
- **[USX]**: User story a que a task pertence (US1â€“US5)
- Caminhos relativos Ã  raiz do repositÃ³rio

---

## Phase 1: Setup

**Purpose**: Estrutura inicial do monorepo, tooling e configuraÃ§Ã£o base.

- [x] T001 Criar estrutura de diretÃ³rios do monorepo: `src/`, `wpp-service/`, `supabase/migrations/`
- [x] T002 Inicializar projeto Next.js 14 com App Router e TypeScript strict em `src/`
- [x] T003 [P] Inicializar projeto Node.js + TypeScript strict para o WPP Service em `wpp-service/`
- [x] T004 [P] Inicializar Supabase CLI e linkar ao projeto Supabase (`supabase/config.toml`)
- [x] T005 Configurar Tailwind CSS + shadcn/ui no projeto Next.js (`src/app/globals.css`, `tailwind.config.ts`, `components.json`)
- [x] T006 [P] Configurar ESLint + TypeScript strict no Next.js (`tsconfig.json`, `.eslintrc.json`)
- [x] T007 [P] Configurar ESLint + TypeScript strict no WPP Service (`wpp-service/tsconfig.json`)
- [x] T008 Criar `.env.example` com todas as variÃ¡veis documentadas em `contracts/wpp-service-api.md`

**Checkpoint**: Monorepo inicializado, `pnpm dev` roda o Next.js sem erros.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura compartilhada que TODAS as user stories dependem.

**âš ï¸ CRÃTICO**: Nenhuma user story pode ser implementada antes desta phase estar completa.

### Banco de dados (Supabase Migrations)

- [x] T009 [P] Criar migration `supabase/migrations/001_create_plans.sql` â€” tabela `plans` conforme `data-model.md`
- [x] T010 [P] Criar migration `supabase/migrations/002_create_tenants.sql` â€” tabela `tenants` com FK para `plans`
- [x] T011 [P] Criar migration `supabase/migrations/003_create_profiles.sql` â€” tabela `profiles` com FK para `auth.users` e `tenants`
- [x] T012 Criar migration `supabase/migrations/004_create_instances.sql` â€” tabela `instances` com FK para `tenants`, estados e Ã­ndices (depende de T010)
- [x] T013 [P] Criar migration `supabase/migrations/005_create_notification_configs.sql` â€” tabela `instance_notification_configs`
- [x] T014 [P] Criar migration `supabase/migrations/006_create_event_logs.sql` â€” tabela `event_logs` com Ã­ndices compostos
- [x] T015 [P] Criar migration `supabase/migrations/007_create_dispatch_events.sql` â€” tabela `dispatch_events`
- [x] T016 Criar migration `supabase/migrations/008_create_alert_windows.sql` â€” tabela `alert_windows` com constraint UNIQUE (depende de T012)
- [x] T017 Criar migration `supabase/migrations/009_create_alert_deliveries.sql` â€” tabela `alert_deliveries` com FK para `alert_windows`
- [x] T018 Criar migration `supabase/migrations/010_rls_policies.sql` â€” polÃ­ticas RLS para todas as tabelas conforme `data-model.md` (depende de T009â€“T017)
- [x] T019 Criar migration `supabase/migrations/011_realtime_enable.sql` â€” habilitar Supabase Realtime na tabela `instances`
- [x] T020 Criar `supabase/seed.sql` â€” planos Basic/Pro/Enterprise + usuÃ¡rio admin de teste + tenant "Acme Corp" de teste

### Auth e Infraestrutura Next.js

- [x] T021 Implementar Supabase Auth Hook para injetar `app_metadata.role` e `app_metadata.tenant_id` no JWT â€” `supabase/functions/auth-hook/index.ts`
- [x] T022 Configurar clientes Supabase: browser client em `src/lib/supabase/client.ts` e server client em `src/lib/supabase/server.ts`
- [x] T023 Gerar tipos TypeScript do Supabase (`supabase gen types typescript`) em `src/lib/supabase/types.ts`
- [x] T024 Implementar middleware de autenticaÃ§Ã£o + roteamento por role em `src/middleware.ts` (redireciona `admin` â†’ `/(admin)/dashboard`, `client` â†’ `/(client)/dashboard`, nÃ£o autenticado â†’ `/login`)
- [x] T025 Criar pÃ¡gina de login em `src/app/login/page.tsx` com Supabase Auth UI ou formulÃ¡rio email/senha
- [x] T026 [P] Configurar `pino` com campos obrigatÃ³rios da constituiÃ§Ã£o (`tenant_id`, `instance_id`, `trace_id`, `level`, `timestamp`, `message`) em `src/lib/logger.ts`
- [x] T027 [P] Criar utilitÃ¡rio de resposta de erro padronizado conforme `contracts/rest-api.md` em `src/lib/api-response.ts`
- [x] T028 [P] Criar componente compartilhado `StatusBadge` (Online/Offline/Reconnecting/Pending) em `src/components/shared/StatusBadge.tsx`
- [x] T029 Criar `RealtimeProvider` â€” wrapper de subscription Supabase Realtime em `src/components/shared/RealtimeProvider.tsx`
- [x] T030 Criar endpoint de health check em `src/app/api/health/route.ts`

### WPP Service â€” Base

- [x] T031 Implementar servidor Express base com middleware de autenticaÃ§Ã£o (`Authorization: Bearer`) em `wpp-service/src/server.ts`
- [x] T032 Implementar `SessionPersistence` â€” salva/carrega `session_data` criptografado do Supabase em `wpp-service/src/sessions/persistence.ts`
- [x] T033 Implementar `WebhookSender` â€” envia eventos para o Next.js com HMAC-SHA256 em `wpp-service/src/webhooks/sender.ts`
- [x] T034 Criar health check em `wpp-service/src/server.ts`: `GET /health`
- [x] T035 Criar `Dockerfile` para o WPP Service com Node.js 20, instalaÃ§Ã£o de dependÃªncias e exposiÃ§Ã£o de porta em `wpp-service/Dockerfile`

**Checkpoint**: Foundation completa â€” `supabase start && supabase db push` roda sem erros;
Next.js sobe com middleware de auth; WPP Service inicia em `:3001`.

---

## Phase 3: User Story 1 â€” Admin: Centralized Instance Overview (Priority: P1) ðŸŽ¯ MVP

**Goal**: Admin vÃª todas as instÃ¢ncias de todos os tenants com status em tempo real.

**Independent Test**: Login como admin â†’ dashboard carrega com instÃ¢ncias de â‰¥2 tenants â†’
alterar status de uma instÃ¢ncia no Supabase â†’ status reflete no dashboard em â‰¤30s sem reload.

### Implementation for User Story 1

- [x] T036 [P] [US1] Implementar `GET /api/instances` (admin: sem filtro de tenant; client: filtrado por tenant_id do JWT) em `src/app/api/instances/route.ts` â€” suporta query params `?tenant_id`, `?status`, `?search`
- [x] T037 [P] [US1] Implementar `GET /api/tenants` em `src/app/api/tenants/route.ts` (admin only â€” lista todos os tenants para filtro)
- [x] T038 [P] [US1] Implementar `GET /api/plans` em `src/app/api/plans/route.ts` (admin only)
- [x] T039 [US1] Criar componente `InstancesTable` com colunas: status, tenant, phone_number, display_name, last_seen_at, aÃ§Ãµes â€” em `src/components/admin/InstancesTable.tsx` (depende de T036)
- [x] T040 [US1] Integrar Supabase Realtime no `InstancesTable` via `RealtimeProvider` para atualizaÃ§Ã£o de status em â‰¤30s â€” `src/components/admin/InstancesTable.tsx` (depende de T029, T039)
- [x] T041 [US1] Criar layout do painel admin com navegaÃ§Ã£o lateral em `src/app/(admin)/layout.tsx`
- [x] T042 [US1] Criar pÃ¡gina do dashboard admin com filtros (tenant, status, search) usando `InstancesTable` â€” `src/app/(admin)/dashboard/page.tsx` (depende de T037, T039, T040, T041)

**Checkpoint**: Admin faz login, vÃª todas as instÃ¢ncias com status em tempo real. US1 testÃ¡vel independentemente.

---

## Phase 4: User Story 2 â€” Admin: Instance Lifecycle Management (Priority: P1)

**Goal**: Admin cria, reinicia e deleta instÃ¢ncias diretamente do dashboard.

**Independent Test**: Login como admin â†’ criar nova instÃ¢ncia para "Acme Corp" â†’ instÃ¢ncia aparece
no dashboard â†’ reiniciar instÃ¢ncia â†’ status muda para Reconnecting â†’ deletar instÃ¢ncia â†’ some da lista.

### Implementation for User Story 2

- [x] T043 [P] [US2] Implementar `POST /api/tenants` em `src/app/api/tenants/route.ts` (admin only â€” criar tenant com validaÃ§Ã£o de plano)
- [x] T044 [P] [US2] Implementar `GET /api/tenants/:id` e `PATCH /api/tenants/:id` em `src/app/api/tenants/[id]/route.ts` (admin only â€” ediÃ§Ã£o de nome, status e plano)
- [x] T045 [US2] Implementar `POST /api/instances` em `src/app/api/instances/route.ts` com verificaÃ§Ã£o de quota do plano (FR-017) e chamada ao WPP Service `POST /sessions/:id/start` â€” `src/app/api/instances/route.ts` (depende de T031, T036)
- [x] T046 [US2] Implementar `DELETE /api/instances/:id` com encerramento de sessÃ£o no WPP Service em `src/app/api/instances/[id]/route.ts`
- [x] T047 [US2] Implementar `POST /api/instances/:id/restart` â€” encerra e reinicia sessÃ£o no WPP Service, registra em `event_logs` em `src/app/api/instances/[id]/restart/route.ts`
- [x] T048 [US2] Implementar `SessionManager` no WPP Service â€” `wpp-service/src/sessions/manager.ts` com mÃ©todos `start(sessionId)`, `stop(sessionId)`, `getStatus(sessionId)` usando wppconnect-server
- [x] T049 [US2] Implementar endpoints `POST /sessions/:id/start` e `POST /sessions/:id/stop` no WPP Service em `wpp-service/src/server.ts` (depende de T048)
- [x] T050 [US2] Criar componente `TenantForm` (criar e editar tenant, seleÃ§Ã£o de plano) em `src/components/admin/TenantForm.tsx`
- [x] T051 [US2] Criar componente `InstanceActions` com botÃµes Restart e Delete (com modal de confirmaÃ§Ã£o) em `src/components/admin/InstanceActions.tsx`
- [x] T052 [US2] Criar pÃ¡gina de gerenciamento de tenants em `src/app/(admin)/tenants/page.tsx` com lista e botÃ£o de criaÃ§Ã£o
- [x] T053 [US2] Criar pÃ¡gina de detalhes do tenant (instÃ¢ncias, plano, ediÃ§Ã£o) em `src/app/(admin)/tenants/[id]/page.tsx`
- [x] T054 [US2] Adicionar modal "Nova InstÃ¢ncia" no dashboard admin com form (tenant, phone_number, display_name) â€” `src/app/(admin)/dashboard/page.tsx` (depende de T042, T045)

**Checkpoint**: Admin cria instÃ¢ncias, reinicia e deleta. US2 testÃ¡vel independentemente apÃ³s US1.

---

## Phase 5: User Story 3 â€” Client: Self-Service Status & Log Panel (Priority: P2)

**Goal**: Cliente vÃª apenas suas instÃ¢ncias com status e histÃ³rico de logs de 90 dias.

**Independent Test**: Login como client "Acme Corp" â†’ vÃª apenas instÃ¢ncias da Acme â†’ log exibe
30 dias de eventos â†’ tentar URL de instÃ¢ncia de outro tenant â†’ 403.

### Implementation for User Story 3

- [x] T055 [P] [US3] Implementar `GET /api/instances/:id/logs` com paginaÃ§Ã£o e filtros (`from`, `to`, `type`, `severity`) em `src/app/api/instances/[id]/logs/route.ts` (RLS garante acesso apenas ao prÃ³prio tenant)
- [x] T056 [P] [US3] Implementar `GET /api/instances/:id` em `src/app/api/instances/[id]/route.ts` â€” retorna detalhes + notification_configs + contagens recentes (admin: qualquer; client: somente prÃ³pria â€” 403 caso contrÃ¡rio)
- [x] T057 [US3] Criar componente `EventLogTable` com paginaÃ§Ã£o, filtro por data e tipo em `src/components/client/EventLogTable.tsx`
- [x] T058 [US3] Criar componente `InstanceStatusCard` (status badge, last_seen_at, phone_number) em `src/components/client/InstanceStatusCard.tsx`
- [x] T059 [US3] Criar layout do painel cliente em `src/app/(client)/layout.tsx`
- [x] T060 [US3] Criar pÃ¡gina do dashboard cliente (lista de instÃ¢ncias do tenant) em `src/app/(client)/dashboard/page.tsx` (depende de T036 â€” reutiliza `GET /api/instances` com JWT client)
- [x] T061 [US3] Criar pÃ¡gina de detalhes de instÃ¢ncia do cliente com status + log de 90 dias em `src/app/(client)/instances/[id]/page.tsx` (depende de T055, T056, T057, T058)

**Checkpoint**: Cliente faz login, vÃª apenas suas instÃ¢ncias e logs. Acesso cross-tenant retorna 403.

---

## Phase 6: User Story 4 â€” Client: QR Code Self-Reconnection (Priority: P2)

**Goal**: Cliente reconecta instÃ¢ncia Offline via QR Code sem acionar suporte.

**Independent Test**: InstÃ¢ncia em status Offline â†’ client clica "Reconectar" â†’ QR Code aparece â†’
scan com WhatsApp â†’ status muda para Online â‰¤60s â†’ segundo QR Code simultÃ¢neo Ã© invalidado.

### Implementation for User Story 4

- [x] T062 [P] [US4] Implementar `POST /api/instances/:id/reconnect` â€” chama WPP Service `POST /sessions/:id/start`, retorna QR Code + expires_at (admin: qualquer instÃ¢ncia; client: somente prÃ³pria) em `src/app/api/instances/[id]/reconnect/route.ts`
- [x] T063 [US4] Implementar endpoint `GET /sessions/:id/status` no WPP Service em `wpp-service/src/server.ts` (depende de T048)
- [x] T064 [US4] Implementar `POST /api/webhooks/wpp` â€” recebe eventos do WPP Service, valida HMAC-SHA256, atualiza `instances.status`, insere em `event_logs`, aciona lÃ³gica de alerta se Offline em `src/app/api/webhooks/wpp/route.ts` (depende de T018, T026)
- [x] T065 [US4] Enviar eventos de QR Code do WPP Service para Next.js via `WebhookSender` â€” eventos `qr_ready`, `qr_expired`, `qr_invalidated`, `session_status` em `wpp-service/src/webhooks/sender.ts` (depende de T033, T048)
- [x] T066 [US4] Criar componente `QRCodeModal` â€” exibe QR Code com countdown, fecha automaticamente ao receber evento `qr_invalidated` via Realtime em `src/components/client/QRCodeModal.tsx` (depende de T029)
- [x] T067 [US4] Integrar botÃ£o "Reconectar" e `QRCodeModal` na pÃ¡gina de detalhes do cliente em `src/app/(client)/instances/[id]/page.tsx` (depende de T061, T062, T066)
- [x] T068 [US4] Adicionar botÃ£o "Reconectar" na pÃ¡gina de detalhes de instÃ¢ncia do admin em `src/app/(admin)/instances/[id]/page.tsx`

**Checkpoint**: Cliente reconecta via QR sem suporte. QR simultÃ¢neo de admin Ã© invalidado ao scan.

---

## Phase 7: User Story 5 â€” Automated Offline Alert Notifications (Priority: P3)

**Goal**: Admin e cliente sÃ£o notificados automaticamente quando instÃ¢ncia fica offline.
Debounce de 30 min por instÃ¢ncia. NotificaÃ§Ã£o de recuperaÃ§Ã£o apÃ³s 2 min estÃ¡vel.

**Independent Test**: Simular instÃ¢ncia Offline â†’ â‰¤5min: email e/ou WhatsApp chegam para
destinatÃ¡rios configurados â†’ simular Online â†’ notificaÃ§Ã£o de recuperaÃ§Ã£o chega aos mesmos.

### Implementation for User Story 5

- [x] T069 [P] [US5] Implementar lÃ³gica de debounce de alertas â€” verifica/cria `alert_windows`, retorna `shouldAlert: boolean` em `src/lib/alerts/debounce.ts` (usa tabelas `alert_windows` e `alert_deliveries`)
- [x] T070 [P] [US5] Implementar integraÃ§Ã£o com Resend para envio de email de alerta (template de offline e recuperaÃ§Ã£o) em `src/lib/notifications/email.ts`
- [x] T071 [P] [US5] Implementar envio de alerta via WhatsApp usando a instÃ¢ncia de sistema dedicada â€” chama WPP Service `POST /sessions/sistema-alertas/send` em `src/lib/notifications/whatsapp.ts`
- [x] T072 [US5] Implementar serviÃ§o de dispatch de alertas â€” orquestra `debounce.ts`, `email.ts` e `whatsapp.ts`, registra entrega em `alert_deliveries` em `src/lib/alerts/dispatch.ts` (depende de T069, T070, T071)
- [x] T073 [US5] Integrar `dispatch.ts` no webhook handler â€” quando `instances.status` muda para `offline`, aciona `dispatch.ts` em `src/app/api/webhooks/wpp/route.ts` (depende de T064, T072)
- [x] T074 [US5] Implementar verificaÃ§Ã£o de recuperaÃ§Ã£o â€” apÃ³s instÃ¢ncia voltar para `online`, aguardar 2 min (Cloud Tasks delayed job ou Supabase Edge Function pg_cron) e enviar notificaÃ§Ã£o de recuperaÃ§Ã£o em `src/lib/alerts/recovery.ts`
- [x] T075 [US5] Implementar `PUT /api/instances/:id/notifications` â€” substitui configuraÃ§Ã£o de destinatÃ¡rios (admin only) em `src/app/api/instances/[id]/notifications/route.ts`
- [x] T076 [US5] Adicionar UI de configuraÃ§Ã£o de notificaÃ§Ãµes na pÃ¡gina de detalhes de instÃ¢ncia admin em `src/app/(admin)/instances/[id]/page.tsx`

**Checkpoint**: NotificaÃ§Ãµes chegam em â‰¤5min apÃ³s Offline. Ciclos rÃ¡pidos nÃ£o geram flood (debounce 30min).

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Hardening, UX e infraestrutura de deploy.

- [x] T077 [P] Adicionar rate limiting nas API Routes pÃºblicas (`/api/webhooks/wpp`, `/api/instances/:id/reconnect`) em `src/middleware.ts` ou via Vercel Edge Config
- [x] T078 [P] Configurar variÃ¡veis de ambiente e secrets no Cloud Run via GCP Secret Manager (documentar em `wpp-service/README.md`)
- [x] T079 Criar pipeline CI/CD (GitHub Actions) com etapas: type-check, lint, `supabase db push`, deploy Vercel + deploy Cloud Run em `.github/workflows/deploy.yml`
- [x] T080 [P] Implementar pÃ¡gina de detalhes de instÃ¢ncia admin com todos os dados (status, logs, notification_configs, dispatch stats) em `src/app/(admin)/instances/[id]/page.tsx`
- [x] T081 [P] Adicionar job de retenÃ§Ã£o de logs â€” pg_cron para arquivar `event_logs` com `created_at < now() - 90 days` em `supabase/migrations/012_log_retention_job.sql`
- [x] T082 Validar isolamento de tenant: checar manualmente que `GET /api/instances` com JWT de client retorna somente instÃ¢ncias do prÃ³prio tenant (cobrir SC-005)
- [x] T083 [P] Configurar Cloud Monitoring alertas para: WPP Service `instances_offline_count > 0`, error rate > 1% na API, uptime < 99.9% em `docs/monitoring-setup.md`
- [x] T084 Executar validaÃ§Ã£o do `quickstart.md` â€” seguir todos os passos do arquivo e corrigir inconsistÃªncias

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependÃªncias â€” iniciar imediatamente
- **Foundational (Phase 2)**: Depende da Phase 1 â€” **BLOQUEIA todas as user stories**
- **US1 (Phase 3)**: Depende da Phase 2 â€” pode iniciar assim que foundation estiver pronta
- **US2 (Phase 4)**: Depende da Phase 2 â€” pode rodar em paralelo com US1
- **US3 (Phase 5)**: Depende da Phase 2 â€” pode rodar em paralelo com US1 e US2
- **US4 (Phase 6)**: Depende de US3 (pÃ¡gina de detalhes do cliente) + Phase 2
- **US5 (Phase 7)**: Depende de T064 (webhook handler) â€” pode iniciar apÃ³s US4
- **Polish (Phase 8)**: Depende de todas as user stories desejadas

### User Story Dependencies

- **US1 (P1)**: Sem dependÃªncia de outras stories â€” inicia apÃ³s Phase 2
- **US2 (P1)**: Sem dependÃªncia de outras stories â€” inicia apÃ³s Phase 2
- **US3 (P2)**: Sem dependÃªncia de outras stories â€” inicia apÃ³s Phase 2
- **US4 (P2)**: Depende de US3 (pÃ¡gina de instÃ¢ncia do cliente onde QR Code Ã© exibido)
- **US5 (P3)**: Depende de US4 (webhook handler de status, T064)

### Within Each User Story

- Endpoints de API ANTES de componentes de UI
- Endpoints WPP Service ANTES de API Routes que os chamam
- Migrations ANTES de qualquer cÃ³digo de aplicaÃ§Ã£o

---

## Parallel Opportunities

### Phase 2 â€” Foundational (execute juntos)

```
T009â€“T017 (migrations individuais) â†’ todos em paralelo
T021, T022, T023, T026, T027, T028 â†’ em paralelo
T031, T033, T034, T035 â†’ em paralelo
```

### US1 e US2 em paralelo (times diferentes)

```
Dev A: T036, T037, T038 â†’ T039 â†’ T040 â†’ T042  (US1)
Dev B: T043, T044 â†’ T045 â†’ T048 â†’ T049         (US2 base)
```

### US3 â€” tarefas de API em paralelo

```
T055, T056 â†’ em paralelo â†’ T057, T058 â†’ T060 â†’ T061
```

### US5 â€” componentes de notificaÃ§Ã£o em paralelo

```
T069, T070, T071 â†’ em paralelo â†’ T072 â†’ T073
```

---

## Implementation Strategy

### MVP First (US1 + US2 apenas â€” Admin funcional)

1. Completar Phase 1 (Setup)
2. Completar Phase 2 (Foundational) â€” **CRÃTICO, bloqueia tudo**
3. Completar Phase 3 (US1 â€” Admin dashboard read-only)
4. **PARAR E VALIDAR**: Admin consegue ver todas as instÃ¢ncias com status em tempo real?
5. Completar Phase 4 (US2 â€” Admin lifecycle management)
6. **PARAR E VALIDAR**: Admin consegue criar, reiniciar e deletar instÃ¢ncias?
7. Demo com a equipe â€” coletar feedback antes de avanÃ§ar para o painel do cliente

### Entrega Incremental

1. Setup + Foundational â†’ Base pronta
2. US1 â†’ Admin monitoring (MVP interno)
3. US2 â†’ Admin management completo
4. US3 â†’ Cliente acessa painel
5. US4 â†’ Cliente reconecta sem suporte (reduz tickets)
6. US5 â†’ Alertas proativos (confiabilidade total)
7. Polish â†’ ProduÃ§Ã£o hardened

### EstratÃ©gia com Time Paralelo

Com 2+ desenvolvedores apÃ³s Phase 2:

- Dev A: US1 (admin dashboard) + US2 (lifecycle)
- Dev B: US3 (client panel) + US4 (QR code)
- Dev A ou B: US5 (alerts) + Polish

---

## Notes

- `[P]` = arquivos distintos, sem dependÃªncias incompletas â€” pode rodar em paralelo
- `[USX]` = rastreabilidade para a user story correspondente
- Cada user story Ã© independentemente completÃ¡vel apÃ³s a Phase 2
- RLS no Supabase garante isolamento de tenant sem cÃ³digo extra nas API Routes
- Commit apÃ³s cada task ou grupo lÃ³gico
- Parar em cada checkpoint para validar a story independentemente
- WPP Service precisa de `--min-instances=1` em Cloud Run em produÃ§Ã£o (nÃ£o esquecer no deploy)

