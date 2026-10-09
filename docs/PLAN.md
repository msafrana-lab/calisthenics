# Project Plan and Decisions

Personal training app: daily bodyweight sessions on a mat, cycling (mostly indoor, sometimes outdoor) for cardio, progress tracking, Apple Health weight data.

## Decisions taken

| Topic | Decision | Reason |
|---|---|---|
| Platform | Installable web app (PWA) added to the iPhone home screen | The available Mac is too old for current Xcode. A native app would need the paid Apple Developer Program and cloud builds. |
| Offline use | The phone's local database (IndexedDB) is the primary store; the app shell is cached by a service worker | Training works with no connection; data is backed up when online. |
| Backend | Supabase project `calisthenics` (region eu-central-2, Zurich), email + password sign-in, row-level security on every table | Backup, multi-device access, and the endpoint for the Apple Health bridge. |
| Hosting | GitHub Pages, deployed by GitHub Actions | Free; requires the repository to be public. Personal data is never in the repository. |
| Animations | Code-drawn 2D figure (keyframed joint angles, inverse kinematics for hands and feet on the floor) | Consistent, anatomically controllable, tiny, offline. AI-generated video was rejected for inconsistent bodies and joint angles. |
| Pulling exercises | Floor-only substitutes (prone Y/T/W, reverse snow angels, Superman variations) | User's choice. Known limitation: they do not load the lats or biceps like rows or pull-ups. Table rows can be added later. |
| Nutrition | Weight trend only, no food logging | User's choice. The app states that weight change is driven mainly by diet. |
| Language | English | User's choice. |
| Session length | About 15 min. A/B/C: 1 warm-up drill plus an easy first set of the first exercise, 3 strength exercises, 1 optional stretch; D (mobility) keeps its longer stretch list. The engine estimates the duration and tests keep each session at 10–16 min | User's choice: sessions had too many warm-ups and stretches. Trade-off: A/B/C now give 1 stretch instead of the 2–3 in R9, so the weekly stretching dose per region relies mostly on D and is below the R9 target. |
| Visual design | Light, premium style: warm off-white background, white cards with soft shadows, one green accent, Inter typeface, filled and tapered figure on a soft stage, dark mode | User's choice, to look like a paid fitness app. |
| Weight and activity data | Direct server-side link to Withings (weigh-ins) and Strava (rides and other sports; leg-heavy sports also move the legs session), instead of Apple Health | Data originates there; no iPhone Shortcut to maintain; richer ride data (indoor flag, heart rate, power, workout tag) to class rides as easy or hard automatically. Setup: `docs/INTEGRATIONS.md`. |

## User profile used for programming

- Level: returning (about 5–15 full push-ups).
- Limitations: knees; shoulders/wrists. No diagnosis; a physiotherapist assessment is recommended.
- Schedule: short daily sessions (15–20 min), rotating focus.
- Cardio: cycling, mostly indoor on a home trainer and sometimes outdoors, recorded with a bike computer or Strava. Both kinds of ride count towards the aerobic target and towards leg load in the weekly rotation.
- Weight: Withings scale (syncs to Apple Health).

## Roadmap

1. **Foundation** (done): app shell, offline caching, local database, sign-in, backup sync, animation engine, 4 sample exercises, deployment workflow.
2. **Exercise library** (done): 63 exercises from the ladders in `EVIDENCE.md` (P, S, E, C, K, H, A, F) plus the mobility pool (M), each with an animation.
3. **Programme engine** (done): daily rotation `A, B, C, D, A, B, C`, calibration sessions, double progression, pain and regression rules, deloads (rules R1–R10 in `EVIDENCE.md`). Session player with timer and rest periods. Each ride, indoor or outdoor, is classed as easy or hard by the same rule (R1: intervals, threshold work or more than 60 min = hard); outdoor rides tend to be longer, so they will more often count as hard and move the legs session.
4. **Progress** (done): weight 7-day average with daily weigh-ins, weekly cycling minutes against the 150–300 min WHO range, working sets per muscle group this week against the 6–10 target, best-set history per progression with step changes marked; date range 4 weeks / 12 weeks / 1 year; table view for every chart.
5. **Strava and Withings link** (done): Edge Function `integrations` with OAuth, imports every 3 hours and on app open; imported rides set the day's easy/hard flag unless set by hand; weekly cycling minutes on Progress. Apple Health was dropped as the route because the data originates in Strava and Withings.
6. **Shorter sessions and redesign** (done): sessions cut to about 15 min (see the decision table); multi-ladder slots alternate between sessions of the same type; new visual design across all screens.

## Known limitations of the animations

The figure is a flat 2D drawing, so movements towards or away from the camera cannot be shown directly. These read less clearly and rely on their written cues: side-lying external rotation (S0), clamshell (A1), side planks (C7, C8, A4, A5), thoracic open book (M6), floor pec stretch (M8), and the shoulder-blade "plus" of P2/P6. Hip flexion in the figure-4 stretch (M3) is shown as the simpler ankle-cross set-up.

## Not yet implemented from the rules

- Reactive deloads (R8: performance drops on 3+ exercises, repeated joint flare-ups, poor sleep); only the planned week-6 deload is applied.
- Placing the mobility day on the hardest cycling day (R1); the legs session is moved away from hard rides, but D is not moved.
- Monthly RIR calibration set (R5).

## Open points to check

- First real Strava and Withings connections: the OAuth and data formats follow the providers' documentation but could not be tested from the build environment.
- Supabase security advisor: leaked-password protection is off (an Auth setting in the dashboard; may require a paid plan, verify). The `app_config` notice (RLS on, no policy) is intended: only the service role reads it. `pg_net` was moved to the `extensions` schema on 2026-10-09.
- Supabase free projects pause after a period of inactivity (verify the current rule on supabase.com). Whether the scheduled import counts as activity is not confirmed.
- After creating your account, turn off new sign-ups in Supabase (Authentication settings) so no one else can register.
