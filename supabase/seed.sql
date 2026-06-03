-- Plans
INSERT INTO public.plans (name, max_instances, description) VALUES
  ('basic',      1,  'Plan básico: 1 instância WhatsApp'),
  ('pro',        5,  'Plan profissional: até 5 instâncias'),
  ('enterprise', -1, 'Plan enterprise: instâncias ilimitadas')
ON CONFLICT (name) DO NOTHING;

-- Test tenant
INSERT INTO public.tenants (name, status, plan_id, primary_contact_email)
SELECT 'Acme Corp', 'active', id, 'contato@acme.com'
FROM public.plans WHERE name = 'pro'
ON CONFLICT DO NOTHING;

-- Note: Admin and client users are created via Supabase Auth dashboard or CLI.
-- After creating users, set app_metadata via Supabase dashboard:
--   Admin: { "role": "admin" }
--   Client: { "role": "client", "tenant_id": "<acme-tenant-uuid>" }
