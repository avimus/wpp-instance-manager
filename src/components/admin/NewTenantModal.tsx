'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Plan {
  id: string
  name: string
  max_instances: number
}

interface Props {
  plans: Plan[]
}

export function NewTenantModal({ plans }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    primary_contact_email: '',
    plan_id: plans[0]?.id ?? '',
  })

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const body = await res.json() as { detail?: string }
      setError(body.detail ?? 'Erro ao cadastrar cliente.')
      setLoading(false)
      return
    }

    setLoading(false)
    setOpen(false)
    setForm({ name: '', primary_contact_email: '', plan_id: plans[0]?.id ?? '' })
    router.refresh()
  }

  function handleClose() {
    if (loading) return
    setOpen(false)
    setError(null)
  }

  function planLabel(p: Plan) {
    const quota = p.max_instances === -1 ? 'ilimitado' : `${p.max_instances} inst.`
    return `${p.name.charAt(0).toUpperCase() + p.name.slice(1)} — ${quota}`
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
      >
        + Novo Cliente
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-1">Novo Cliente</h2>
            <p className="text-sm text-gray-500 mb-6">
              Preencha os dados para cadastrar um novo tenant.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do cliente <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="Ex: Acme Corp"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email de contato <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.primary_contact_email}
                  onChange={set('primary_contact_email')}
                  placeholder="contato@empresa.com"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plano <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.plan_id}
                  onChange={set('plan_id')}
                  required
                  disabled={plans.length === 0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                >
                  {plans.length === 0 && (
                    <option value="" disabled>Nenhum plano encontrado</option>
                  )}
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {planLabel(p)}
                    </option>
                  ))}
                </select>
                {plans.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Nenhum plano cadastrado. Execute a migration 013_seed_plans.sql no Supabase.
                  </p>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
