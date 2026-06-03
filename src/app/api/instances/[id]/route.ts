import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Errors, ok } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import * as wpp from '@/lib/wpp/client'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Errors.unauthorized()

  const role = user.app_metadata?.role as string
  const tenantId = user.app_metadata?.tenant_id as string | undefined

  // Fetch with service client so RLS never hides the resource before the access check.
  // A cross-tenant client request returns 403, not a misleading 404.
  const svc = createServiceClient()
  const { data: instance, error } = await svc
    .from('instances')
    .select('*, tenant:tenants(name, plan:plans(name, max_instances)), notification_configs:instance_notification_configs(*)')
    .eq('id', params.id)
    .single()

  if (error || !instance) return Errors.notFound('Instance not found')

  if (role !== 'admin' && instance.tenant_id !== tenantId) {
    return Errors.forbidden()
  }

  return ok(instance)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Errors.unauthorized()
  if (user.app_metadata?.role !== 'admin') return Errors.forbidden()

  const svc = createServiceClient()
  const { data: instance } = await svc
    .from('instances')
    .select('wpp_session_id, tenant_id, display_name')
    .eq('id', params.id)
    .single()

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
