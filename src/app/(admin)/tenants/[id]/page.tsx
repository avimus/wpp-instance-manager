import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TenantDetailActions } from '@/components/admin/TenantDetailActions'
import type { TenantStatus } from '@/lib/supabase/types'

type TenantWithPlan = {
  id: string
  name: string
  status: TenantStatus
  plan_id: string
  primary_contact_email: string
  plan: { name: string; max_instances: number } | null
}

export const dynamic = 'force-dynamic'

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  const svc = createServiceClient()

  const [
    { data: tenantRaw },
    { data: plans },
    { data: instances },
  ] = await Promise.all([
    svc
      .from('tenants')
      .select('id, name, primary_contact_email, status, plan_id, plan:plans(id, name, max_instances)')
      .eq('id', params.id)
      .single(),
    svc
      .from('plans')
      .select('id, name, max_instances')
      .order('max_instances'),
    svc
      .from('instances')
      .select('id, display_name, status, wpp_session_id, created_at')
      .eq('tenant_id', params.id)
      .order('created_at', { ascending: false }),
  ])

  // Cast needed because placeholder types lack relationship definitions for the join
  const tenant = tenantRaw as unknown as TenantWithPlan | null
  if (!tenant) notFound()

  const plan = tenant.plan
  const statusLabel = tenant.status === 'active' ? 'Ativo' : 'Suspenso'
  const statusColor = tenant.status === 'active' ? 'text-green-700' : 'text-red-600'

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/tenants" className="hover:text-gray-700 transition-colors">
          Clientes
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{tenant.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{tenant.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{tenant.primary_contact_email}</p>
        </div>
        {/* Edit button rendered by client component */}
        <TenantDetailActions
          tenant={{
            id: tenant.id,
            name: tenant.name,
            primary_contact_email: tenant.primary_contact_email,
            status: tenant.status,
            plan_id: tenant.plan_id,
          }}
          plans={plans ?? []}
          instances={instances ?? []}
        />
      </div>

      {/* Tenant info card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Dados do cliente</h3>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-gray-500">Status</dt>
            <dd className={`font-medium ${statusColor}`}>{statusLabel}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Plano</dt>
            <dd className="font-medium text-gray-900 capitalize">
              {plan?.name ?? '—'}
              {plan && (
                <span className="text-gray-400 font-normal ml-1">
                  ({plan.max_instances === -1 ? 'ilimitado' : `${plan.max_instances} inst.`})
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Email de contato</dt>
            <dd className="text-gray-900">{tenant.primary_contact_email}</dd>
          </div>
          <div>
            <dt className="text-gray-500">ID interno</dt>
            <dd className="font-mono text-xs text-gray-400">{tenant.id}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
