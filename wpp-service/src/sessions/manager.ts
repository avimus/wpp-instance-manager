import wppconnect from '@wppconnect-team/wppconnect'
import fs from 'fs/promises'
import path from 'path'
import pino from 'pino'
import { saveSessionData, loadSessionData, updateInstanceStatus } from './persistence'
import { sendWebhook } from '../webhooks/sender'

const logger = pino({ level: 'info' })
const TOKENS_DIR = process.env.TOKENS_DIR ?? '/tmp/wpp-tokens'
const PUPPETEER_EXECUTABLE = process.env.PUPPETEER_EXECUTABLE_PATH ?? '/usr/bin/chromium'

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu',
]

interface SessionState {
  status: 'pending' | 'online' | 'offline' | 'reconnecting'
  qrCode?: string
  expiresAt?: Date
}

// In-memory session state (authoritative during process lifetime)
const sessions = new Map<string, SessionState>()
const clients = new Map<string, wppconnect.Whatsapp>()
// Prevents duplicate wppconnect.create calls for the same session
const initializing = new Set<string>()

function instanceIdFromSession(sessionId: string): string {
  return sessionId.split('_')[1] ?? sessionId
}

// WPP Connect file token store: {TOKENS_DIR}/{sessionId}/{sessionId}.data.json
function tokenFilePath(sessionId: string): string {
  return path.join(TOKENS_DIR, sessionId, `${sessionId}.data.json`)
}

async function persistTokens(sessionId: string): Promise<void> {
  const instanceId = instanceIdFromSession(sessionId)
  try {
    const content = await fs.readFile(tokenFilePath(sessionId), 'utf-8')
    await saveSessionData(instanceId, content)
    logger.info({ sessionId }, 'Session tokens persisted to Supabase')
  } catch (err) {
    logger.warn({ sessionId, err }, 'Failed to persist session tokens')
  }
}

export async function startSession(
  sessionId: string,
): Promise<{ status: string; qr_code?: string; expires_at?: string }> {
  const instanceId = instanceIdFromSession(sessionId)

  if (sessions.get(sessionId)?.status === 'online' && clients.has(sessionId)) {
    return { status: 'online' }
  }

  if (initializing.has(sessionId)) {
    const current = sessions.get(sessionId)
    return {
      status: current?.status ?? 'reconnecting',
      ...(current?.qrCode && {
        qr_code: current.qrCode,
        expires_at: current.expiresAt?.toISOString(),
      }),
    }
  }

  initializing.add(sessionId)
  sessions.set(sessionId, { status: 'reconnecting' })
  await updateInstanceStatus(instanceId, 'reconnecting')

  // Restore tokens from Supabase so wppconnect can resume the session
  const savedData = await loadSessionData(instanceId)
  if (savedData) {
    const tokenFile = tokenFilePath(sessionId)
    await fs.mkdir(path.dirname(tokenFile), { recursive: true })
    await fs.writeFile(tokenFile, savedData, 'utf-8')
    logger.info({ sessionId }, 'Restored session tokens from Supabase')
  }

  // Start wppconnect asynchronously — create() blocks until session is ready
  wppconnect
    .create({
      session: sessionId,
      tokenStore: 'file',
      folderNameToken: TOKENS_DIR,
      headless: true,
      devtools: false,
      useChrome: false,
      puppeteerOptions: { executablePath: PUPPETEER_EXECUTABLE, args: BROWSER_ARGS },
      logQR: false,
      catchQR: async (base64Qr: string) => {
        const expiresAt = new Date(Date.now() + 60_000)
        sessions.set(sessionId, { status: 'reconnecting', qrCode: base64Qr, expiresAt })
        logger.info({ sessionId }, 'QR code generated')
        await sendWebhook({
          event: 'session_status',
          session_id: sessionId,
          status: 'qr_ready',
          metadata: { qr_code: base64Qr, expires_at: expiresAt.toISOString() },
        })
      },
      statusFind: (statusSession: string, _session: string) => {
        logger.info({ sessionId, statusSession }, 'WPP status update')
      },
    })
    .then(async (client: wppconnect.Whatsapp) => {
      clients.set(sessionId, client)
      initializing.delete(sessionId)
      sessions.set(sessionId, { status: 'online' })
      await updateInstanceStatus(instanceId, 'online')
      await persistTokens(sessionId)
      await sendWebhook({ event: 'session_status', session_id: sessionId, status: 'online' })
      logger.info({ sessionId }, 'Session online')

      client.onStateChange(async (state: wppconnect.SocketState) => {
        logger.info({ sessionId, state }, 'WPP state change')
        const isDisconnected =
          state === wppconnect.SocketState.CONFLICT ||
          state === wppconnect.SocketState.UNPAIRED ||
          state === wppconnect.SocketState.UNPAIRED_IDLE
        if (isDisconnected) {
          clients.delete(sessionId)
          sessions.set(sessionId, { status: 'offline' })
          await updateInstanceStatus(instanceId, 'offline')
          await sendWebhook({
            event: 'session_status',
            session_id: sessionId,
            status: 'offline',
            metadata: { reason: state },
          })
        }
      })
    })
    .catch(async (err: Error) => {
      logger.error({ sessionId, err: err.message }, 'WPP session failed to start')
      clients.delete(sessionId)
      initializing.delete(sessionId)
      sessions.set(sessionId, { status: 'offline' })
      await updateInstanceStatus(instanceId, 'offline')
    })

  return { status: 'reconnecting' }
}

export async function stopSession(sessionId: string): Promise<void> {
  const instanceId = instanceIdFromSession(sessionId)
  const client = clients.get(sessionId)

  if (client) {
    try {
      await client.close()
    } catch (err) {
      logger.warn({ sessionId, err }, 'Error closing WPP session')
    }
    clients.delete(sessionId)
  }

  initializing.delete(sessionId)
  sessions.delete(sessionId)
  await updateInstanceStatus(instanceId, 'offline')
  await saveSessionData(instanceId, '')

  try {
    await fs.rm(path.join(TOKENS_DIR, sessionId), { recursive: true, force: true })
  } catch (err) {
    logger.warn({ sessionId, err }, 'Failed to clean up token files')
  }

  await sendWebhook({
    event: 'session_status',
    session_id: sessionId,
    status: 'offline',
    metadata: { reason: 'stopped' },
  })
}

export function getStatus(sessionId: string): SessionState {
  return sessions.get(sessionId) ?? { status: 'offline' }
}

export function getSessionCount(): number {
  return sessions.size
}

export async function sendMessage(sessionId: string, to: string, message: string): Promise<string> {
  const client = clients.get(sessionId)
  if (!client) {
    throw new Error('SESSION_OFFLINE')
  }
  const result = await client.sendText(`${to}@c.us`, message)
  return result.id
}
