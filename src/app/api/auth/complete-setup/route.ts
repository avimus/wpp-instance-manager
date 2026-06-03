import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Errors, ok } from '@/lib/api-response'
import { logger } from '@/lib/logger'

// Called after the user successfully sets a password for the first time (or resets it).
// Sets app_metadata.password_set = true so the middleware stops forcing them to /auth/set-password.
// Supabase merges app_metadata, so existing role + tenant_id are preserved.

export async function POST() {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) return Errors.unauthorized()

  const svc = createServiceClient()
  const { error } = await svc.auth.admin.updateUserById(user.id, {
    app_metadata: { password_set: true },
  })

  if (error) {
    logger.error({ error: error.message, userId: user.id }, 'complete-setup failed')
    return Errors.internal('Não foi possível finalizar o cadastro.')
  }

  return ok({ password_set: true })
}
