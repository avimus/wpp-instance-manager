import { createClient, createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { NewTenantModal } from '@/components/admin/NewTenantModal'

export const dynamic = 'force-dynamic'

export default async function TenantsPage() {
  const supabase = createClient()
  const svc = createServiceClient()

  type TenantRow = { id: string; name: string; status: string; primary_contact_email: string; plan: { name: string; max_instances: number } | null }

  const [
    { data: tenantsRaw },
    { data: plans, error: plansError },
  ] = await Promise.all([
    supabase
      .from('tenants')
      .select('id, name, status, primary_contact_email, plan:plans(name, max_instances)')
      .order('created_at', { ascending: false }),
    svc
      .from('plans')
      .select('id, name, max_instances')
      .order('max_instances'),
  ])

  const tenants = tenantsRaw as unknown as TenantRow[] | null

  if (plansError) {
    console.error('[TenantsPage] plans query failed:', {
      code:    plansError.code,
      message: plansError.message,
      hint:    (plansError as { hint?: string }).hint ?? null,
    })
  } else {
    console.log('[TenantsPage] plans query ok — count:', plans?.length ?? 0)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
          <p className="text-sm text-gray-500 mt-0.5">{tenants?.length ?? 0} cadastrados</p>
        </div>
        <NewTenantModal plans={plans ?? []} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Plano</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email de contato</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(tenants ?? []).map(t => {
              const plan = t.plan
              return (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link href={`/tenants/${t.id}`} className="hover:text-green-700 hover:underline transition-colors">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${t.status === 'active' ? 'text-green-700' : 'text-red-600'}`}>
                      {t.status === 'active' ? 'Ativo' : 'Suspenso'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">
                    {plan?.name}{' '}
                    <span className="text-gray-400">
                      ({plan?.max_instances === -1 ? '∞' : plan?.max_instances} inst.)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{t.primary_contact_email}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/tenants/${t.id}`}
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                    >
                      Detalhes
                    </Link>
                  </td>
                </tr>
              )
            })}
            {!tenants?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  Nenhum cliente cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
