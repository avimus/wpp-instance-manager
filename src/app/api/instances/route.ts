import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserCtx } from '@/lib/user-context'
import { Errors, ok, created } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import * as wpp from '@/lib/wpp/client'
import type { InstanceStatus } from '@/lib/supabase/types'

const CreateInstanceSchema = z.object({
  tenant_id: z.string().uuid(),
  display_name: z.string().min(1).max(100),
  wpp_session_id: z.string().min(1).max(200),
  phone_number: z.string().optional().default(''),
})

export async function GET(request: Request) {
  const ctx = await getUserCtx()
  if (!ctx) return Errors.unauthorized()
  const { role, tenantId, userId } = ctx

  // [DEBUG-1] Contexto resolvido pelo getUserCtx
  logger.info({ userId, role, tenantId }, '[DEBUG] GET /api/instances ctx')

  const supabase = createClient()
  const svc = createServiceClient()
  const url = new URL(request.url)
  const filterTenant = url.searchParams.get('tenant_id')
  const filterStatus = url.searchParams.get('status')
  const search = url.searchParams.get('search')

  // [DEBUG-2] Query bruta via service client (bypassa RLS) para o tenant resolvido
  if (tenantId) {
    const { data: rawRows, error: rawErr } = await svc
      .from('instances')
      .select('id, tenant_id, status')
      .eq('tenant_id', tenantId)
    logger.info(
      { tenantId, rawCount: rawRows?.length ?? 0, rawRows, rawErr: rawErr?.message },
      '[DEBUG] GET /api/instances raw (service client, sem RLS)',
    )
  } else {
    logger.info({ tenantId }, '[DEBUG] GET /api/instances tenantId vazio — query bruta pulada')
  }

  let query = supabase
    .from('instances')
    .select('id, tenant_id, phone_number, display_name, status, last_seen_at, created_at, tenants(name)', { count: 'exact' })

  // Clients see only own tenant
  if (role !== 'admin') {
    if (!tenantId) return Errors.forbidden()
    query = query.eq('tenant_id', tenantId)
  } else if (filterTenant) {
    query = query.eq('tenant_id', filterTenant)
  }

  // Status filter is admin-only: clients must always see all their instances
  // (including offline/pending) so they can trigger reconnection.
  if (role === 'admin' && filterStatus) query = query.eq('status', filterStatus as InstanceStatus)
  if (search) query = query.ilike('phone_number', `%${search}%`)

  const { data, error, count } = await query.order('created_at', { ascending: false })

  // [DEBUG-3] Resultado final após RLS + filtros
  logger.info(
    { total: count, returned: data?.length ?? 0, error: error?.message },
    '[DEBUG] GET /api/instances resultado final',
  )

  if (error) {
    logger.error({ error }, 'GET /api/instances failed')
    return Errors.internal()
  }

  return ok({ data, total: count ?? 0 })
}

export async function POST(request: Request) {
  const ctx = await getUserCtx()
  if (!ctx) return Errors.unauthorized()
  if (ctx.role !== 'admin') return Errors.forbidden()

  const body = await request.json() as unknown
  const parsed = CreateInstanceSchema.safeParse(body)
  if (!parsed.success) return Errors.validation(parsed.error.message)

  const { tenant_id, phone_number, display_name, wpp_session_id } = parsed.data
  const svc = createServiceClient()

  // Check tenant plan quota
  const { data: tenant } = await svc
    .from('tenants')
    .select('id, status, plan:plans(max_instances)')
    .eq('id', tenant_id)
    .single()

  if (!tenant) return Errors.notFound('Tenant not found')
  if (tenant.status !== 'active') return Errors.forbidden('Tenant is suspended')

  const plan = (tenant as unknown as { plan: { max_instances: number } }).plan
  if (plan.max_instances !== -1) {
    const { count } = await svc
      .from('instances')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)

    if ((count ?? 0) >= plan.max_instances) {
      return Errors.quotaExceeded(`Plan allows ${plan.max_instances} instance(s). Tenant has ${count}.`)
    }
  }

  const { data: instance, error } = await svc
    .from('instances')
    .insert({ tenant_id, phone_number, display_name, wpp_session_id })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return Errors.conflict('Uma instância com esse número já existe para este tenant')
    logger.error({ error: error.message }, 'POST /api/instances insert failed')
    return Errors.internal()
  }

  // Start WPP session
  let qrCode: string | undefined
  try {
    const result = await wpp.startSession(wpp_session_id) as { qr_code?: string }
    qrCode = result.qr_code
  } catch (err) {
    logger.warn({ err, instanceId: instance.id }, 'WPP session start failed — instance created but not connected')
  }

  await svc.from('event_logs').insert({
    instance_id: instance.id,
    tenant_id,
    event_type: 'instance_created',
    severity: 'info',
    description: `Instance "${display_name}" created`,
  })

  return created({ ...instance, qr_code: qrCode })
}
