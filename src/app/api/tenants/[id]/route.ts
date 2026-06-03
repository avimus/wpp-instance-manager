import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Errors, ok } from '@/lib/api-response'
import { z } from 'zod'

const UpdateTenantSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  plan_id: z.string().uuid().optional(),
  primary_contact_email: z.string().email().optional(),
}).partial()

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Errors.unauthorized()
  if (user.app_metadata?.role !== 'admin') return Errors.forbidden()

  const svc = createServiceClient()
  const { data, error } = await svc
    .from('tenants')
    .select('*, plan:plans(id, name, max_instances)')
    .eq('id', params.id)
    .single()

  if (error || !data) return Errors.notFound('Tenant not found')
  return ok(data)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Errors.unauthorized()
  if (user.app_metadata?.role !== 'admin') return Errors.forbidden()

  const body = await request.json() as unknown
  const parsed = UpdateTenantSchema.safeParse(body)
  if (!parsed.success) return Errors.validation(parsed.error.message)

  const svc = createServiceClient()
  const { data, error } = await svc
    .from('tenants')
    .update(parsed.data)
    .eq('id', params.id)
    .select()
    .single()

  if (error || !data) return Errors.notFound('Tenant not found')
  return ok(data)
}
