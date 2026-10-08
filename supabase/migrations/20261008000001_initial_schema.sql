-- Personal settings (one row per user)
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- One row per training session
create table public.workout_sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day_type text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  effort smallint check (effort between 0 and 10),
  notes text,
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);
create index workout_sessions_user_updated on public.workout_sessions (user_id, updated_at);

-- One row per performed set
create table public.set_logs (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id text not null,
  set_index smallint not null,
  reps smallint,
  seconds smallint,
  rir smallint check (rir between 0 and 10),
  pain smallint check (pain between 0 and 10),
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);
create index set_logs_user_updated on public.set_logs (user_id, updated_at);
create index set_logs_session on public.set_logs (session_id);

-- Current step on each progression ladder (e.g. push-up ladder step 3)
create table public.ladder_progress (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ladder_id text not null,
  step smallint not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, ladder_id)
);

-- Data imported from Apple Health (weight from Withings, indoor cycling workouts)
create table public.health_samples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('weight', 'cycling')),
  recorded_at timestamptz not null,
  value numeric not null,
  unit text not null,
  duration_s integer,
  energy_kcal numeric,
  source text,
  updated_at timestamptz not null default now(),
  unique (user_id, kind, recorded_at)
);
create index health_samples_user_updated on public.health_samples (user_id, updated_at);

-- Row Level Security: each user only sees and changes their own rows
alter table public.profiles enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.set_logs enable row level security;
alter table public.ladder_progress enable row level security;
alter table public.health_samples enable row level security;

create policy "own rows" on public.profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.workout_sessions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.set_logs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.ladder_progress for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.health_samples for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
