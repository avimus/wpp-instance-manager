CREATE TABLE public.alert_windows (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id  uuid NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL DEFAULT now(),
  window_end   timestamptz NOT NULL DEFAULT now() + interval '30 minutes',
  alert_sent   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instance_id, window_start)
);

CREATE INDEX idx_alert_windows_instance_id ON public.alert_windows(instance_id);
CREATE INDEX idx_alert_windows_window_end  ON public.alert_windows(window_end);

ALTER TABLE public.alert_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alert_windows_admin_all" ON public.alert_windows
  FOR ALL USING ((auth.jwt() ->> 'role') = 'admin');
