-- Seed default plans so they exist after every fresh migration run.
-- ON CONFLICT ensures this is safe to re-apply.
INSERT INTO public.plans (name, max_instances, description) VALUES
  ('basic',      1,  'Plano básico: 1 instância WhatsApp'),
  ('pro',        5,  'Plano profissional: até 5 instâncias'),
  ('enterprise', -1, 'Plano enterprise: instâncias ilimitadas')
ON CONFLICT (name) DO NOTHING;
