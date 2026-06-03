-- Fix: all admin RLS policies were reading (auth.jwt() ->> 'role') which returns
-- the Supabase database role ('authenticated'), never 'admin'.
-- The custom role lives under app_metadata, so the correct path is:
--   auth.jwt() -> 'app_metadata' ->> 'role'
-- Likewise for tenant_id:
--   auth.jwt() -> 'app_metadata' ->> 'tenant_id'

-- Helper function used by all policies for readability and consistency.
CREATE OR REPLACE FUNCTION public.jwt_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() ->> 'role'          -- fallback for service-role direct queries
  )
$$;

CREATE OR REPLACE FUNCTION public.jwt_tenant_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
$$;

-- ── plans ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "plans_admin_all" ON public.plans;
CREATE POLICY "plans_admin_all" ON public.plans
  FOR ALL USING (public.jwt_role() = 'admin');

-- ── tenants ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenants_client_read_own" ON public.tenants;
DROP POLICY IF EXISTS "tenants_admin_all"        ON public.tenants;

CREATE POLICY "tenants_client_read_own" ON public.tenants
  FOR SELECT USING (id = public.jwt_tenant_id());

CREATE POLICY "tenants_admin_all" ON public.tenants
  FOR ALL USING (public.jwt_role() = 'admin');

-- ── profiles ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL USING (public.jwt_role() = 'admin');

-- ── instances ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "instances_client_read_own_tenant"   ON public.instances;
DROP POLICY IF EXISTS "instances_client_update_own_tenant" ON public.instances;
DROP POLICY IF EXISTS "instances_admin_all"                ON public.instances;

CREATE POLICY "instances_client_read_own_tenant" ON public.instances
  FOR SELECT USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "instances_client_update_own_tenant" ON public.instances
  FOR UPDATE USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "instances_admin_all" ON public.instances
  FOR ALL USING (public.jwt_role() = 'admin');

-- ── instance_notification_configs ────────────────────────────────────────────
DROP POLICY IF EXISTS "notif_configs_client_read_own" ON public.instance_notification_configs;
DROP POLICY IF EXISTS "notif_configs_admin_all"       ON public.instance_notification_configs;

CREATE POLICY "notif_configs_client_read_own" ON public.instance_notification_configs
  FOR SELECT USING (
    instance_id IN (
      SELECT id FROM public.instances WHERE tenant_id = public.jwt_tenant_id()
    )
  );

CREATE POLICY "notif_configs_admin_all" ON public.instance_notification_configs
  FOR ALL USING (public.jwt_role() = 'admin');

-- ── event_logs ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "event_logs_client_read_own" ON public.event_logs;
DROP POLICY IF EXISTS "event_logs_admin_all"        ON public.event_logs;

CREATE POLICY "event_logs_client_read_own" ON public.event_logs
  FOR SELECT USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "event_logs_admin_all" ON public.event_logs
  FOR ALL USING (public.jwt_role() = 'admin');

-- ── dispatch_events ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "dispatch_events_client_read_own" ON public.dispatch_events;
DROP POLICY IF EXISTS "dispatch_events_admin_all"        ON public.dispatch_events;

CREATE POLICY "dispatch_events_client_read_own" ON public.dispatch_events
  FOR SELECT USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "dispatch_events_admin_all" ON public.dispatch_events
  FOR ALL USING (public.jwt_role() = 'admin');

-- ── alert_windows / alert_deliveries ─────────────────────────────────────────
DROP POLICY IF EXISTS "alert_windows_admin_all"    ON public.alert_windows;
DROP POLICY IF EXISTS "alert_deliveries_admin_all" ON public.alert_deliveries;

CREATE POLICY "alert_windows_admin_all" ON public.alert_windows
  FOR ALL USING (public.jwt_role() = 'admin');

CREATE POLICY "alert_deliveries_admin_all" ON public.alert_deliveries
  FOR ALL USING (public.jwt_role() = 'admin');
