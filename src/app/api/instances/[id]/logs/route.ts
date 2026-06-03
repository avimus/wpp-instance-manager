import { createServiceClient } from '@/lib/supabase/server'
import { getUserCtx } from '@/lib/user-context'
import { Errors, ok } from '@/lib/api-response'
import type { Severity } from '@/lib/supabase/types'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const ctx = await getUserCtx()
  if (!ctx) return Errors.unauthorized()
  const { role, tenantId } = ctx

  // Verify the requested instance is accessible to this user before returning logs.
  // Using service client to fetch the instance so we can do an explicit access check
  // rather than relying on RLS silently returning empty.
  const svc = createServiceClient()
  const { data: instanceRaw } = await svc
    .from('instances')
    .select('id, tenant_id')
    .eq('id', params.id)
    .single()
  const instance = instanceRaw as { id: string; tenant_id: string } | null

  if (!instance) return Errors.notFound('Instance not found')
  if (role !== 'admin' && instance.tenant_id !== tenantId) return Errors.forbidden()

  const url = new URL(request.url)
  const from = url.searchParams.get('from') ?? new Date(Date.now() - 30 * 86400_000).toISOString()
  const to = url.searchParams.get('to') ?? new Date().toISOString()
  const type = url.searchParams.get('type')
  const severity = url.searchParams.get('severity')
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200)
  const offset = parseInt(url.searchParams.get('offset') ?? '0')

  let query = svc
    .from('event_logs')
    .select('*', { count: 'exact' })
    .eq('instance_id', params.id)
    .gte('created_at', from)
    .lte('created_at', to)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type) query = query.eq('event_type', type)
  if (severity) query = query.eq('severity', severity as Severity)

  const { data, error, count } = await query

  if (error) return Errors.internal(error.message)

  return ok({ data, total: count ?? 0, limit, offset })
}
