import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Errors, ok } from '@/lib/api-response'

export async function GET() {
  // ── env guard ──────────────────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('[/api/plans] Missing env vars:', {
      NEXT_PUBLIC_SUPABASE_URL:    supabaseUrl  ? 'SET' : 'UNDEFINED',
      SUPABASE_SERVICE_ROLE_KEY:   serviceKey   ? 'SET' : 'UNDEFINED',
    })
    return Errors.internal('Server misconfiguration: missing Supabase credentials')
  }

  // ── auth ───────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError) {
    console.error('[/api/plans] Auth error:', authError.message)
    return Errors.unauthorized()
  }
  if (!user) return Errors.unauthorized()
  if (user.app_metadata?.role !== 'admin') return Errors.forbidden()

  // ── query ──────────────────────────────────────────────────────────────────
  const svc = createServiceClient()
  const { data, error } = await svc
    .from('plans')
    .select('id, name, max_instances, description')
    .order('max_instances')

  console.log('[/api/plans] query result:', {
    count: data?.length ?? null,
    error: error ? { code: error.code, message: error.message, hint: (error as { hint?: string }).hint } : null,
  })

  if (error) {
    return Errors.internal(`Supabase error: ${error.message}`)
  }

  return ok(data)
}
