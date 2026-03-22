# Crezo — Creator Business OS

The all-in-one business operating system for Indian content creators. Content planning, brand deals, invoicing, and asset organization — built India-first.

## Phase 1 MVP Features

- **Content Calendar** — Monthly/weekly view, content slots, deal tagging, drag reschedule
- **Brand Deal Manager** — Kanban pipeline (Pitched → Paid), deliverables checklist, revenue dashboard
- **Invoicing & Payments** — GST support, ₹ INR native, UPI/bank details, PDF export
- **Asset Vault** — Native album approach (zero cloud storage), MediaLibrary API, deal-linked organization
- **Creator Profile / Media Kit** — Shareable link, PDF export

## Tech Stack

- **Frontend:** Expo (React Native) — iOS, Android, iPad, Web
- **Design:** Obsidian Flux / Digital Atelier (dark, tonal layering)
- **Database:** PostgreSQL (host on Raspberry Pi or cloud)
- **API:** Node.js/Express (deploy to Vercel or standalone)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Run the app

```bash
# Install dependencies
npm install

# Start Expo (iOS / Android / Web)
npm start

# Or run specific platforms
npm run ios
npm run android
npm run web
```

### Set up the database (Docker)

```bash
# Start PostgreSQL
docker-compose up -d

# Verify it's running
docker-compose ps
```

The schema is applied automatically on first run. Connection string:

```
postgresql://crezo:crezo@localhost:5432/crezo
```

For a custom install (e.g. Raspberry Pi):

1. Run the schema: `psql -U postgres -d crezo < database/schema.sql`
2. Set `DATABASE_URL` when running the API

### Run the API

```bash
cd api
npm install
DATABASE_URL=postgresql://... npm start
```

For local development without a DB, the app uses mock data automatically.

### Environment variables

Create `.env` in the project root:

```
EXPO_PUBLIC_API_URL=http://localhost:3001/api
```

For production, point this to your deployed API URL.

## Deployment

### App (Vercel)

```bash
# Build for web
npx expo export --platform web

# Deploy the output to Vercel
```

### API (Vercel Serverless)

The `api/` folder can be adapted for Vercel serverless functions. Each route becomes a `api/*.js` function.

### Database (Raspberry Pi)

1. Install PostgreSQL on the Pi
2. Create database: `createdb crezo`
3. Run `database/schema.sql`
4. Configure `DATABASE_URL` with your Pi's IP (e.g. `postgresql://user:pass@192.168.1.x:5432/crezo`)

## Project Structure

```
crezo-app/
├── app/                 # Expo Router screens
│   ├── (tabs)/          # Tab navigation (Home, Calendar, Deals, etc.)
│   ├── deal/[id].tsx    # Deal detail
│   ├── content/[id].tsx # Content slot detail
│   └── invoice/[id].tsx # Invoice detail
├── components/          # Reusable UI
│   ├── ui/              # Design system components
│   └── layout/          # AppHeader, etc.
├── constants/           # Theme, colors (Obsidian Flux)
├── lib/                 # API client, mock data
├── types/               # TypeScript types
├── database/            # PostgreSQL schema
├── api/                 # Express API server
└── assets/
```

## Design System

Obsidian Flux — deep nocturnal base (#131313), Electric Blue primary (#adc6ff), Warm Orange accents (#fe9400). Tonal layering, no borders, glassmorphism for floating elements. Typography: Plus Jakarta Sans (headlines), Manrope (body).

## License

Proprietary — Crezo India
