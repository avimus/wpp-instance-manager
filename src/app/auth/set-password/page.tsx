import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SetPasswordForm } from './SetPasswordForm'

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: { mode?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Direct navigation by a user who already has a password → send to dashboard.
  // Reset-flow arrivals carry mode=reset (set by /auth/callback) and should see the form.
  const passwordSet = user.app_metadata?.password_set === true
  const isResetMode = searchParams.mode === 'reset'
  if (passwordSet && !isResetMode) redirect('/dashboard')

  return <SetPasswordForm />
}
