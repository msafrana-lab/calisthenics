# Strava and Withings Setup

The app imports rides from Strava and weigh-ins from Withings through the Supabase Edge Function `integrations` (`supabase/functions/integrations/`). The import runs every 3 hours, and again whenever the app opens (at most every 30 minutes).

Each service needs a free "developer application" that identifies this app. You create it once; the app then asks you to approve access, like any "Connect with Strava" button.

Screens and field names on the Strava and Withings sites change from time to time. If a step below does not match what you see, look for the closest equivalent (verify).

## 1. Strava

1. Sign in at <https://www.strava.com/settings/api>.
2. Create an application:
   - **Application name**: anything, for example "Calisthenics personal".
   - **Category**: "Training" (or the closest option).
   - **Website**: `https://msafrana-lab.github.io/calisthenics/`
   - **Authorization Callback Domain**: `zagilnkbufgennesxuxp.supabase.co` (domain only, no `https://`).
   - Strava may ask for an icon; any image works.
3. Note the **Client ID** and the **Client Secret** (click "show").

## 2. Withings

1. Sign in at <https://developer.withings.com/dashboard/> with your Withings account and create an application.
   - If asked, choose the "Public API" (Withings cloud) integration.
2. Fill in:
   - **Application name** and **description**: anything.
   - **Callback URL**: `https://zagilnkbufgennesxuxp.supabase.co/functions/v1/integrations/callback`
   - **Environment**: development or production. A personal app that only you use can stay in development (verify).
3. Note the **Client ID** and the **Client Secret** (Withings may call it "Consumer Secret").

## 3. Supabase secrets

1. Open the Supabase dashboard, project **calisthenics** → **Edge Functions** → **Secrets** (sometimes under **Project Settings → Edge Functions**).
2. Add these four secrets with the values from steps 1 and 2:

| Name | Value |
|---|---|
| `STRAVA_CLIENT_ID` | Strava Client ID |
| `STRAVA_CLIENT_SECRET` | Strava Client Secret |
| `WITHINGS_CLIENT_ID` | Withings Client ID |
| `WITHINGS_CLIENT_SECRET` | Withings Client Secret |

The secrets stay on the server. They are never sent to the app or stored in this repository.

## 4. Connect in the app

1. Open the app and go to **Settings**. Sign in if you have not yet.
2. Under **Connected services**, tap **Connect** next to Strava and approve. Repeat for Withings.
3. After each approval you are sent back to the app.
   - The first import covers the last 90 days of rides and the last 12 months of weigh-ins.
   - If you started from the home-screen app, the return may open in Safari. That is fine: the connection is stored on the server. Reopen the home-screen app and the status shows there.

## How rides are classed

Rule R1 in `EVIDENCE.md` counts a ride as **hard** if it lasts longer than 60 minutes or is tagged in Strava as a race or a workout. Any other ride counts as **easy**.

- Intervals under an hour that are not tagged as a workout count as easy. Tag them as a workout in Strava, or tap "Hard ride" in the app.
- A setting you choose in the app always wins over the imported value.
- Indoor rides (Zwift or a trainer) and outdoor rides are treated the same way.

## Troubleshooting

- **"not set up yet" when tapping Connect**: the secrets for that service are missing or misspelled.
- **"Last import failed" in Settings**: the message comes from Strava or Withings. Disconnecting and connecting again usually clears an expired or revoked authorisation.
- **Disconnect** removes the stored authorisation. Rides and weigh-ins that were already imported stay.
