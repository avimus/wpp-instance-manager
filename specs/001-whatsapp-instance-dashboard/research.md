# Research: WhatsApp Instance Control Dashboard

**Branch**: `001-whatsapp-instance-dashboard` | **Date**: 2026-06-01

---

## 1. WPP Connect Deployment: Cloud Run vs GCE

**Decision**: Google Cloud Run com `--min-instances=1`

**Rationale**: WPP Connect Server (o wrapper HTTP sobre a lib wppconnect) é um processo Node.js
de longa duração que mantém sessões WebSocket com os servidores do WhatsApp. Cloud Run suporta
WebSocket e conexões de longa duração via HTTP/2. Com `min-instances=1`, eliminamos cold starts
que interromperiam as sessões ativas. Cloud Run gerenciado é significativamente mais simples de
operar do que uma VM GCE (sem gerenciamento de SO, patching ou provisionamento manual).

**Persistência de sessão**: As sessões WPP Connect (tokens de autenticação WhatsApp) são arquivos
locais. No Cloud Run, montamos um Cloud Storage FUSE bucket como volume para persistir as pastas
de sessão entre re-deployments e reinicializações de container.

**Alternativas consideradas**:
- GCE (VM): Mais controle, mas exige gerenciamento de SO, patching, uptime monitoring manual.
  Rejeitado por violar o Princípio IV (Simplicidade) e o Princípio VI (Cloud-Native managed).
- Cloud Run sem min-instances: Cold starts de 10–30s interromperiam sessões WhatsApp ativas.
  Rejeitado por violar o Princípio II (Reliability First).
- GKE: Overkill para o volume atual. Viola o Princípio IV.

---

## 2. Provedor de Email para Alertas: Resend vs SendGrid

**Decision**: Resend

**Rationale**: Resend tem API mais simples (REST + SDK TypeScript com tipos nativos), pricing
mais previsível para estágio inicial, e melhor DX (templates via React). SendGrid tem mais
recursos enterprise (listas de supressão, analytics avançado) mas adiciona complexidade
desnecessária para o volume inicial do projeto. Resend pode ser substituído por SendGrid
no futuro sem mudanças na camada de negócio (interface de notificação abstraída).

**Alternativas consideradas**:
- SendGrid: Mais maduro, mas API mais verbosa e SDK menos tipado. Rejeitado pelo Princípio IV.
- AWS SES: Fora do ecossistema GCP/Vercel, adiciona outra conta de cloud. Rejeitado.

---

## 3. Estratégia de Real-Time (Status das Instâncias ≤30s)

**Decision**: Supabase Realtime (Postgres Change Data Capture)

**Rationale**: Quando o WPP Connect detecta uma mudança de status, dispara um webhook para
`/api/webhooks/wpp`. A API Route atualiza `instances.status` no Supabase Postgres. O Supabase
Realtime (via CDC sobre a tabela `instances`) notifica automaticamente todos os clientes
WebSocket subscritos à mudança. O frontend usa o Supabase client para subscrever ao canal
da instância do seu tenant. Latência típica: 1–3s end-to-end, bem abaixo do limite de 30s.

**Alternativas consideradas**:
- Polling do frontend a cada 5s: Mais simples, mas gera N×M requisições (instâncias × usuários).
  Não escala para 200+ instâncias. Rejeitado.
- Server-Sent Events (SSE) via Next.js: Funciona, mas Vercel tem limite de 25s para SSE em
  Serverless Functions. Rejeitado por limitação de plataforma.
- WebSocket próprio: Requereria um servidor stateful fora do Vercel. Viola o Princípio IV.

---

## 4. Alertas via WhatsApp: Arquitetura de Instância Dedicada

**Decision**: Instância WPP Connect dedicada para alertas do sistema ("sistema-alertas")

**Rationale**: Os alertas de WhatsApp são enviados a partir de um número de telefone dedicado
(ex: número do suporte/sistema), não a partir da instância do cliente que ficou offline. Isso
evita o problema do "alerta via instância offline" (chicken-and-egg). A instância de alertas
é gerenciada internamente pela equipe admin, nunca exposta aos clientes, e configurada com
reconexão automática e prioridade máxima de disponibilidade.

**Fluxo de alerta WhatsApp**:
`Status Offline detectado` → `API Route verifica janela de 30min` → `se nova janela: POST /api/alerts/dispatch` → `Resend (email) + WPP instância-sistema (WhatsApp)`

**Alternativas consideradas**:
- Twilio WhatsApp API: Requer aprovação de template pelo Meta, overhead burocrático para alertas
  internos. Rejeitado por complexidade desnecessária no estágio inicial.
- Usar a própria instância do cliente para se alertar: Inviável — a instância está offline.
- Cloud Tasks para agendamento de retry: Usado como complemento se a instância de alertas
  também estiver temporariamente indisponível.

---

## 5. Multi-Tenant Auth: Supabase RLS + Custom Claims

**Decision**: Supabase Auth com Row Level Security (RLS) no Postgres + custom claims no JWT

**Rationale**: Cada usuário autenticado recebe um JWT com `app_metadata.tenant_id` e
`app_metadata.role`. As políticas RLS em todas as tabelas verificam `auth.jwt() ->> 'tenant_id'`
para isolar dados por tenant. Admins têm `role = 'admin'` e uma política RLS separada que
concede acesso irrestrito. Toda query ao banco passa pelo RLS automaticamente — nenhuma
camada de aplicação pode "esquecer" de filtrar por tenant.

**Hierarquia de acesso**:
```
admin → acesso a todos os tenants (sem filtro RLS de tenant)
client → acesso apenas ao próprio tenant_id (filtro RLS aplicado)
```

**Alternativas consideradas**:
- Middleware de aplicação para filtragem de tenant: Mais frágil — um bug expõe dados
  cross-tenant. Rejeitado em favor do RLS (enforcement no nível do banco). Violaria SC-005.
- Firebase Auth + Firestore: Fora do ecossistema Supabase escolhido. Rejeitado.

---

## 6. Logs Estruturados

**Decision**: JSON estruturado via `pino` (Next.js / WPP Service) → Cloud Logging (GCP)

**Rationale**: Cloud Run captura stdout/stderr automaticamente e envia para Cloud Logging.
Usando `pino` com `pino-cloud-logging` transport (ou formato JSON nativo), cada log entry
inclui os campos obrigatórios da constituição: `tenant_id`, `instance_id`, `trace_id`,
`level`, `timestamp`, `message`. Supabase event_logs armazena logs de aplicação (consultáveis
pelos usuários). Cloud Logging armazena logs de infra/sistema (visível apenas para admins
e equipe de operações via Console GCP).

**Divisão de responsabilidades**:
- `event_logs` (Supabase): logs de negócio consultáveis por admin e cliente (status changes, QR events, dispatch events)
- Cloud Logging: logs de sistema, erros de infra, traces de performance (visível apenas internamente)

---

## 7. Supabase vs GCP Managed Services (Conformidade com Princípio VI)

**Decisão de arquitetura com desvio justificado do Princípio VI**:

O Princípio VI da constituição define GCP managed services como padrão. Supabase não é
um serviço GCP. O desvio é justificado por:

1. Supabase fornece Auth, Postgres, Realtime e RLS em um único serviço gerenciado, eliminando
   a necessidade de integrar Firebase Auth + Cloud SQL + Cloud Pub/Sub separadamente.
2. A alternativa GCP equivalente exigiria: Firebase Auth (para JWT/RLS) + Cloud SQL (Postgres)
   + Cloud Pub/Sub (realtime) + Custom RLS via middleware. Isso viola o Princípio IV
   (Simplicidade) de forma mais grave do que o desvio do Princípio VI.
3. O Supabase pode ser hospedado na infraestrutura da GCP (região us-east1 ou southamerica-east1)
   minimizando latência de rede.

**Desvio registrado no Complexity Tracking do plan.md.**

---

## 8. Persistência de Sessão WPP Connect

**Decision**: Google Cloud Storage (GCS) bucket montado via API no WPP Service

**Rationale**: WPP Connect gera arquivos de sessão locais (tokens, credenciais de browser).
No Cloud Run, o sistema de arquivos é efêmero. Usamos a SDK do GCS para fazer upload/download
dos arquivos de sessão ao iniciar/salvar. Uma alternativa é armazenar apenas o token de sessão
(serializado como JSON) no Supabase, com o arquivo de sessão reconstruído on-demand.

**Decisão final**: Token de sessão serializado no Supabase `instances.session_data` (campo
criptografado). Mais simples do que GCS FUSE mounting e elimina dependência de um bucket adicional.
A criptografia usa Supabase Vault ou `pgcrypto` com chave gerenciada via GCP Secret Manager.

---

## Sumário de Decisões

| Área | Decisão | Princípio Guia |
|------|---------|----------------|
| WPP Deploy | Cloud Run min-instances=1 | II, VI |
| Email | Resend | IV |
| Real-time | Supabase Realtime (CDC) | III |
| WhatsApp Alerts | Instância WPP dedicada | II |
| Auth + Isolation | Supabase Auth + RLS | I |
| Logs | pino → Cloud Logging + Supabase event_logs | III |
| Session Persistence | Token serializado no Supabase (criptografado) | IV, VI |
| Supabase vs GCP | Desvio justificado do Princípio VI | IV > VI |
