import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'
import pino from 'pino'

const logger = pino({ level: 'info' })
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  // ws and Supabase's WebSocketLikeConstructor differ only in ErrorEvent shape; cast is safe at runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { realtime: { transport: WebSocket as any } },
)

export async function saveSessionData(instanceId: string, sessionData: string): Promise<void> {
  const { error } = await supabase
    .from('instances')
    .update({ session_data: sessionData, updated_at: new Date().toISOString() })
    .eq('id', instanceId)

  if (error) {
    logger.error({ instanceId, error }, 'Failed to save session data')
    throw error
  }
}

export async function loadSessionData(instanceId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('instances')
    .select('session_data')
    .eq('id', instanceId)
    .single()

  if (error) {
    logger.error({ instanceId, error }, 'Failed to load session data')
    return null
  }
  return data?.session_data ?? null
}

export async function updateInstanceStatus(
  instanceId: string,
  status: 'pending' | 'online' | 'offline' | 'reconnecting',
): Promise<void> {
  const { error } = await supabase
    .from('instances')
    .update({ status, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', instanceId)

  if (error) {
    logger.error({ instanceId, status, error }, 'Failed to update instance status')
  }
}
