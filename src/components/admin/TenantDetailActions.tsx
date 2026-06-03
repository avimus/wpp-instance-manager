'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Toast, useToast } from '@/components/shared/Toast'
import type { InstanceStatus } from '@/lib/supabase/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Plan {
  id: string
  name: string
  max_instances: number
}

interface Tenant {
  id: string
  name: string
  primary_contact_email: string
  status: string
  plan_id: string
}

interface Instance {
  id: string
  display_name: string
  status: InstanceStatus
  wpp_session_id: string | null
  created_at: string
}

interface Props {
  tenant: Tenant
  plans: Plan[]
  instances: Instance[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function planLabel(p: Plan) {
  const quota = p.max_instances === -1 ? 'ilimitado' : `${p.max_instances} inst.`
  return `${p.name.charAt(0).toUpperCase() + p.name.slice(1)} — ${quota}`
}

function inputClass(extra = '') {
  return `w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${extra}`
}

// ── Modal shell ───────────────────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, children }: {
  title: string
  subtitle: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{title}</h2>
        <p className="text-sm text-gray-500 mb-6">{subtitle}</p>
        {children}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function TenantDetailActions({ tenant, plans, instances }: Props) {
  const router = useRouter()
  const { toast, show, dismiss } = useToast()

  // ── Edit tenant modal ────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState({
    name: tenant.name,
    primary_contact_email: tenant.primary_contact_email,
    plan_id: tenant.plan_id,
    status: tenant.status as 'active' | 'suspended',
  })

  function setEditField(field: keyof typeof editForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setEditForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEditLoading(true)
    const res = await fetch(`/api/tenants/${tenant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    setEditLoading(false)
    if (!res.ok) {
      const body = await res.json() as { detail?: string }
      show(body.detail ?? 'Erro ao salvar alterações.', 'error')
      return
    }
    setEditOpen(false)
    show('Cliente atualizado com sucesso.', 'success')
    router.refresh()
  }

  // ── Add instance modal ───────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [instanceForm, setInstanceForm] = useState({
    display_name: '',
    wpp_session_id: crypto.randomUUID(),
  })

  function setInstanceField(field: keyof typeof instanceForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setInstanceForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  function openAddModal() {
    setInstanceForm({ display_name: '', wpp_session_id: crypto.randomUUID() })
    setAddOpen(true)
  }

  async function handleAddInstance(e: React.FormEvent) {
    e.preventDefault()
    setAddLoading(true)
    const res = await fetch('/api/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenant.id, ...instanceForm }),
    })
    setAddLoading(false)
    if (!res.ok) {
      const body = await res.json() as { detail?: string }
      show(body.detail ?? 'Erro ao criar instância.', 'error')
      return
    }
    setAddOpen(false)
    show('Instância criada com sucesso.', 'success')
    router.refresh()
  }

  // ── Invite modal ─────────────────────────────────────────────────────────
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteLoading(true)
    const res = await fetch(`/api/tenants/${tenant.id}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail }),
    })
    setInviteLoading(false)
    if (!res.ok) {
      const body = await res.json() as { detail?: string }
      show(body.detail ?? 'Erro ao enviar convite.', 'error')
      return
    }
    setInviteOpen(false)
    setInviteEmail('')
    show(`Convite enviado para ${inviteEmail}`, 'success')
  }

  // ── Instance actions ─────────────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleRestart = useCallback(async (id: string, name: string) => {
    setActionLoading(id)
    const res = await fetch(`/api/instances/${id}/restart`, { method: 'POST' })
    setActionLoading(null)
    if (!res.ok) {
      const body = await res.json() as { detail?: string }
      show(body.detail ?? `Erro ao reiniciar "${name}".`, 'error')
      return
    }
    show(`"${name}" reiniciada com sucesso.`, 'success')
    router.refresh()
  }, [router, show])

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!confirm(`Excluir a instância "${name}"? Esta ação não pode ser desfeita.`)) return
    setActionLoading(id)
    const res = await fetch(`/api/instances/${id}`, { method: 'DELETE' })
    setActionLoading(null)
    if (!res.ok) {
      const body = await res.json() as { detail?: string }
      show(body.detail ?? `Erro ao excluir "${name}".`, 'error')
      return
    }
    show(`"${name}" excluída com sucesso.`, 'success')
    router.refresh()
  }, [router, show])

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Header buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => { setInviteEmail(''); setInviteOpen(true) }}
          className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          Criar Acesso
        </button>
        <button
          onClick={() => setEditOpen(true)}
          className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Editar
        </button>
      </div>

      {/* Instances section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Instâncias</h3>
          <button
            onClick={openAddModal}
            className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            + Adicionar Instância
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Session ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Criado em</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {instances.map(inst => (
                <tr key={inst.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{inst.display_name}</td>
                  <td className="px-4 py-3"><StatusBadge status={inst.status} /></td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs truncate max-w-[200px]">
                    {inst.wpp_session_id ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(inst.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => void handleRestart(inst.id, inst.display_name)}
                        disabled={actionLoading === inst.id}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors disabled:opacity-40"
                      >
                        {actionLoading === inst.id ? '...' : 'Reiniciar'}
                      </button>
                      <button
                        onClick={() => void handleDelete(inst.id, inst.display_name)}
                        disabled={actionLoading === inst.id}
                        className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors disabled:opacity-40"
                      >
                        {actionLoading === inst.id ? '...' : 'Excluir'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {instances.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    Nenhuma instância cadastrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit tenant modal */}
      {editOpen && (
        <Modal
          title="Editar Cliente"
          subtitle="Atualize os dados do tenant."
          onClose={() => !editLoading && setEditOpen(false)}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do cliente <span className="text-red-500">*</span>
              </label>
              <input type="text" value={editForm.name} onChange={setEditField('name')}
                required className={inputClass()} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email de contato <span className="text-red-500">*</span>
              </label>
              <input type="email" value={editForm.primary_contact_email}
                onChange={setEditField('primary_contact_email')}
                required className={inputClass()} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
              <select value={editForm.plan_id} onChange={setEditField('plan_id')}
                className={inputClass('bg-white')}>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>{planLabel(p)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={editForm.status} onChange={setEditField('status')}
                className={inputClass('bg-white')}>
                <option value="active">Ativo</option>
                <option value="suspended">Suspenso</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditOpen(false)} disabled={editLoading}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40">
                Cancelar
              </button>
              <button type="submit" disabled={editLoading}
                className="flex-1 bg-green-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                {editLoading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add instance modal */}
      {addOpen && (
        <Modal
          title="Adicionar Instância"
          subtitle="Crie uma nova instância WhatsApp para este tenant."
          onClose={() => !addLoading && setAddOpen(false)}
        >
          <form onSubmit={handleAddInstance} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da instância <span className="text-red-500">*</span>
              </label>
              <input type="text" value={instanceForm.display_name}
                onChange={setInstanceField('display_name')}
                placeholder="Ex: Suporte Principal"
                required className={inputClass()} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session ID (WPP Connect)
              </label>
              <input type="text" value={instanceForm.wpp_session_id}
                onChange={setInstanceField('wpp_session_id')}
                required className={inputClass('font-mono text-xs')} />
              <p className="text-xs text-gray-400 mt-1">
                Auto-gerado. Edite apenas se necessário.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setAddOpen(false)} disabled={addLoading}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40">
                Cancelar
              </button>
              <button type="submit" disabled={addLoading}
                className="flex-1 bg-green-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                {addLoading ? 'Criando...' : 'Criar Instância'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Invite modal */}
      {inviteOpen && (
        <Modal
          title="Criar Acesso ao Cliente"
          subtitle={`Envie um convite por email para acessar o painel de "${tenant.name}".`}
          onClose={() => !inviteLoading && setInviteOpen(false)}
        >
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email do cliente <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="cliente@empresa.com"
                required
                autoFocus
                className={inputClass()}
              />
              <p className="text-xs text-gray-400 mt-1">
                O cliente receberá um email com link para definir a senha e acessar o painel.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setInviteOpen(false)} disabled={inviteLoading}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40">
                Cancelar
              </button>
              <button type="submit" disabled={inviteLoading}
                className="flex-1 bg-green-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                {inviteLoading ? 'Enviando...' : 'Enviar Convite'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </>
  )
}
