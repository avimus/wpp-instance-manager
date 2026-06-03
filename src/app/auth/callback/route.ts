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
    // Explicit error from Supabase (e.g. expired or already-used link)
    const errorParam = searchParams.get('error')
    if (errorParam) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(errorParam)}`,
      )
    }

    // Implicit flow: Supabase placed tokens in the URL hash (e.g. invite emails).
    // The hash is never sent to the server, so we serve a minimal HTML page that
    // reads window.location.hash client-side and forwards it to /auth/confirm,
    // which is a Client Component that can call supabase.auth.setSession().
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Redirecionando...</title></head>
<body>
<script>
  // Forward hash tokens to /auth/confirm as a hash fragment so they stay client-side.
  location.replace('/auth/confirm' + location.hash)
</script>
<p>Redirecionando...</p>
</body>
</html>`
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
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

  // If the caller explicitly specified where to go (e.g. password reset), honour it.
  // For password-reset redirects to set-password, append mode=reset so the page
  // knows not to redirect away users who already have password_set=true.
  if (explicitNext) {
    const dest = explicitNext === '/auth/set-password'
      ? '/auth/set-password?mode=reset'
      : explicitNext
    return NextResponse.redirect(`${origin}${dest}`)
  }

  // First-time invite: password not yet set → force password setup
  const passwordSet = data.user?.app_metadata?.password_set === true
  if (!passwordSet) {
    return NextResponse.redirect(`${origin}/auth/set-password`)
  }

  // Returning user → go to dashboard (role-based view handled by the page)
  return NextResponse.redirect(`${origin}/dashboard`)
}
