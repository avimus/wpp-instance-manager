import { createServiceClient } from '@/lib/supabase/server'
import { shouldSendAlert, markWindowAlerted } from './debounce'
import { sendOfflineAlert, sendRecoveryAlert } from '@/lib/notifications/email'
import { sendWhatsAppAlert } from '@/lib/notifications/whatsapp'
import { logger } from '@/lib/logger'

type TriggerEvent = 'offline' | 'recovered'

export async function dispatchAlerts(instanceId: string, trigger: TriggerEvent): Promise<void> {
  const svc = createServiceClient()

  // Get instance + tenant + notification configs
  const { data: instance } = await svc
    .from('instances')
    .select('id, tenant_id, display_name, phone_number, tenant:tenants(name), configs:instance_notification_configs(channel, recipient)')
    .eq('id', instanceId)
    .single()

  if (!instance) return

  const tenantName = (instance as unknown as { tenant: { name: string } }).tenant.name
  const configs = (instance as unknown as { configs: Array<{ channel: string; recipient: string }> }).configs

  if (!configs.length) {
    logger.warn({ instanceId }, 'No notification configs — skipping alert dispatch')
    return
  }

  let windowId: string | null = null

  if (trigger === 'offline') {
    const { should, windowId: wid } = await shouldSendAlert(instanceId)
    if (!should) {
      logger.info({ instanceId }, 'Alert suppressed by debounce window')
      return
    }
    windowId = wid
  }

  for (const config of configs) {
    let status: 'sent' | 'failed' = 'failed'

    if (config.channel === 'email') {
      const ok = trigger === 'offline'
        ? await sendOfflineAlert({ to: config.recipient, instanceName: instance.display_name, phoneNumber: instance.phone_number, tenantName })
        : await sendRecoveryAlert({ to: config.recipient, instanceName: instance.display_name, phoneNumber: instance.phone_number, tenantName })
      status = ok ? 'sent' : 'failed'
    } else if (config.channel === 'whatsapp') {
      const msg = trigger === 'offline'
        ? `⚠️ Instância *${instance.display_name}* (${instance.phone_number}) ficou offline. Acesse o painel para reconectar.`
        : `✅ Instância *${instance.display_name}* (${instance.phone_number}) voltou a ficar online.`
      const ok = await sendWhatsAppAlert(config.recipient, msg)
      status = ok ? 'sent' : 'failed'
    }

    if (windowId) {
      await svc.from('alert_deliveries').insert({
        window_id: windowId,
        instance_id: instanceId,
        channel: config.channel as 'email' | 'whatsapp',
        recipient: config.recipient,
        status,
        trigger_event: trigger,
      })
    }
  }

  if (windowId && trigger === 'offline') {
    await markWindowAlerted(windowId)
  }
}
