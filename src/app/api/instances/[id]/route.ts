import { createServiceClient } from '@/lib/supabase/server'
import { getUserCtx } from '@/lib/user-context'
import { Errors, ok } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import * as wpp from '@/lib/wpp/client'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getUserCtx()
  if (!ctx) return Errors.unauthorized()
  const { role, tenantId } = ctx

  // Fetch with service client so RLS never hides the resource before the access check.
  // A cross-tenant client request returns 403, not a misleading 404.
  const svc = createServiceClient()
  const { data: instanceRaw, error } = await svc
    .from('instances')
    .select('*, tenant:tenants(name, plan:plans(name, max_instances)), notification_configs:instance_notification_configs(*)')
    .eq('id', params.id)
    .single()
  type InstanceFull = { id: string; tenant_id: string; phone_number: string; display_name: string; status: string; wpp_session_id: string | null; last_seen_at: string | null; created_at: string; [key: string]: unknown }
  const instance = instanceRaw as unknown as InstanceFull | null

  if (error || !instance) return Errors.notFound('Instance not found')

  if (role !== 'admin' && instance.tenant_id !== tenantId) {
    return Errors.forbidden()
  }

  return ok(instance)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getUserCtx()
  if (!ctx) return Errors.unauthorized()
  if (ctx.role !== 'admin') return Errors.forbidden()

  const svc = createServiceClient()
  const { data: instanceRaw2 } = await svc
    .from('instances')
    .select('wpp_session_id, tenant_id, display_name')
    .eq('id', params.id)
    .single()
  const instance = instanceRaw2 as { wpp_session_id: string | null; tenant_id: string; display_name: string } | null

  if (!instance) return Errors.notFound('Instance not found')

  if (instance.wpp_session_id) {
    try { await wpp.stopSession(instance.wpp_session_id) } catch { /* ignore WPP errors on delete */ }
  }

  await svc.from('event_logs').insert({
    instance_id: params.id,
    tenant_id: instance.tenant_id,
    event_type: 'instance_deleted',
    severity: 'warning',
    description: `Instance "${instance.display_name}" deleted`,
  })

  const { error } = await svc.from('instances').delete().eq('id', params.id)
  if (error) {
    logger.error({ error: error.message, instanceId: params.id }, 'DELETE instance failed')
    return Errors.internal()
  }

  return ok({ message: 'Instance deleted' })
}
