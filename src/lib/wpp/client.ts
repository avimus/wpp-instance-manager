import { logger } from '@/lib/logger'

const WPP_SERVICE_URL = process.env.WPP_SERVICE_URL!
const WPP_SERVICE_SECRET = process.env.WPP_SERVICE_SECRET!

async function wppFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${WPP_SERVICE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${WPP_SERVICE_SECRET}`,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    logger.error({ path, status: res.status, body }, 'WPP Service request failed')
    throw new Error(`WPP Service error ${res.status}: ${body}`)
  }
  return res.json() as Promise<Record<string, unknown>>
}

export async function startSession(sessionId: string) {
  return wppFetch(`/sessions/${encodeURIComponent(sessionId)}/start`, { method: 'POST' })
}

export async function stopSession(sessionId: string) {
  return wppFetch(`/sessions/${encodeURIComponent(sessionId)}/stop`, { method: 'POST' })
}

export async function getSessionStatus(sessionId: string) {
  return wppFetch(`/sessions/${encodeURIComponent(sessionId)}/status`)
}

export async function sendMessage(sessionId: string, to: string, message: string) {
  return wppFetch(`/sessions/${encodeURIComponent(sessionId)}/send`, {
    method: 'POST',
    body: JSON.stringify({ to, message }),
  })
}
