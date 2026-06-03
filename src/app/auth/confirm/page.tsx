'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// Handles the implicit-flow callback from Supabase invite emails.
//
// Supabase places access_token + refresh_token in the URL hash, which servers
// never see. /auth/callback detects no ?code and redirects here preserving the
// hash. We parse the tokens and call setSession() so the SDK stores the session
// in cookies, then route the user based on whether they've set a password yet.

export default function ConfirmPage() {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function processHash() {
      const hash = window.location.hash.substring(1) // strip leading #
      const params = new URLSearchParams(hash)

      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (!accessToken || !refreshToken) {
        setError('Link inválido ou expirado.')
        setTimeout(() => router.replace('/login?error=session_expired'), 2500)
        return
      }

      const { data: { session }, error: sessionError } =
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })

      if (sessionError || !session) {
        setError('Não foi possível validar o link. Solicite um novo convite.')
        setTimeout(() => router.replace('/login?error=session_expired'), 2500)
        return
      }

      const passwordSet = session.user.app_metadata?.password_set === true
      router.replace(passwordSet ? '/dashboard' : '/auth/set-password')
    }

    void processHash()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">WPP Manager</h1>
        {error ? (
          <p className="text-sm text-red-600 mt-4">{error}</p>
        ) : (
          <p className="text-sm text-gray-500 mt-4">Verificando acesso...</p>
        )}
      </div>
    </main>
  )
}
