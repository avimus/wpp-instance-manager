CREATE TABLE public.alert_deliveries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  window_id     uuid NOT NULL REFERENCES public.alert_windows(id) ON DELETE CASCADE,
  instance_id   uuid NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
  channel       text NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  recipient     text NOT NULL,
  status        text NOT NULL CHECK (status IN ('sent', 'failed', 'bounced')),
  trigger_event text NOT NULL CHECK (trigger_event IN ('offline', 'recovered')),
  error         text,
  sent_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_alert_deliveries_window_id   ON public.alert_deliveries(window_id);
CREATE INDEX idx_alert_deliveries_instance_id ON public.alert_deliveries(instance_id);

ALTER TABLE public.alert_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alert_deliveries_admin_all" ON public.alert_deliveries
  FOR ALL USING ((auth.jwt() ->> 'role') = 'admin');
