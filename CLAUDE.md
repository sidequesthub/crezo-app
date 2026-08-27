# Crezo

Business operating system for Indian content creators — content calendar, brand
deal CRM, GST invoicing, and an asset vault.

The feature spec lives at `~/Downloads/crezo-mvp.md` — outside the repo and not
version-controlled. It should be moved in; until it is, treat that path as
machine-specific and confirm it exists before relying on it.

This repo holds **both** the mobile app and its backend. `../crezo-landing` is a
separate Next.js marketing site with its own git repo; `../design` holds the
Stitch mockups and design-system docs.

---

## Commands

```bash
npm start                 # Expo dev server (dev client)
npx expo start --go       # Expo Go — no native build needed, all deps are Go-compatible
npx expo start --tunnel   # phone on a different network (see Remote debugging)
npm run server:dev        # Express backend on :3001, tsx watch

npx tsc --noEmit -p tsconfig.json         # typecheck the app
npx tsc --noEmit -p tsconfig.server.json  # typecheck the backend (separate project!)
```

There are no tests and no linter. `tsc` on **both** projects is the only
automated check — the app tsconfig **excludes `src/**`**, so checking one proves
nothing about the other. Run both before claiming a change is clean.

---

## Repo map

```
app/              expo-router screens — (auth) and (tabs) groups
components/ui/    shared presentational components
constants/        Colors.ts (design tokens), Layout.ts (floating-chrome sizes)
hooks/            useAuth
lib/              supabase client, phoneAuth (client side of OTP)
src/              Express backend — deployed separately, NOT bundled into the app
supabase/         migrations + bootstrap.sql
```

`src/` is server-only. Nothing under `app/`, `components/`, `hooks/`, or `lib/`
may import from it — those run on the phone and would leak the service-role key.

Backend conventions live in `.cursor/rules/*.mdc` (architecture, code style,
database). Follow them; don't restate them here.

---

## Hard rules

**Never commit secrets.** `.env`, `.mcp.json`, and `.claude/settings.local.json`
are gitignored and each holds live credentials — the Supabase service-role key,
the MSG91 auth key, a Google API key. Check `git diff --cached` before every
commit. The Supabase **anon** key in `lib/supabase.ts` is deliberately committed;
it is public by design and safe only because RLS is enforced.

**A push to `main` may be a production release.** `.vercel/project.json` links
this repo to a Vercel project, and in Aug 2026 a push auto-deployed the backend
and took it down — the new code required env vars Vercel didn't have, and
`required()` throws at module load, so every route returned
`FUNCTION_INVOCATION_FAILED`. That deployment was later abandoned, so the link
may now be dead. **Confirm the current state before pushing**, and never assume a
commit is "just a backup." If the backend gains a `required()` env var, set it on
the host before shipping the code that reads it.

**The Supabase project is the only copy of production data.** There is no
replica and no backup. On the free tier it pauses after ~7 days idle and is
eventually deleted. Never run destructive SQL against it without a stated reason
and explicit go-ahead.

**Never write to the database to make a screen look better.** Seeding or
migrating rows is a product decision. Propose it; don't do it unasked.

---

## Architecture: pick one data path

There are currently two, and this is unresolved:

1. **Direct Supabase** — the app queries Supabase with the anon key, isolation
   enforced by RLS. This is what `app/(tabs)/index.tsx` does today.
2. **Express API** — `src/modules/*` with the service-role key, isolation
   enforced by explicit `creator_id` filters. Fully built; the app calls only
   `/api/auth/*`.

**Decided (Aug 2026): direct Supabase.** Calendar follows Home down path 1, for
one reason — the app keeps working when the local Express server isn't running,
and only phone-OTP auth genuinely needs the backend. New screens should do the
same and put their queries in `lib/<domain>.ts`. Revisit only if something needs
the service-role key or server-side secrets (invoice PDF generation is the
likely first case).

---

## Auth

Phone OTP only, and it is **not** stock Supabase auth:

```
app → POST /api/auth/otp/send    → MSG91 sends SMS
app → POST /api/auth/otp/verify  → MSG91 verifies
                                 → find-or-create the auth.users row
                                 → backend mints an HS256 JWT with SUPABASE_JWT_SECRET
app → supabase.auth.setSession() → hydrate the client for direct queries + RLS
```

Consequences to keep in mind:

- The backend **forges Supabase-compatible tokens**. This works only while the
  project uses a symmetric JWT secret. Newer Supabase projects default to
  asymmetric signing keys, which would break `mintPhoneSession` entirely.
- `upsertSupabaseUser` finds users via `listUsers({ perPage: 200 })` and filters
  in JS. It breaks silently past 200 users — a real ceiling, not a nit.
- Phone-OTP users have **no email and no metadata**. Any code deriving a display
  name must fall back through phone to a literal, or it produces null.

---

## UI conventions

The design system is "Obsidian Flux / Digital Atelier" — see
`../design/stitch_home_dashboard 2/obsidian_flux/DESIGN.md`. Screen-by-screen
mockups (PNG + HTML) sit beside it and are the reference for anything new.

- **Colors come from `constants/Colors.ts`.** No raw hex in screens, except the
  two gradient stops, which are intentional.
- **No 1px borders for sectioning.** Depth comes from tonal layering —
  `surface` → `surfaceContainer` → `surfaceContainerHigh`. Where a border is
  unavoidable, use a "ghost border" at ~8% opacity.
- **Fonts:** Plus Jakarta Sans for display/headlines, Manrope for body and
  labels. Both load in `app/_layout.tsx`; a weight not registered there renders
  as system font with no error.
- **Currency is ₹, always.** `formatINR` uses Indian units (K / L / Cr), not
  millions.

**Never hardcode a bottom offset.** The tab bar and the action button are both
absolutely positioned and their heights depend on `useSafeAreaInsets()`. Compose
positions from `constants/Layout.ts` instead. A hardcoded `bottom: 98` is what
made the action bar overlap the tab bar on every device with a home indicator.
The same applies to any screen whose content scrolls under floating chrome —
pad by the measured height, not a guess.

---

## Database

Full conventions in `.cursor/rules/database.mdc`. Beyond those:

- **Migrations have drifted from the live schema.** The deployed
  `handle_new_user()` tolerates phone-only signups; the version in
  `002_creators.sql` does not. Treat the live database as the source of truth
  and verify before assuming a migration describes reality.
- `supabase/bootstrap.sql` recreates everything from scratch, for a fresh
  project. It uses `create table if not exists`, so it will **not** repair an
  existing database — that needs a numbered `ALTER` migration.
- Migrations are the numbered `001`–`009` set only. An earlier
  `20250101000000_initial.sql` defined a conflicting schema (`creators.id` as
  the auth user id, rather than a separate `creators.user_id`) and was deleted
  in Aug 2026. Don't reintroduce it.
- Every table carries `creator_id`, from day one, so the Phase-3 manager
  dashboard stays possible. Keep it that way on new tables.

---

## Remote debugging

The phone does not need to share a network with the Mac:

```bash
cloudflared tunnel --url http://localhost:3001        # public URL for the backend
EXPO_PUBLIC_BACKEND_URL=<that-url> npx expo start --go --tunnel
```

`BACKEND_URL` in `lib/supabase.ts` reads `EXPO_PUBLIC_BACKEND_URL` and falls
back to the Vercel deployment. Both tunnel URLs are ephemeral and the backend
one is **compiled into the bundle**, so restarting a tunnel means a fresh URL
and a reload. Quick tunnels are unauthenticated — don't leave them running.

Local iOS device builds currently fail: Xcode 26.4 has no developer disk image
for iOS 26.5.2. Use Expo Go, or EAS (`eas.json` has a `development-device`
profile, but no Apple team is linked to the Expo account yet).

---

## State of the build

**Home** and **Calendar** are real. Deals and Vault are `ComingSoon`
placeholders; Profile renders rows that don't navigate. The backend has full
CRUD for all of them and the schema is complete — the gap is UI. Per the spec,
Deals is the remaining differentiator.

Calendar covers month/week views, per-day content lists, and create/edit/delete
of content slots. Not built: drag-and-drop rescheduling and deadline
notifications, both explicitly Phase-1 items in the spec.

Don't describe unbuilt screens as working, and don't let a stub's existence
imply the feature ships.
