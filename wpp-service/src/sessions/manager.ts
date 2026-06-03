import pino from 'pino'
import { saveSessionData, loadSessionData, updateInstanceStatus } from './persistence'
import { sendWebhook } from '../webhooks/sender'

const logger = pino({ level: 'info' })

interface SessionState {
  status: 'pending' | 'online' | 'offline' | 'reconnecting'
  qrCode?: string
  expiresAt?: Date
}

// In-memory session state map (authoritative during process lifetime)
const sessions = new Map<string, SessionState>()

function instanceIdFromSession(sessionId: string): string {
  // sessionId format: "<tenant_id>_<instance_id>"
  return sessionId.split('_')[1] ?? sessionId
}

export async function startSession(sessionId: string): Promise<SessionState & { qr_code?: string; expires_at?: string }> {
  const instanceId = instanceIdFromSession(sessionId)
  const existing = sessions.get(sessionId)

  if (existing?.status === 'online') {
    return { status: 'online' }
  }

  logger.info({ sessionId }, 'Starting session')

  // Check for saved session token
  const savedData = await loadSessionData(instanceId)

  if (savedData) {
    // Attempt session resume — in production, pass token to wppconnect
    sessions.set(sessionId, { status: 'online' })
    await updateInstanceStatus(instanceId, 'online')
    await sendWebhook({ event: 'session_status', session_id: sessionId, status: 'online' })
    return { status: 'online' }
  }

  // No saved session — generate mock QR code (replace with real wppconnect call)
  const qrCode = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`
  const expiresAt = new Date(Date.now() + 60_000)

  sessions.set(sessionId, { status: 'reconnecting', qrCode, expiresAt })
  await updateInstanceStatus(instanceId, 'reconnecting')

  // Simulate QR scan after 60s expiry (in production wppconnect handles this)
  setTimeout(async () => {
    const state = sessions.get(sessionId)
    if (state?.status === 'reconnecting') {
      sessions.set(sessionId, { status: 'offline' })
      await updateInstanceStatus(instanceId, 'offline')
      await sendWebhook({ event: 'session_status', session_id: sessionId, status: 'offline', metadata: { reason: 'qr_expired' } })
    }
  }, 60_000)

  return { status: 'qr_ready', qr_code: qrCode, expires_at: expiresAt.toISOString() }
}

export async function stopSession(sessionId: string): Promise<void> {
  const instanceId = instanceIdFromSession(sessionId)
  sessions.delete(sessionId)
  await updateInstanceStatus(instanceId, 'offline')
  await saveSessionData(instanceId, '')
  await sendWebhook({ event: 'session_status', session_id: sessionId, status: 'offline', metadata: { reason: 'stopped' } })
}

export function getStatus(sessionId: string): SessionState {
  return sessions.get(sessionId) ?? { status: 'offline' }
}

export async function confirmOnline(sessionId: string): Promise<void> {
  const instanceId = instanceIdFromSession(sessionId)
  sessions.set(sessionId, { status: 'online' })
  await updateInstanceStatus(instanceId, 'online')
  await sendWebhook({ event: 'session_status', session_id: sessionId, status: 'online' })
  await sendWebhook({ event: 'qr_invalidated', session_id: sessionId, reason: 'scanned' })
}
