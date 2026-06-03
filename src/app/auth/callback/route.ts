import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

// Handles Supabase magic-link / invite / password-reset callbacks.
// Supabase redirects here after the user clicks the email link:
//   ${APP_URL}/auth/callback?code=<PKCE code>[&next=<path>]
//
// If `next` is explicitly provided in the URL, use it directly (e.g. password reset
// sends next=/auth/set-password so the user lands on the set-password page).
// Otherwise, decide based on whether the user has already set a password.

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  // `next` is only set when explicitly passed (e.g. from resetPasswordForEmail's redirectTo)
  const explicitNext = searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        },
      },
    },
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message)
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  // If the caller explicitly specified where to go (e.g. password reset), honour it
  if (explicitNext) {
    return NextResponse.redirect(`${origin}${explicitNext}`)
  }

  // First-time invite: password not yet set → force password setup
  const passwordSet = data.user?.app_metadata?.password_set === true
  if (!passwordSet) {
    return NextResponse.redirect(`${origin}/auth/set-password`)
  }

  // Returning user → go to dashboard (role-based view handled by the page)
  return NextResponse.redirect(`${origin}/dashboard`)
}
