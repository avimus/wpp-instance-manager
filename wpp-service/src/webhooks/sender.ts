import crypto from 'crypto'
import pino from 'pino'

const logger = pino({ level: 'info' })
const WEBHOOK_URL = process.env.NEXTJS_WEBHOOK_URL!
const WEBHOOK_SECRET = process.env.WPP_WEBHOOK_SECRET!

interface WebhookPayload {
  event: 'session_status' | 'qr_invalidated' | 'dispatch_result'
  session_id: string
  [key: string]: unknown
}

export async function sendWebhook(payload: WebhookPayload): Promise<void> {
  const body = JSON.stringify({ ...payload, timestamp: new Date().toISOString() })
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex')

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WPP-Signature': signature,
      },
      body,
    })
    if (!res.ok) {
      logger.warn({ status: res.status, event: payload.event }, 'Webhook delivery non-2xx')
    }
  } catch (err) {
    logger.error({ err, event: payload.event }, 'Webhook delivery failed')
  }
}
