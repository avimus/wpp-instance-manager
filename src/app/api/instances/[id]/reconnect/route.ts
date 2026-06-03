import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Errors, ok } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import * as wpp from '@/lib/wpp/client'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Errors.unauthorized()

  const role = user.app_metadata?.role as string
  const tenantId = user.app_metadata?.tenant_id as string | undefined

  const svc = createServiceClient()
  const { data: instance } = await svc
    .from('instances')
    .select('id, wpp_session_id, tenant_id, status')
    .eq('id', params.id)
    .single()

  if (!instance) return Errors.notFound('Instance not found')
  if (role !== 'admin' && instance.tenant_id !== tenantId) return Errors.forbidden()
  if (instance.status === 'online') return Errors.alreadyOnline()

  try {
    const sessionId = instance.wpp_session_id ?? `${instance.tenant_id}_${params.id}`
    const result = await wpp.startSession(sessionId) as { qr_code?: string; expires_at?: string; status: string }

    await svc.from('event_logs').insert({
      instance_id: params.id,
      tenant_id: instance.tenant_id,
      event_type: 'qr_generated',
      severity: 'info',
      description: 'QR code reconnection initiated',
    })

    return ok({ qr_code: result.qr_code, expires_at: result.expires_at })
  } catch (err) {
    logger.error({ err, instanceId: params.id }, 'reconnect failed')
    return Errors.internal('Failed to initiate reconnection')
  }
}
