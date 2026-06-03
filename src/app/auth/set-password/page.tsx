import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SetPasswordForm } from './SetPasswordForm'

export default async function SetPasswordPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Not authenticated → send to login (middleware also handles this, belt + suspenders)
  if (!user) redirect('/login')

  // User already has a password set AND is not arriving from a reset flow
  // (reset flows come via /auth/callback?next=/auth/set-password so they always land here
  // intentionally — the form is valid for both first-time setup and reset)

  return <SetPasswordForm />
}
