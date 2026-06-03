import { Resend } from 'resend'
import { logger } from '@/lib/logger'

const FROM = process.env.ALERT_FROM_EMAIL ?? 'alertas@wpp-manager.com'

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

export async function sendOfflineAlert(params: {
  to: string
  instanceName: string
  phoneNumber: string
  tenantName: string
}): Promise<boolean> {
  try {
    await getResend().emails.send({
      from: FROM,
      to: params.to,
      subject: `⚠️ Instância offline: ${params.instanceName}`,
      html: `
        <h2>Instância WhatsApp Offline</h2>
        <p>A instância <strong>${params.instanceName}</strong> (${params.phoneNumber})
        do cliente <strong>${params.tenantName}</strong> ficou offline.</p>
        <p>Acesse o painel para reconectar ou aguarde a reconexão automática.</p>
      `,
    })
    return true
  } catch (err) {
    logger.error({ err, to: params.to }, 'Failed to send offline alert email')
    return false
  }
}

export async function sendRecoveryAlert(params: {
  to: string
  instanceName: string
  phoneNumber: string
  tenantName: string
}): Promise<boolean> {
  try {
    await getResend().emails.send({
      from: FROM,
      to: params.to,
      subject: `✅ Instância reconectada: ${params.instanceName}`,
      html: `
        <h2>Instância WhatsApp Reconectada</h2>
        <p>A instância <strong>${params.instanceName}</strong> (${params.phoneNumber})
        do cliente <strong>${params.tenantName}</strong> voltou a ficar online.</p>
      `,
    })
    return true
  } catch (err) {
    logger.error({ err, to: params.to }, 'Failed to send recovery alert email')
    return false
  }
}
