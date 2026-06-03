-- ============================================================================
-- GRANT script — run once in Supabase SQL Editor (or via supabase db push).
--
-- WHY THIS IS NEEDED:
-- Tables created via raw SQL migrations do NOT receive automatic GRANTs.
-- PostgreSQL evaluates table-level permissions BEFORE RLS policies.
-- Without these GRANTs, every query from the `authenticated` and `anon` roles
-- returns "permission denied for table X" — the Supabase client surfaces this
-- as data: null / empty array with no useful error message.
--
-- ROLES:
--   authenticated  — Supabase users logged in with the anon key + JWT
--   anon           — unauthenticated requests (blocked by our middleware anyway)
--   service_role   — server-side service key; bypasses RLS but still needs GRANT
-- ============================================================================

-- ── Schema visibility ────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;

-- ── Table-level GRANTs ───────────────────────────────────────────────────────
-- RLS policies defined in migrations 001–014 act as the second layer of
-- access control on top of these GRANTs.

-- plans — read by any authenticated user (for dropdowns etc.); managed by admins
GRANT SELECT                        ON TABLE public.plans TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.plans TO service_role;

-- tenants — clients read own row; admins manage all
GRANT SELECT, UPDATE               ON TABLE public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenants TO service_role;

-- profiles — users read/update own row; admins manage all
GRANT SELECT, UPDATE               ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;

-- instances — clients read/update own tenant's rows; admins manage all
GRANT SELECT, UPDATE               ON TABLE public.instances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.instances TO service_role;

-- instance_notification_configs — clients read own; admins manage all
GRANT SELECT                        ON TABLE public.instance_notification_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.instance_notification_configs TO service_role;

-- event_logs — clients read own tenant's logs; written only by service role
GRANT SELECT                        ON TABLE public.event_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.event_logs TO service_role;

-- dispatch_events — clients read own; written only by service role
GRANT SELECT                        ON TABLE public.dispatch_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.dispatch_events TO service_role;

-- alert_windows — internal only; no direct access needed for authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.alert_windows TO service_role;

-- alert_deliveries — internal only; no direct access needed for authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.alert_deliveries TO service_role;

-- ── Sequence GRANTs (needed for INSERT with generated UUIDs) ─────────────────
-- gen_random_uuid() doesn't use sequences, but other default functions might.
-- Granting broadly here is safe and avoids future surprises.

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Ensure future sequences created in this schema also inherit these grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;

-- ── Future tables — apply grants automatically ───────────────────────────────
-- Any table created in public schema after this migration will get these grants.

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO authenticated;
