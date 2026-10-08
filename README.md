# Calisthenics

A personal training app for daily bodyweight sessions on a mat: animated exercise demonstrations, set logging with effort (reps in reserve) and pain tracking, progress history, and backup to a private Supabase database. It installs on an iPhone home screen and works offline.

- Live app: https://msafrana-lab.github.io/calisthenics/ (after GitHub Pages is enabled)
- Decisions and roadmap: [docs/PLAN.md](docs/PLAN.md)
- Evidence base and programme rules: [docs/EVIDENCE.md](docs/EVIDENCE.md)

This is not medical advice. A physiotherapist assessment is recommended before training around knee, shoulder or wrist problems.

## Development

```sh
npm install
npm run dev      # local server at http://localhost:5173/calisthenics/
npm test         # unit tests (animation geometry, sync engine)
npm run build    # type check + production build in dist/
```

Code layout:

- `src/animation/` — stick-figure model (`skeleton.ts`) and SVG renderer (`FigureView.tsx`).
- `src/exercises/` — exercise definitions with their keyframed animations.
- `src/lib/` — local database (Dexie), Supabase client, sync engine.
- `src/screens/` — Today, Exercises, Progress, Settings.
- `supabase/migrations/` — database schema, as applied to the Supabase project.

Pushing to `main` runs the tests and deploys to GitHub Pages (`.github/workflows/deploy.yml`).
