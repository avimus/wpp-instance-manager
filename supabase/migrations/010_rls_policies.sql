-- Service role bypass: allow server-side operations without RLS restrictions
-- (Supabase service role key bypasses RLS automatically — this migration
-- documents the intent and adds the service-role policy explicitly)

-- Instances: service role full access (used by webhook handler and WPP Service)
CREATE POLICY "instances_service_role" ON public.instances
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "event_logs_service_role" ON public.event_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "dispatch_events_service_role" ON public.dispatch_events
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "alert_windows_service_role" ON public.alert_windows
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "alert_deliveries_service_role" ON public.alert_deliveries
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "notif_configs_service_role" ON public.instance_notification_configs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "profiles_service_role" ON public.profiles
  FOR ALL USING (auth.role() = 'service_role');
