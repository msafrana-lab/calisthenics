create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Import new rides and weigh-ins every 3 hours (minute 17 to avoid the top of the hour).
select cron.schedule(
  'sync-integrations',
  '17 */3 * * *',
  $$
  select net.http_post(
    url := 'https://zagilnkbufgennesxuxp.supabase.co/functions/v1/integrations/sync',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from public.app_config where key = 'cron_secret')
    )
  );
  $$
);
