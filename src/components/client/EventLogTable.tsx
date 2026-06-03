'use client'

import { useEffect, useState } from 'react'

interface LogEntry {
  id: string
  event_type: string
  severity: string
  description: string
  created_at: string
}

interface Props {
  instanceId: string
}

const severityColors: Record<string, string> = {
  info:    'text-blue-600',
  warning: 'text-yellow-600',
  error:   'text-red-600',
}

export function EventLogTable({ instanceId }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const limit = 50

  useEffect(() => {
    setLoading(true)
    void fetch(`/api/instances/${instanceId}/logs?limit=${limit}&offset=${offset}`)
      .then(r => r.json() as Promise<{ data: { data: LogEntry[]; total: number } }>)
      .then(({ data }) => {
        setLogs(data.data)
        setTotal(data.total)
      })
      .finally(() => setLoading(false))
  }, [instanceId, offset])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Log de Eventos</h3>
        <span className="text-xs text-gray-500">{total} entradas</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Descrição</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Severidade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>}
            {!loading && logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-gray-600">{log.event_type}</td>
                <td className="px-4 py-3 text-gray-700">{log.description}</td>
                <td className={`px-4 py-3 text-xs font-medium ${severityColors[log.severity] ?? ''}`}>
                  {log.severity}
                </td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Nenhum log encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {total > limit && (
        <div className="flex justify-between mt-4">
          <button onClick={() => setOffset(o => Math.max(0, o - limit))} disabled={offset === 0} className="text-sm text-gray-600 disabled:opacity-40">← Anterior</button>
          <span className="text-xs text-gray-400">{offset + 1}–{Math.min(offset + limit, total)} de {total}</span>
          <button onClick={() => setOffset(o => o + limit)} disabled={offset + limit >= total} className="text-sm text-gray-600 disabled:opacity-40">Próximo →</button>
        </div>
      )}
    </div>
  )
}
