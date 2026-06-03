import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { InstancesTable } from '@/components/admin/InstancesTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { InstanceStatus } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

// ── Shared nav shell ──────────────────────────────────────────────────────────

function AdminNav({ email }: { email: string }) {
  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-lg font-bold text-green-700">WPP Manager</h1>
        <p className="text-xs text-gray-500 mt-0.5">Painel Admin</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700">
          Dashboard
        </Link>
        <Link href="/tenants" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors">
          Clientes
        </Link>
      </nav>
      <div className="p-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 truncate">{email}</p>
      </div>
    </aside>
  )
}

function ClientNav({ email }: { email: string }) {
  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-lg font-bold text-green-700">WPP Manager</h1>
        <p className="text-xs text-gray-500 mt-0.5">Meu Painel</p>
      </div>
      <nav className="flex-1 p-4">
        <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700">
          Minhas Instâncias
        </Link>
      </nav>
      <div className="p-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 truncate">{email}</p>
      </div>
    </aside>
  )
}

// ── Admin dashboard view ──────────────────────────────────────────────────────

async function AdminDashboard() {
  const svc = createServiceClient()

  const [{ data: instances }, { count: tenantCount }, { count: offlineCount }] =
    await Promise.all([
      svc
        .from('instances')
        .select('id, tenant_id, phone_number, display_name, status, last_seen_at, tenants(name)')
        .order('status')
        .order('created_at', { ascending: false }),
      svc.from('tenants').select('id', { count: 'exact', head: true }),
      svc
        .from('instances')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'offline'),
    ])

  const total = instances?.length ?? 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">Visão geral de todas as instâncias</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total de instâncias</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Instâncias offline</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{offlineCount ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Clientes</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{tenantCount ?? 0}</p>
        </div>
      </div>

      <InstancesTable
        initialInstances={instances ?? []}
        tenantId={null}
      />
    </div>
  )
}

// ── Client dashboard view ─────────────────────────────────────────────────────

async function ClientDashboard({ tenantId }: { tenantId: string }) {
  const supabase = createClient()

  const { data: instances } = await supabase
    .from('instances')
    .select('id, phone_number, display_name, status, last_seen_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Minhas Instâncias</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(instances ?? []).map(instance => (
          <Link
            key={instance.id}
            href={`/instancias/${instance.id}`}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <p className="font-semibold text-gray-900">{instance.display_name}</p>
              <StatusBadge status={instance.status as InstanceStatus} />
            </div>
            <p className="text-sm text-gray-500 font-mono">{instance.phone_number}</p>
            {instance.last_seen_at && (
              <p className="text-xs text-gray-400 mt-2">
                {new Date(instance.last_seen_at).toLocaleString('pt-BR')}
              </p>
            )}
            {instance.status === 'offline' && (
              <p className="text-xs text-green-600 font-medium mt-3">Clique para reconectar →</p>
            )}
          </Link>
        ))}
        {!instances?.length && (
          <p className="text-gray-400 col-span-3">Nenhuma instância encontrada para sua conta.</p>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = user.app_metadata?.role as string | undefined
  const tenantId = user.app_metadata?.tenant_id as string | undefined
  const email = user.email ?? ''

  return (
    <div className="min-h-screen flex bg-gray-50">
      {role === 'admin' ? <AdminNav email={email} /> : <ClientNav email={email} />}
      <main className="flex-1 p-8 overflow-auto">
        {role === 'admin'
          ? <AdminDashboard />
          : tenantId
            ? <ClientDashboard tenantId={tenantId} />
            : <p className="text-gray-500">Conta sem tenant associado. Contacte o suporte.</p>
        }
      </main>
    </div>
  )
}
