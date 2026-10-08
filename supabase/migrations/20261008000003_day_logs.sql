-- One row per calendar day: cycling intensity and the next-morning joint check-in.
create table public.day_logs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  cycling text check (cycling in ('none', 'easy', 'hard')),
  morning jsonb,
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
create index day_logs_user_srv on public.day_logs (user_id, server_updated_at);
alter table public.day_logs enable row level security;
create policy "own rows" on public.day_logs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create trigger touch before insert or update on public.day_logs for each row execute function public.touch_server_updated_at();
