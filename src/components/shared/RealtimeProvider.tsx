'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { InstanceStatus } from '@/lib/supabase/types'

interface StatusChange {
  id: string
  status: InstanceStatus
  last_seen_at: string | null
}

interface Props {
  tenantId: string | null  // null = subscribe to all (admin)
  onStatusChange: (change: StatusChange) => void
}

export function RealtimeProvider({ tenantId, onStatusChange }: Props) {
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('instances-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'instances',
          filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
        },
        (payload) => {
          const rec = payload.new as StatusChange
          onStatusChange({ id: rec.id, status: rec.status, last_seen_at: rec.last_seen_at })
        },
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [tenantId, onStatusChange])

  return null
}
