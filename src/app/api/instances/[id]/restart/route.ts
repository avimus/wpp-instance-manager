import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Errors, ok } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import * as wpp from '@/lib/wpp/client'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Errors.unauthorized()
  if (user.app_metadata?.role !== 'admin') return Errors.forbidden()

  const svc = createServiceClient()
  const { data: instance } = await svc
    .from('instances')
    .select('id, wpp_session_id, tenant_id, display_name')
    .eq('id', params.id)
    .single()

  if (!instance) return Errors.notFound('Instance not found')

  try {
    if (instance.wpp_session_id) await wpp.stopSession(instance.wpp_session_id)
    const result = await wpp.startSession(instance.wpp_session_id ?? `unknown_${params.id}`) as { qr_code?: string; status: string }

    await svc.from('event_logs').insert({
      instance_id: params.id,
      tenant_id: instance.tenant_id,
      event_type: 'instance_restarted',
      severity: 'info',
      description: `Instance "${instance.display_name}" restarted`,
    })

    return ok({ status: 'reconnecting', qr_code: result.qr_code })
  } catch (err) {
    logger.error({ err, instanceId: params.id }, 'restart instance failed')
    return Errors.internal('Failed to restart instance')
  }
}
