# Quickstart: WhatsApp Instance Control Dashboard

**Branch**: `001-whatsapp-instance-dashboard` | **Date**: 2026-06-01

---

## Pré-requisitos

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- Supabase CLI (`npm install -g supabase`)
- Docker Desktop (para Supabase local)
- gcloud CLI (para deploy no Cloud Run)
- Conta Supabase e projeto criado
- Conta Vercel (para deploy do Next.js)

---

## 1. Clonar e instalar dependências

```bash
git clone <repo-url>
cd wpp-instance-manager
pnpm install
```

---

## 2. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencher `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# WPP Connect Service (Cloud Run)
WPP_SERVICE_URL=http://localhost:3001   # local; produção: URL do Cloud Run
WPP_SERVICE_SECRET=<secret-compartilhado>
WPP_WEBHOOK_SECRET=<secret-para-assinar-webhooks>

# Notificações
RESEND_API_KEY=<resend-api-key>

# Sistema
SESSION_ENCRYPTION_KEY=<chave-32-bytes-base64>
```

---

## 3. Banco de dados local (Supabase)

```bash
# Inicializar Supabase local (requer Docker)
supabase start

# Aplicar migrations (cria todas as tabelas e políticas RLS)
supabase db push

# Seed inicial (plans + admin user)
supabase db seed
```

Painel local do Supabase: `http://localhost:54323`

---

## 4. Rodar o Next.js em desenvolvimento

```bash
pnpm dev
```

App disponível em `http://localhost:3000`

**Usuários de teste criados pelo seed**:
| Email | Senha | Role |
|-------|-------|------|
| admin@test.com | admin123 | admin |
| client@acme.com | client123 | client (tenant: Acme Corp) |

---

## 5. Rodar o WPP Connect Service localmente

```bash
cd wpp-service
pnpm install
pnpm dev   # porta 3001
```

> **Atenção**: WPP Connect requer um número de WhatsApp real para testar.
> Em desenvolvimento, você pode usar o modo `--mock-qr` para simular o fluxo de QR Code
> sem conectar ao WhatsApp de verdade.

```bash
pnpm dev --mock-qr
```

---

## 6. Validar os fluxos principais

### Fluxo Admin — Criar instância e verificar QR Code

```bash
# Criar instância via API
curl -X POST http://localhost:3000/api/instances \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"<uuid>","phone_number":"5511900000000","display_name":"Teste"}'

# Resposta deve conter: { "data": { "status": "pending", "qr_code": "data:image/png..." } }
```

### Fluxo Cliente — Reconexão via QR Code

```bash
# Iniciar reconexão
curl -X POST http://localhost:3000/api/instances/<id>/reconnect \
  -H "Authorization: Bearer <client-jwt>"

# Verificar status em tempo real: observar Supabase Realtime no painel local
```

### Testar isolamento de tenant

```bash
# Tentar acessar instância de outro tenant com token de client
curl http://localhost:3000/api/instances/<id-de-outro-tenant> \
  -H "Authorization: Bearer <client-jwt>"

# Esperado: 403 { "error": "FORBIDDEN" }
```

---

## 7. Deploy

### Frontend (Vercel)

```bash
vercel deploy --prod
```

Configurar variáveis de ambiente no painel da Vercel (todas as do `.env.local` exceto as locais).

### WPP Connect Service (Cloud Run)

```bash
cd wpp-service

# Build da imagem
docker build -t gcr.io/<projeto>/wpp-service .

# Push
docker push gcr.io/<projeto>/wpp-service

# Deploy
gcloud run deploy wpp-service \
  --image gcr.io/<projeto>/wpp-service \
  --region southamerica-east1 \
  --min-instances 1 \
  --memory 1Gi \
  --set-secrets WPP_SERVICE_SECRET=wpp-service-secret:latest \
  --set-secrets SUPABASE_SERVICE_ROLE_KEY=supabase-service-role:latest
```

### Banco de dados (Supabase produção)

```bash
supabase db push --linked   # aplica migrations no projeto Supabase remoto
```

---

## 8. Healthchecks

- Next.js: `GET /api/health` → `{ "status": "ok" }`
- WPP Service: `GET /health` → `{ "status": "ok", "sessions": N }`
- Supabase: monitorado via Cloud Monitoring + Supabase Dashboard

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| QR Code não aparece | Verificar se WPP Service está rodando em `:3001`; checar logs com `pnpm logs` |
| Status não atualiza em tempo real | Verificar se Supabase Realtime está habilitado para a tabela `instances` |
| 403 em rota de admin | Verificar se `app_metadata.role = 'admin'` está no JWT (Supabase Auth Hook) |
| Sessão WPP perde conexão | Normal em dev sem `--min-instances`; em produção, Cloud Run mantém mínimo 1 instância |
