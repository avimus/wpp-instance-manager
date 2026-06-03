'use client'

import { useCallback, useState } from 'react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { RealtimeProvider } from '@/components/shared/RealtimeProvider'
import type { InstanceStatus } from '@/lib/supabase/types'

interface Instance {
  id: string
  tenant_id: string
  phone_number: string
  display_name: string
  status: InstanceStatus
  last_seen_at: string | null
  tenants?: { name: string } | null
}

interface Props {
  initialInstances: Instance[]
  tenantId: string | null
  onRestart?: (id: string) => void
  onDelete?: (id: string) => void
  onReconnect?: (id: string) => void
}

export function InstancesTable({ initialInstances, tenantId, onRestart, onDelete, onReconnect }: Props) {
  const [instances, setInstances] = useState<Instance[]>(initialInstances)

  const handleStatusChange = useCallback(({ id, status, last_seen_at }: { id: string; status: InstanceStatus; last_seen_at: string | null }) => {
    setInstances(prev => prev.map(i => i.id === id ? { ...i, status, last_seen_at } : i))
  }, [])

  return (
    <>
      <RealtimeProvider tenantId={tenantId} onStatusChange={handleStatusChange} />
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Instância</th>
              {!tenantId && <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>}
              <th className="text-left px-4 py-3 font-medium text-gray-600">Telefone</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Última atividade</th>
              {(onRestart ?? onDelete ?? onReconnect) && (
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {instances.map(instance => (
              <tr key={instance.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{instance.display_name}</td>
                {!tenantId && <td className="px-4 py-3 text-gray-600">{instance.tenants?.name ?? '—'}</td>}
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{instance.phone_number}</td>
                <td className="px-4 py-3"><StatusBadge status={instance.status} /></td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {instance.last_seen_at ? new Date(instance.last_seen_at).toLocaleString('pt-BR') : '—'}
                </td>
                {(onRestart ?? onDelete ?? onReconnect) && (
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {instance.status === 'offline' && onReconnect && (
                        <button onClick={() => onReconnect(instance.id)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors">
                          Reconectar
                        </button>
                      )}
                      {onRestart && (
                        <button onClick={() => onRestart(instance.id)} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors">
                          Reiniciar
                        </button>
                      )}
                      {onDelete && (
                        <button onClick={() => { if (confirm('Deletar instância?')) onDelete(instance.id) }} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors">
                          Deletar
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {instances.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhuma instância encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
