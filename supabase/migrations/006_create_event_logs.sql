CREATE TABLE public.event_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type  text NOT NULL,
  severity    text NOT NULL DEFAULT 'info'
              CHECK (severity IN ('info', 'warning', 'error')),
  description text NOT NULL,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_logs_instance_id ON public.event_logs(instance_id);
CREATE INDEX idx_event_logs_tenant_id   ON public.event_logs(tenant_id);
CREATE INDEX idx_event_logs_created_at  ON public.event_logs(created_at DESC);
CREATE INDEX idx_event_logs_event_type  ON public.event_logs(event_type);

ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_logs_client_read_own" ON public.event_logs
  FOR SELECT USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));

CREATE POLICY "event_logs_admin_all" ON public.event_logs
  FOR ALL USING ((auth.jwt() ->> 'role') = 'admin');
