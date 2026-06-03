import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Errors, ok } from '@/lib/api-response'
import { z } from 'zod'

const Schema = z.object({
  configs: z.array(z.object({
    channel: z.enum(['email', 'whatsapp']),
    recipient: z.string().min(1),
    is_global: z.boolean().default(false),
  })),
})

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Errors.unauthorized()
  if (user.app_metadata?.role !== 'admin') return Errors.forbidden()

  const body = await request.json() as unknown
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return Errors.validation(parsed.error.message)

  const svc = createServiceClient()
  // Replace all configs atomically
  await svc.from('instance_notification_configs').delete().eq('instance_id', params.id)

  if (parsed.data.configs.length > 0) {
    const { error } = await svc.from('instance_notification_configs').insert(
      parsed.data.configs.map(c => ({ ...c, instance_id: params.id })),
    )
    if (error) return Errors.internal()
  }

  const { data } = await svc.from('instance_notification_configs').select('*').eq('instance_id', params.id)
  return ok(data)
}
