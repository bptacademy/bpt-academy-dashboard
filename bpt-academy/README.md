# BPT Academy

Members-only padel-academy management platform — Expo (React Native) mobile app + Next.js web dashboard + Supabase backend. **Live on the App Store.**

## 👋 New here? Start with these
- **[HANDOVER.md](./HANDOVER.md)** — architecture, release status, **security items**, TODOs, gotchas, where secrets live.
- **[ONBOARDING.md](./ONBOARDING.md)** — first-week checklist (read the security section first).

## Layout
- `mobile/` — Expo app (the primary product; iOS live, Android AAB ready)
- `dashboard/` — Next.js 14 web dashboard (`app.bptacademy.uk`, Vercel)
- `supabase/` — 89 migrations + 9 edge functions

> ⚠️ The GitHub repo (`bpt-academy-dashboard`) currently also contains a wider automation workspace; **the app is this `bpt-academy/` folder.** Recommended: extract it into its own repo (HANDOVER §2).

## Run the mobile app locally
```bash
cd mobile
npm install
npx expo start --tunnel
```
Requires `mobile/.env` — see **HANDOVER §5**.
