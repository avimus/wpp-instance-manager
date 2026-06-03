-- Enable Supabase Realtime CDC on the instances table (status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.instances;
