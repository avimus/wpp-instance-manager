import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Errors, ok } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const InviteSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: Request, { params }: { params: { id: string } }) {
  // ── Auth check ─────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Errors.unauthorized()
  if (user.app_metadata?.role !== 'admin') return Errors.forbidden()

  // ── Input validation ────────────────────────────────────────────────────────
  const body = await request.json() as unknown
  const parsed = InviteSchema.safeParse(body)
  if (!parsed.success) return Errors.validation(parsed.error.message)
  const { email } = parsed.data

  // ── Verify tenant exists ────────────────────────────────────────────────────
  const svc = createServiceClient()
  const { data: tenant } = await svc
    .from('tenants')
    .select('id, name, status')
    .eq('id', params.id)
    .single()

  if (!tenant) return Errors.notFound('Tenant não encontrado')
  if (tenant.status !== 'active') return Errors.forbidden('Tenant suspenso')

  // ── Build redirect URL ──────────────────────────────────────────────────────
  // Must be listed in Supabase Auth > URL Configuration > Redirect URLs.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const redirectTo = `${appUrl}/auth/callback`

  // ── Send invite ─────────────────────────────────────────────────────────────
  // inviteUserByEmail creates the user and sends the email immediately.
  // The `data` field goes to user_metadata — useful for display but not JWT claims.
  const { data: invited, error: inviteError } = await svc.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo,
      data: { tenant_name: tenant.name },  // user_metadata (informational only)
    },
  )

  if (inviteError) {
    // "User already registered" is a common case — treat as a re-invite
    if (inviteError.message.includes('already been registered')) {
      logger.warn({ email, tenantId: params.id }, 'Invite sent to existing user')
      // Continue — updateUserById below will fix their app_metadata regardless
    } else {
      logger.error({ error: inviteError.message, email }, 'inviteUserByEmail failed')
      return Errors.internal(`Falha ao enviar convite: ${inviteError.message}`)
    }
  }

  const userId = invited?.user?.id

  if (!userId) {
    // User already exists — look them up by email to get the ID
    const { data: existingUsers } = await svc.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)
    if (!existingUser) {
      return Errors.internal('Usuário não encontrado após convite')
    }
    // Fall through with existingUser.id
    await setAppMetadataAndProfile(svc, existingUser.id, params.id)
  } else {
    await setAppMetadataAndProfile(svc, userId, params.id)
  }

  return ok({ message: `Convite enviado para ${email}` })
}

// Sets JWT app_metadata (role + tenant_id) and fixes the profile row.
// This must run AFTER inviteUserByEmail because:
//   1. inviteUserByEmail fires the on_auth_user_created trigger immediately
//   2. At that point app_metadata is not yet set, so profile.tenant_id is NULL
//   3. We correct it here with an explicit upsert
async function setAppMetadataAndProfile(
  svc: ReturnType<typeof createServiceClient>,
  userId: string,
  tenantId: string,
) {
  // Set JWT claims — these appear in every subsequent user JWT
  const { error: metaError } = await svc.auth.admin.updateUserById(userId, {
    app_metadata: { role: 'client', tenant_id: tenantId },
  })
  if (metaError) {
    logger.error({ error: metaError.message, userId }, 'updateUserById app_metadata failed')
  }

  // Fix the profile row (trigger may have created it with tenant_id=NULL)
  const { error: profileError } = await svc
    .from('profiles')
    .upsert(
      { id: userId, role: 'client', tenant_id: tenantId },
      { onConflict: 'id' },
    )
  if (profileError) {
    logger.error({ error: profileError.message, userId }, 'profile upsert failed')
  }
}
