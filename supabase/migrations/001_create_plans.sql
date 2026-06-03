CREATE TABLE public.plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  max_instances int NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Only admins can manage plans; anyone authenticated can read
CREATE POLICY "plans_read_authenticated" ON public.plans
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "plans_admin_all" ON public.plans
  FOR ALL USING ((auth.jwt() ->> 'role') = 'admin');
