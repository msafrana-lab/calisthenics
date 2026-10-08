-- Server-assigned change timestamp, used by the app to pull changes
-- regardless of the device clock that wrote the row.
create or replace function public.touch_server_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

alter table public.profiles add column server_updated_at timestamptz not null default now();
alter table public.workout_sessions add column server_updated_at timestamptz not null default now();
alter table public.set_logs add column server_updated_at timestamptz not null default now();
alter table public.ladder_progress add column server_updated_at timestamptz not null default now();
alter table public.health_samples add column server_updated_at timestamptz not null default now();

alter table public.profiles alter column user_id set default auth.uid();
alter table public.health_samples alter column user_id set default auth.uid();

create trigger touch before insert or update on public.profiles for each row execute function public.touch_server_updated_at();
create trigger touch before insert or update on public.workout_sessions for each row execute function public.touch_server_updated_at();
create trigger touch before insert or update on public.set_logs for each row execute function public.touch_server_updated_at();
create trigger touch before insert or update on public.ladder_progress for each row execute function public.touch_server_updated_at();
create trigger touch before insert or update on public.health_samples for each row execute function public.touch_server_updated_at();

create index workout_sessions_user_srv on public.workout_sessions (user_id, server_updated_at);
create index set_logs_user_srv on public.set_logs (user_id, server_updated_at);
create index ladder_progress_user_srv on public.ladder_progress (user_id, server_updated_at);
create index health_samples_user_srv on public.health_samples (user_id, server_updated_at);
