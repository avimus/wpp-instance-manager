import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Errors, ok } from '@/lib/api-response'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Errors.unauthorized()

  const role = user.app_metadata?.role as string
  const tenantId = user.app_metadata?.tenant_id as string | undefined

  // Verify the requested instance is accessible to this user before returning logs.
  // Using service client to fetch the instance so we can do an explicit access check
  // rather than relying on RLS silently returning empty.
  const svc = createServiceClient()
  const { data: instance } = await svc
    .from('instances')
    .select('id, tenant_id')
    .eq('id', params.id)
    .single()

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
  if (severity) query = query.eq('severity', severity)

  const { data, error, count } = await query

  if (error) return Errors.internal(error.message)

  return ok({ data, total: count ?? 0, limit, offset })
}
