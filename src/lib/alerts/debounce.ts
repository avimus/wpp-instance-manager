import { createServiceClient } from '@/lib/supabase/server'

export async function shouldSendAlert(instanceId: string): Promise<{ should: boolean; windowId: string | null }> {
  const svc = createServiceClient()
  const now = new Date()

  // Check for an active window (within last 30 min) that already had an alert sent
  const { data: existingWindow } = await svc
    .from('alert_windows')
    .select('id, alert_sent, window_end')
    .eq('instance_id', instanceId)
    .gt('window_end', now.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .single()

  if (existingWindow) {
    // Window exists and is still open — suppress alert
    return { should: false, windowId: existingWindow.id }
  }

  // Create new window
  const windowEnd = new Date(now.getTime() + 30 * 60_000)
  const { data: newWindow, error } = await svc
    .from('alert_windows')
    .insert({ instance_id: instanceId, window_start: now.toISOString(), window_end: windowEnd.toISOString() })
    .select('id')
    .single()

  if (error || !newWindow) return { should: false, windowId: null }
  return { should: true, windowId: newWindow.id }
}

export async function markWindowAlerted(windowId: string): Promise<void> {
  const svc = createServiceClient()
  await svc.from('alert_windows').update({ alert_sent: true }).eq('id', windowId)
}
