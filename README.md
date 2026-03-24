# Crezo — Creator Business OS

The all-in-one business operating system for Indian content creators. Content planning, brand deals, invoicing, and asset organization — built India-first.

## Phase 1 MVP Features

- **Content Calendar** — Monthly/weekly view, content slots, deal tagging
- **Brand Deal Manager** — Kanban pipeline (Pitched → Paid), deliverables checklist
- **Invoicing & Payments** — GST support, ₹ INR native
- **Asset Vault** — Native album approach (zero cloud storage), MediaLibrary API
- **Creator Profile / Media Kit** — Shareable link

## Tech Stack (MVP)

- **App:** Expo (React Native) — iOS, Android, iPad, Web
- **Backend:** [Supabase](https://supabase.com) — PostgreSQL, Auth, Row Level Security
- **Web hosting:** [Vercel](https://vercel.com) — static export of the Expo web build
- **Design:** Obsidian Flux / Digital Atelier

Without Supabase env vars, the app runs with **demo mock data** (no login required).

## Quick start

```bash
npm install
npm start
```

- **Web:** `npm run web`
- **iOS / Android:** `npm run ios` / `npm run android`

## Supabase setup (recommended for MVP)

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. In **Project Settings → API**, copy **Project URL** and **anon public** key.
3. Copy `.env.example` to `.env` and set:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

4. In **SQL Editor**, run the migration in `supabase/migrations/20250101000000_initial.sql` (creates tables, RLS, and a trigger to insert `public.creators` on signup).

5. In **Authentication → Providers**, enable **Email** (password). Optionally confirm email is off for faster testing.

6. Restart Expo. You’ll get email/password sign-in; data is stored per user with RLS.

If the `auth.users` trigger fails to run in your project, create the `creators` row manually once per user or adjust the SQL per [Supabase docs](https://supabase.com/docs/guides/auth/managing-user-data).

## Deploy web to Vercel

1. Connect the repo to Vercel.
2. Set environment variables **for Production** (and Preview if needed):

   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

3. Build settings (or use the included `vercel.json`):

   - **Install:** `npm ci`
   - **Build:** `npm run build:web`
   - **Output directory:** `dist`

4. Deploy. The Expo web bundle is static; the app talks to Supabase directly from the browser.

## Optional: local PostgreSQL (Docker)

```bash
docker-compose up -d
```

Use `database/schema.sql` if you self-host Postgres instead of Supabase. The app’s primary path is Supabase; the Express API in `api/` is optional.

## Project structure

```
crezo-app/
├── app/                    # Expo Router (tabs, auth, modals)
├── contexts/               # Auth (Supabase session)
├── components/             # UI + layout
├── hooks/                  # useCreatorData, etc.
├── lib/                    # Supabase client, queries, mock data
├── supabase/migrations/    # SQL for Supabase
├── database/               # Standalone Postgres schema (optional)
└── api/                    # Optional Express API
```

## Design system

Obsidian Flux — base `#131313`, primary `#adc6ff`, accent `#fe9400`. Plus Jakarta Sans + Manrope.

## License

Proprietary — Crezo India
