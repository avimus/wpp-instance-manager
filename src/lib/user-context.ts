import { createClient } from '@/lib/supabase/server'

export type UserCtx = {
  userId: string
  email: string
  role: string
  tenantId: string | undefined
}

// Returns the resolved auth context for the current server request.
//
// tenant_id source priority:
//   1. profiles.tenant_id  — always populated; authoritative for ALL users
//   2. app_metadata.tenant_id — only present when users are created via invite API
//
// role source priority:
//   1. app_metadata.role — admin-controlled, user-writable blocked by Supabase
//   2. profiles.role — fallback for edge cases
export async function getUserCtx(): Promise<UserCtx | null> {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  return {
    userId: user.id,
    email: user.email ?? '',
    role: (user.app_metadata?.role ?? profile?.role ?? '') as string,
    tenantId: (profile?.tenant_id ?? user.app_metadata?.tenant_id) as string | undefined,
  }
}
