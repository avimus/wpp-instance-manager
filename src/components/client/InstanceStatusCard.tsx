'use client'

import { StatusBadge } from '@/components/shared/StatusBadge'
import type { InstanceStatus } from '@/lib/supabase/types'

interface Props {
  id: string
  displayName: string
  phoneNumber: string
  status: InstanceStatus
  lastSeenAt: string | null
  onReconnect?: () => void
}

export function InstanceStatusCard({ displayName, phoneNumber, status, lastSeenAt, onReconnect }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">{displayName}</h3>
          <p className="text-sm text-gray-500 font-mono mt-0.5">{phoneNumber}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      {lastSeenAt && (
        <p className="text-xs text-gray-400 mt-3">
          Última atividade: {new Date(lastSeenAt).toLocaleString('pt-BR')}
        </p>
      )}
      {status === 'offline' && onReconnect && (
        <button
          onClick={onReconnect}
          className="mt-4 w-full bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 transition-colors"
        >
          Reconectar via QR Code
        </button>
      )}
    </div>
  )
}
