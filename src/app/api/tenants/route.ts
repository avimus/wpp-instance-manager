import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Errors, ok, created } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const CreateTenantSchema = z.object({
  name: z.string().min(1).max(200),
  plan_id: z.string().uuid(),
  primary_contact_email: z.string().email(),
})

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Errors.unauthorized()
  if (user.app_metadata?.role !== 'admin') return Errors.forbidden()

  const svc = createServiceClient()
  const { data, error } = await svc
    .from('tenants')
    .select('id, name, status, primary_contact_email, created_at, plan:plans(id, name, max_instances)')
    .order('created_at', { ascending: false })

  if (error) {
    logger.error({ error: error.message }, 'GET /api/tenants failed')
    return Errors.internal()
  }

  return ok(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Errors.unauthorized()
  if (user.app_metadata?.role !== 'admin') return Errors.forbidden()

  const body = await request.json() as unknown
  const parsed = CreateTenantSchema.safeParse(body)
  if (!parsed.success) return Errors.validation(parsed.error.message)

  const svc = createServiceClient()
  const { data, error } = await svc
    .from('tenants')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    logger.error({ error }, 'POST /api/tenants failed')
    return Errors.internal()
  }

  return created(data)
}
