'use client'

import { useCallback, useEffect, useState } from 'react'
import { InstanceStatusCard } from '@/components/client/InstanceStatusCard'
import { EventLogTable } from '@/components/client/EventLogTable'
import { QRCodeModal } from '@/components/client/QRCodeModal'
import type { InstanceStatus } from '@/lib/supabase/types'

interface Instance {
  id: string
  display_name: string
  phone_number: string
  status: InstanceStatus
  last_seen_at: string | null
}

export default function ClientInstancePage({ params }: { params: { id: string } }) {
  const [instance, setInstance] = useState<Instance | null>(null)
  const [showQr, setShowQr] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchInstance = useCallback(() => {
    setLoading(true)
    void fetch(`/api/instances/${params.id}`)
      .then(async r => {
        if (!r.ok) { setError(true); return }
        const { data } = await r.json() as { data: Instance }
        setInstance(data)
      })
      .finally(() => setLoading(false))
  }, [params.id])

  useEffect(() => { fetchInstance() }, [fetchInstance])

  const handleQrClose = useCallback(() => {
    setShowQr(false)
    fetchInstance()
  }, [fetchInstance])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Carregando...
      </div>
    )
  }

  if (error || !instance) {
    return (
      <div className="text-red-500">
        Instância não encontrada ou acesso negado.
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          ← Voltar ao painel
        </a>
        <h2 className="text-2xl font-bold text-gray-900 mt-1">{instance.display_name}</h2>
      </div>

      <InstanceStatusCard
        id={instance.id}
        displayName={instance.display_name}
        phoneNumber={instance.phone_number}
        status={instance.status}
        lastSeenAt={instance.last_seen_at}
        onReconnect={() => setShowQr(true)}
      />

      <div className="mt-8">
        <EventLogTable instanceId={params.id} />
      </div>

      {showQr && (
        <QRCodeModal instanceId={params.id} onClose={handleQrClose} />
      )}
    </div>
  )
}
