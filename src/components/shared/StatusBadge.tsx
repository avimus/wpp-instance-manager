'use client'

import type { InstanceStatus } from '@/lib/supabase/types'

const config: Record<InstanceStatus, { label: string; className: string }> = {
  online:       { label: 'Online',       className: 'bg-green-100 text-green-800' },
  offline:      { label: 'Offline',      className: 'bg-red-100 text-red-800' },
  reconnecting: { label: 'Reconectando', className: 'bg-yellow-100 text-yellow-800' },
  pending:      { label: 'Pendente',     className: 'bg-gray-100 text-gray-600' },
}

interface Props {
  status: InstanceStatus
}

export function StatusBadge({ status }: Props) {
  const { label, className } = config[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}
