-- Requires pg_cron extension (enable in Supabase dashboard under Database > Extensions)
-- Archives event_logs older than 90 days weekly on Sundays at 02:00 UTC

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'archive-old-event-logs',
  '0 2 * * 0',
  $$
    DELETE FROM public.event_logs
    WHERE created_at < now() - interval '90 days';
  $$
);
