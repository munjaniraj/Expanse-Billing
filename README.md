# TexFin Pro (Next.js)

Textile Business Income, Expense & Financial Management System.

## Stack

- **Next.js 15** (App Router) + React 19
- Tailwind CSS v4
- Firebase Auth + Firestore
- Fonts: Sora (display), Plus Jakarta Sans (UI), IBM Plex Mono (currency)

## Design tokens

- Ink charcoal (`ink-*`) for structure
- Teal (`teal-*`) brand accent
- Soft sand washes on surfaces
- Emerald / Rose / Amber for income / expense / labour

## Setup

```bash
npm install
```

Copy env keys into `.env.local` (or `.env`):

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Legacy `VITE_FIREBASE_*` names still work via `next.config.mjs`.

On Vercel → Project → Settings → Environment Variables, add the same keys for Production (and Preview). Then redeploy.

Ensure Email/Password is enabled in Firebase Authentication.

## Scripts

```bash
npm run dev      # http://localhost:3000
npm run build
npm start
```

## Routes

| Path | Module |
|------|--------|
| `/login` `/signup` `/forgot-password` | Auth |
| `/` | Dashboard |
| `/categories` | Category Master |
| `/transactions` | Income / Expense |
| `/labour` | Labour entries |
| `/production` | Stock + movements |
| `/excel-sheet` | 12-month matrix |

## Notes

- App Router lives in `src/app/`. Shared UI is in root `components/`, `context/`, `hooks/`, `services/`, `utils/`.
- Env vars use `NEXT_PUBLIC_*` in `.env.local` (not `VITE_*`).
- Folder name contains `&`, so scripts call Next via `node ./node_modules/next/dist/bin/next`.

