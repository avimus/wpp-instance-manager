CREATE TABLE public.tenants (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  status                text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'suspended')),
  plan_id               uuid NOT NULL REFERENCES public.plans(id),
  primary_contact_email text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_status ON public.tenants(status);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Clients read own tenant only
CREATE POLICY "tenants_client_read_own" ON public.tenants
  FOR SELECT USING (id = ((auth.jwt() ->> 'tenant_id')::uuid));

-- Admins have full access
CREATE POLICY "tenants_admin_all" ON public.tenants
  FOR ALL USING ((auth.jwt() ->> 'role') = 'admin');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
