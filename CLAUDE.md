# Notes for Claude

- Read `docs/PLAN.md` (decisions, roadmap) and the "Programme rules derived from the evidence" section of `docs/EVIDENCE.md` before changing programme logic.
- Run `npm test` and `npm run build` before pushing. Exercise animations are checked by tests: every pinned hand/foot must reach its target, segment lengths stay constant, and the figure must stay inside its viewBox.
- Database changes: apply through the Supabase project `calisthenics` (ref `zagilnkbufgennesxuxp`) and save the same SQL under `supabase/migrations/`.
- The user's preferences: neutral, descriptive headings; flag uncertain figures with "(verify)"; never invent quotes.
