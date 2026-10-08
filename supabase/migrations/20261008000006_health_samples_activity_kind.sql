-- Other aerobic sports from Strava (hikes, runs, skating, swimming...) as 'activity'.
alter table public.health_samples drop constraint health_samples_kind_check;
alter table public.health_samples add constraint health_samples_kind_check check (kind in ('weight', 'cycling', 'activity'));
