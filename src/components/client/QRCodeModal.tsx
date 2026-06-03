'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  instanceId: string
  onClose: () => void
}

export function QRCodeModal({ instanceId, onClose }: Props) {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(60)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQr = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/instances/${instanceId}/reconnect`, { method: 'POST' })
    if (!res.ok) {
      const body = await res.json() as { error?: string; detail?: string }
      setError(body.detail ?? 'Falha ao gerar QR Code')
      setLoading(false)
      return
    }
    const { data } = await res.json() as { data: { qr_code: string; expires_at: string } }
    setQrCode(data.qr_code)
    setExpiresAt(new Date(data.expires_at))
    setLoading(false)
  }, [instanceId])

  useEffect(() => { void fetchQr() }, [fetchQr])

  // Countdown
  useEffect(() => {
    if (!expiresAt) return
    const interval = setInterval(() => {
      const left = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000))
      setSecondsLeft(left)
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  // Listen for instance going Online via Realtime
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`qr-modal-${instanceId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'instances', filter: `id=eq.${instanceId}` }, (payload) => {
        const rec = payload.new as { status: string }
        if (rec.status === 'online') onClose()
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [instanceId, onClose])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Reconectar instância</h2>
        <p className="text-sm text-gray-500 mb-6">Escaneie o QR Code com o WhatsApp do seu celular.</p>

        {loading && <div className="h-64 flex items-center justify-center text-gray-400">Gerando QR Code...</div>}
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        {qrCode && !loading && (
          <>
            <img src={qrCode} alt="QR Code" className="w-64 h-64 mx-auto rounded-lg border border-gray-200" />
            <p className="text-center text-sm text-gray-500 mt-4">
              {secondsLeft > 0 ? `Expira em ${secondsLeft}s` : 'QR Code expirado'}
            </p>
            {secondsLeft === 0 && (
              <button onClick={() => void fetchQr()} className="mt-3 w-full text-sm text-green-600 hover:underline">
                Gerar novo QR Code
              </button>
            )}
          </>
        )}

        <button onClick={onClose} className="mt-6 w-full text-sm text-gray-500 hover:text-gray-700">
          Fechar
        </button>
      </div>
    </div>
  )
}
