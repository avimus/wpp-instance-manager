CREATE TABLE public.instances (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  phone_number   text NOT NULL,
  display_name   text NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'online', 'offline', 'reconnecting')),
  session_data   text,
  last_seen_at   timestamptz,
  wpp_session_id text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, phone_number)
);

CREATE INDEX idx_instances_tenant_id ON public.instances(tenant_id);
CREATE INDEX idx_instances_status    ON public.instances(status);

ALTER TABLE public.instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "instances_client_read_own_tenant" ON public.instances
  FOR SELECT USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));

CREATE POLICY "instances_client_update_own_tenant" ON public.instances
  FOR UPDATE USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));

CREATE POLICY "instances_admin_all" ON public.instances
  FOR ALL USING ((auth.jwt() ->> 'role') = 'admin');

CREATE TRIGGER instances_updated_at
  BEFORE UPDATE ON public.instances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
