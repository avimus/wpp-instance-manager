CREATE TABLE public.instance_notification_configs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
  channel     text NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  recipient   text NOT NULL,
  is_global   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instance_id, channel, recipient)
);

CREATE INDEX idx_notification_configs_instance_id ON public.instance_notification_configs(instance_id);

ALTER TABLE public.instance_notification_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_configs_client_read_own" ON public.instance_notification_configs
  FOR SELECT USING (
    instance_id IN (
      SELECT id FROM public.instances
      WHERE tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid)
    )
  );

CREATE POLICY "notif_configs_admin_all" ON public.instance_notification_configs
  FOR ALL USING ((auth.jwt() ->> 'role') = 'admin');
