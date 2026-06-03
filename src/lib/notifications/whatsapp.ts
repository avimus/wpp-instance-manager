import { logger } from '@/lib/logger'

const WPP_SERVICE_URL = process.env.WPP_SERVICE_URL!
const WPP_SERVICE_SECRET = process.env.WPP_SERVICE_SECRET!
const SYSTEM_SESSION = process.env.WPP_SYSTEM_SESSION_ID ?? 'sistema-alertas'

export async function sendWhatsAppAlert(to: string, message: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${WPP_SERVICE_URL}/sessions/${SYSTEM_SESSION}/send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WPP_SERVICE_SECRET}`,
        },
        body: JSON.stringify({ to: `${to}@c.us`, message }),
      },
    )
    return res.ok
  } catch (err) {
    logger.error({ err, to }, 'Failed to send WhatsApp alert')
    return false
  }
}
