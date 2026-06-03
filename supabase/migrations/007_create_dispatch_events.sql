CREATE TABLE public.dispatch_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id      uuid NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  recipient_count  int NOT NULL DEFAULT 0,
  delivery_status  text NOT NULL
                   CHECK (delivery_status IN ('success', 'partial', 'failed', 'rejected')),
  error_code       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dispatch_events_instance_id ON public.dispatch_events(instance_id);
CREATE INDEX idx_dispatch_events_tenant_id   ON public.dispatch_events(tenant_id);
CREATE INDEX idx_dispatch_events_created_at  ON public.dispatch_events(created_at DESC);

ALTER TABLE public.dispatch_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dispatch_events_client_read_own" ON public.dispatch_events
  FOR SELECT USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));

CREATE POLICY "dispatch_events_admin_all" ON public.dispatch_events
  FOR ALL USING ((auth.jwt() ->> 'role') = 'admin');
