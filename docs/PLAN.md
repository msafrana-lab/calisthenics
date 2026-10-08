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

## User profile used for programming

- Level: returning (about 5–15 full push-ups).
- Limitations: knees; shoulders/wrists. No diagnosis; a physiotherapist assessment is recommended.
- Schedule: short daily sessions (15–20 min), rotating focus.
- Cardio: cycling, mostly indoor on a home trainer and sometimes outdoors, recorded with a bike computer or Strava. Both kinds of ride count towards the aerobic target and towards leg load in the weekly rotation.
- Weight: Withings scale (syncs to Apple Health).

## Roadmap

1. **Foundation** (done): app shell, offline caching, local database, sign-in, backup sync, animation engine, 4 sample exercises, deployment workflow.
2. **Exercise library**: about 40 exercises from the ladders in `EVIDENCE.md` (P, S, E, C, K, H, A, F) plus the mobility pool (M), each with an animation.
3. **Programme engine**: daily rotation `A, B, C, D, A, B, C`, calibration sessions, double progression, pain and regression rules, deloads (rules R1–R10 in `EVIDENCE.md`). Session player with timer and rest periods. Each ride, indoor or outdoor, is classed as easy or hard by the same rule (R1: intervals, threshold work or more than 60 min = hard); outdoor rides tend to be longer, so they will more often count as hard and move the legs session.
4. **Progress**: per-exercise history and ladder steps, weekly volume per muscle group, weight trend (7-day average), cycling minutes against the 150–300 min/week target.
5. **Apple Health bridge**: an iOS Shortcut, run daily by a personal automation, reads weight and cycling workouts (indoor and outdoor) from Apple Health and sends them to a Supabase Edge Function protected by a personal token. The exact Shortcut actions available must be checked on the iPhone when this is built (verify).

## Open points to check

- Whether the bike computer / Strava writes both indoor and outdoor rides into Apple Health. If not, the Strava API is an alternative source for cycling data.
- Supabase free projects pause after a period of inactivity (verify the current rule on supabase.com). The daily Apple Health import should keep the project active.
- After creating your account, turn off new sign-ups in Supabase (Authentication settings) so no one else can register.
