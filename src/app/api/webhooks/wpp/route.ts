import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { dispatchAlerts } from '@/lib/alerts/dispatch'

const WEBHOOK_SECRET = process.env.WPP_WEBHOOK_SECRET!

function verifySignature(body: string, signature: string): boolean {
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

function instanceIdFromSession(sessionId: string): string {
  const parts = sessionId.split('_')
  return parts[1] ?? sessionId
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('x-wpp-signature') ?? ''

  if (!verifySignature(body, signature)) {
    logger.warn('WPP webhook signature verification failed')
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(body) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const { event, session_id, status } = payload as {
    event: string
    session_id: string
    status?: string
    metadata?: Record<string, unknown>
  }

  const svc = createServiceClient()
  const instanceId = instanceIdFromSession(session_id as string)

  if (event === 'session_status' && status) {
    const validStatuses = ['pending', 'online', 'offline', 'reconnecting'] as const
    type ValidStatus = typeof validStatuses[number]
    const newStatus = validStatuses.includes(status as ValidStatus) ? (status as ValidStatus) : undefined
    if (!newStatus) return NextResponse.json({ ok: true })

    const { data: prev } = await svc
      .from('instances')
      .select('status, tenant_id, display_name')
      .eq('id', instanceId)
      .single()

    await svc.from('instances').update({
      status: newStatus,
      last_seen_at: new Date().toISOString(),
    }).eq('id', instanceId)

    if (prev) {
      await svc.from('event_logs').insert({
        instance_id: instanceId,
        tenant_id: prev.tenant_id,
        event_type: 'status_change',
        severity: newStatus === 'offline' ? 'warning' : 'info',
        description: `Status changed from ${prev.status} to ${newStatus}`,
        metadata: { previous_status: prev.status, new_status: newStatus },
      })

      // Dispatch alerts asynchronously (fire-and-forget, errors are logged)
      if (newStatus === 'offline' && prev.status !== 'offline') {
        void dispatchAlerts(instanceId, 'offline')
      } else if (newStatus === 'online' && prev.status === 'offline') {
        // Wait 2 min before sending recovery notification
        setTimeout(() => void dispatchAlerts(instanceId, 'recovered'), 2 * 60_000)
      }
    }
  }

  if (event === 'qr_generated') {
    const { data: inst } = await svc.from('instances').select('tenant_id').eq('id', instanceId).single()
    if (inst) {
      await svc.from('event_logs').insert({
        instance_id: instanceId,
        tenant_id: inst.tenant_id,
        event_type: 'qr_generated',
        severity: 'info',
        description: 'QR code generated for reconnection',
      })
    }
  }

  if (event === 'qr_invalidated') {
    const { data: inst } = await svc.from('instances').select('tenant_id').eq('id', instanceId).single()
    if (inst) {
      await svc.from('event_logs').insert({
        instance_id: instanceId,
        tenant_id: inst.tenant_id,
        event_type: 'qr_scanned',
        severity: 'info',
        description: 'QR code scanned — instance reconnecting',
      })
    }
  }

  if (event === 'dispatch_result') {
    const { data: inst } = await svc.from('instances').select('tenant_id').eq('id', instanceId).single()
    if (inst) {
      await svc.from('dispatch_events').insert({
        instance_id: instanceId,
        tenant_id: inst.tenant_id,
        recipient_count: (payload.recipient_count as number) ?? 0,
        delivery_status: (payload.delivery_status as string) ?? 'success',
        error_code: (payload.error_code as string) ?? null,
      })
    }
  }

  return NextResponse.json({ ok: true })
}
