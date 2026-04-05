# BPT Academy Dashboard

Admin web dashboard for BPT Academy — built with Next.js 14, Tailwind CSS, shadcn/ui, and Supabase.

Live at: **app.bptacademy.uk**

---

## Features

| Section | What it does |
|---|---|
| 🏠 Dashboard | Stats overview, revenue chart, recent enrollments, quick actions |
| 👥 Users | Manage students, coaches, admins — edit roles, divisions, skill levels |
| 🏫 Programs | Create/edit programs, manage rosters and sessions |
| 📋 Attendance | Mark present/absent/late per session, view history |
| 📊 Reports | Weekly/monthly analytics, charts, Excel export |
| 💳 Payments | Payment history, status filters, revenue summary |
| 💬 Messaging | DMs, group channels, bulk division announcements |
| 🎥 Videos | Video library with Mux thumbnails, comments, delete |
| ⚙️ Settings | Academy config editor |

**Access:** Admin and Super Admin roles only. All other users are rejected at login.

---

## Local Development

### 1. Install dependencies

```bash
cd dashboard
npm install
```

### 2. Environment variables

Create `.env.local` (already present in repo — do not commit to public repos):

```env
NEXT_PUBLIC_SUPABASE_URL=https://nobxhhnhakawhbimrate.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_vnFb-ACqDwBiYt4PcKXC5Q_Ty8LRYoR
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

### 3. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

---

## Deploy to Vercel

### One-time setup

1. Push this folder to a GitHub repo (or the full `bpt-academy` monorepo)
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Set **Root Directory** to `dashboard` (if using monorepo)
4. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy ✅

### Custom domain: app.bptacademy.uk

1. In Vercel: Project → Settings → Domains → Add `app.bptacademy.uk`
2. Vercel will show you DNS records to add
3. In your DNS provider (wherever `bptacademy.uk` is managed), add:
   - Type: `CNAME`
   - Name: `app`
   - Value: `cname.vercel-dns.com`
4. Wait for propagation (~5 min) → done

---

## Tech Stack

- **Next.js 14** (App Router, server components)
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** (`@supabase/ssr` for auth, `@supabase/supabase-js` for queries)
- **Recharts** (revenue + division charts)
- **xlsx** (Excel export for reports)
- **Lucide React** (icons)

---

## Project Structure

```
dashboard/
  app/
    (auth)/login/          ← public login page
    (dashboard)/           ← protected routes (admin/super_admin only)
      layout.tsx           ← sidebar + header shell
      dashboard/           ← home stats page
      users/               ← user management
      programs/            ← program management
      attendance/          ← session attendance
      reports/             ← analytics + Excel export
      payments/            ← payment history
      messaging/           ← conversations + announcements
      videos/              ← video library
      settings/            ← academy settings
  components/
    sidebar.tsx
    header.tsx
    stats-card.tsx
    data-table.tsx
    charts/
      revenue-chart.tsx
      division-chart.tsx
  lib/
    supabase/
      client.ts            ← browser Supabase client
      server.ts            ← server Supabase client
    utils.ts
    excel-export.ts        ← xlsx export logic
  middleware.ts            ← auth + role guard
```

---

## Notes

- The middleware checks both session AND role on every dashboard request — non-admin users are signed out and redirected
- Service role key is only used in server actions (never exposed to the browser)
- All charts use client components; all data fetching uses server components where possible
- Excel export generates 4 sheets: Summary, Revenue by Division, Students by Division, Top Students
