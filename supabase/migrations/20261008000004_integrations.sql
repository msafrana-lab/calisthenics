-- Ride and weigh-in details from Strava and Withings.
alter table public.health_samples add column external_id text;
alter table public.health_samples add column details jsonb;

-- Connections to Strava and Withings. Tokens are readable only by the server
-- (service role); the app can see the connection status and disconnect.
create table public.integrations (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('strava', 'withings')),
  external_user_id text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_error text,
  primary key (user_id, provider)
);
alter table public.integrations enable row level security;
create policy "own status" on public.integrations for select to authenticated using ((select auth.uid()) = user_id);
create policy "own disconnect" on public.integrations for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.integrations from anon, authenticated;
grant select (provider, connected_at, last_synced_at, last_error) on public.integrations to authenticated;
grant delete on public.integrations to authenticated;

-- Server-only settings (shared secret for the scheduled sync).
create table public.app_config (key text primary key, value text not null);
alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;
insert into public.app_config (key, value) values ('cron_secret', encode(extensions.gen_random_bytes(32), 'hex'));
