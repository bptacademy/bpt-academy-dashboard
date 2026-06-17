# BPT Academy — Developer Handover

_Last updated: 2026-06-17 · Status: **LIVE** on the App Store (v1.5.9 shipped; **v1.6.0 build 40 uploaded, pending submit-for-review**)._

---

## 1. What it is
A **members-only padel-academy management platform** (users are added/approved by an admin). Manages students, coaches, programs, training videos, attendance, payments, messaging, tournaments, rankings, skill assessments and a promotion engine.

**Five roles**, each with its own tab navigation + screens: `student`, `coach`, `admin`, `parent`, `super_admin`.

---

## 2. ⚠️ Repo layout — read this first
The GitHub repo **`github.com/bptacademy/bpt-academy-dashboard`** is, in practice, the **entire `~/.openclaw/workspace` directory** (an automation workspace), **not** just the app. The actual app lives in the **`bpt-academy/` subfolder**:

```
bpt-academy/
  mobile/        Expo React Native app  (the primary product)
  dashboard/     Next.js 14 web dashboard (app.bptacademy.uk, Vercel)
  supabase/      migrations (89) + 9 edge functions
  HANDOVER.md    ← this file
```

> The repo also contains unrelated workspace files (memory/, volpair material, a second `padel-dating-app/` clone, business docs). **Recommended cleanup for the new owner:** extract `bpt-academy/` into its own dedicated repo. A nightly script (`bpt-academy/backups/nightly-backup.sh`) runs `git add -A && git commit` on the whole workspace at 20:00 GMT — be aware it auto-commits everything (it does **not** push).

---

## 3. Tech stack
| Component | Tech | Notes |
|---|---|---|
| Mobile app | Expo SDK 54, RN 0.81, React 19, TS (**strict ON**) | iOS live; Android AAB ready |
| Web dashboard | Next.js 14 (App Router) + Tailwind | `app.bptacademy.uk`, hosted on Vercel (~6.2k lines) |
| Backend | Supabase (Postgres/Auth/Storage/Edge) | project ref **`nobxhhnhakawhbimrate`**, eu-west-1 |
| Video | **Mux** | training videos + bookmarks/comments |
| Payments | **Stripe** | `create-payment-intent` edge fn; 7-yr HMRC retention on payments |
| Email | **Resend** | from `office@bptacademy.uk` |
| Builds | EAS Build (account **`bptacademyuk`**) | iOS bundle / Android pkg **`com.bptacademy.app`**, EAS projectId `a661965b-f384-43fa-8441-f9e5f78a0c3a` |

---

## 4. Data model & backend
~28 core tables; **89 versioned migrations**. Highlights:
- **RLS on all tables**; `get_my_role()` reads JWT claims only (avoids policy recursion); roles synced to `app_metadata`.
- Derived-field ownership is disciplined: `recalculate_performance_pct()` is the **sole writer** of `promotion_cycles.performance_pct` (trigger-driven from skill assessments).
- Deduplicated notifications via a generated `dedup_key` + unique index.
- Push pipeline: `trg_push_on_notify` trigger → `process-notifications` edge fn → Expo push (+ Resend email).
- **9 edge functions** incl. `create-payment-intent` (Stripe) and `process-notifications`.

---

## 5. Environments, access & secrets
**Never commit secrets.** (See §8 — secrets were historically committed; this is being remediated.)

| Secret | Lives in |
|---|---|
| Mobile `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `bpt-academy/mobile/.env` (gitignored) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase edge-function secrets + Vercel env (server-side only) |
| `STRIPE_SECRET_KEY`, `RESEND_API_KEY` | Supabase edge-function secrets |
| Supabase DB password, Supabase access token (`sbp_…`) | **rotate — see §8**; keep in a password manager, never git |
| App Store Connect API key | `bpt-academy/mobile/AuthKey_BZ24P9K8FP.p8` (referenced by `eas.json`) |

Identifiers (not secrets): Supabase project `nobxhhnhakawhbimrate`; ASC App ID `6769894988`; Apple Team `R7365964A2`; ASC API key id `BZ24P9K8FP`, issuer `337909be-7e69-4cf9-baf3-129b5b3a3de3`.

Management-API SQL: `POST https://api.supabase.com/v1/projects/nobxhhnhakawhbimrate/database/query` (Supabase `sbp_…` token). Note: **direct DDL from a sandbox is blocked** — use the Management API or the dashboard SQL editor.

---

## 6. Build & release
- Profiles in `bpt-academy/mobile/eas.json`: `development`, `preview` (APK, internal), `production` (`autoIncrement: true`, `appVersionSource: local`).
- **Current:** app version **1.6.0**, iOS **build 40**, Android **versionCode 41**.
  - iOS build 40 is **VALID on App Store Connect** (uploaded 2026-06-17) — founder to **submit for review**.
  - Android AAB (versionCode 41) built — upload to Google Play manually (no Play auto-submit key configured).
- **Force-update gate:** `academy_settings.min_required_version` (currently `1.5.9`). **Bump to `1.6.0` once 1.6.0 is released** to push users onto it.

### ⚠️ EAS submission gotchas (learned 2026-06-17)
- `eas build --auto-submit` does **not** submit when combined with `--no-wait` (the submit step is client-side and the CLI exits first). Submit separately.
- **EAS `submit` can report `ERRORED` with no logs while the upload actually succeeded.** Verify against Apple directly before retrying. Two ways used here:
  1. ASC REST API: build a JWT (ES256) from the `.p8` (`iss`=issuer, `kid`=keyId, `aud`=`appstoreconnect-v1`) → `GET https://api.appstoreconnect.apple.com/v1/builds?filter[app]=6769894988`.
  2. Direct upload via the bundled `iTMSTransporter`: `/Applications/Transporter.app/Contents/itms/bin/iTMSTransporter -m upload -assetFile app.ipa -apiKey BZ24P9K8FP -apiIssuer <issuer>` (place the `.p8` in `~/.appstoreconnect/private_keys/`).

---

## 7. What was done / fixed (2026-06-17 — all on `main`)
- **Feature: 1× session/week programs** — added `1x / week` chip on Create Program; relaxed `programs_sessions_per_week_check` CHECK from `2–4` → `1–4` (migration `20260617000001` + applied to prod). Backward-compatible.
- **Feature: student name search** in the Program roster "Enroll a Student" picker.
- **Fix: dark-theme text visibility** — New Goal input, goal-card titles, enrolled-program titles were near-black on dark cards (invisible) → light.
- **Fix: backgrounds load on every page** — 10 screens were missing `bg.png` in their main render (Reports, Academy/Billing Settings, Upload Video, Re-enrollment, Parent Child Detail, Privacy/Terms, + dark-theme conversion of ParentRegister & VideoPlayer).
- **Feature: "Spectrum" admin UI redesign** — `CoachHomeScreen` (admin/super-admin) + `CoachDashboardScreen` (coach): gradient bg + colour-coded **Phosphor** "Manage" grid; new **animated bottom tab bar** (`components/navigation/SpectrumTabBar.tsx`) wired into Coach/Admin/Super-admin navigators. Added deps: `phosphor-react-native`, `react-native-svg`, `expo-linear-gradient`, `expo-blur` (all Expo Go-compatible). Fonts kept as the brand **TTOctosquares**.
- **Security: untracked `bpt-academy/.env` + `CREDENTIALS.md`** from git, gitignored them, de-hardcoded the access token in `nightly-backup.sh`.
- **Release: v1.6.0 build 40** built + uploaded to App Store Connect; Android AAB built.

Source: `BPT Academy - Technical Audit.pdf` (2026-06-15, on the founder's Desktop).

---

## 8. 🔴 Outstanding SECURITY (do first)
The repo historically committed secrets; HEAD is now clean but **git history still contains them**:
- ✅ **DB password rotated** (was `Karldavid2023!`, exposed in `CREDENTIALS.md`).
- 🔴 **Rotate the Supabase access token `sbp_0231359…`** (was in `CREDENTIALS.md` + `nightly-backup.sh`, in remote history) → Supabase → Account → Access Tokens → revoke + new → update `~/.zshrc`.
- 🔴 **Purge git history** of `.env` + `CREDENTIALS.md` (`git filter-repo`) and force-push, **after** rotation. Do carefully — 22k-file repo with the nightly auto-commit job.
- 🟠 The old service-role key `sb_secret_BwquwRb…` is **already gone** (verified; current secret `sb_secret_qMSk…`). Legacy `service_role` JWT still exists (optional to disable).
- 🟡 Re-enable HIBP password check; ensure service-role key is **not** in `mobile/.env`.

---

## 9. Other outstanding / TODO
- **Submit v1.6.0 for review** (iOS) + upload AAB to Play; then bump `min_required_version` → `1.6.0`.
- Deploy/verify the `process-notifications` edge function in prod (was flagged not-deployed in the audit).
- Replace **247 `any`** usages with generated DB types (`supabase gen types`).
- Decompose 600+ line screens (`student/ProgressScreen` 1217, `coach/StudentDetailScreen` 1104, etc.).
- Align dashboard `@supabase/supabase-js` (2.47) with mobile (2.99); `npm audit` both (note `xlsx`/SheetJS advisory — prefer vendor CDN build).
- Extract `bpt-academy/` into its own clean repo (see §2).

---

## 10. Gotchas / non-obvious invariants
- `profiles` has **no email column** — email lives in `auth.users`.
- RLS failures are **silent** (0 rows, no error) — check policies when writes "do nothing".
- `modules.session_date` (not `program_sessions`) is the source of truth for calendar dots.
- `session_attendance` uses an `attended` boolean (not a status column).
- Dashboard JWT role: `app_metadata.role`, not top-level `role`.
- `maybeSingle()` errors on multiple rows — use `.order().limit(1)`.
- FABs use `bottom: 88` to clear the tab bar.
- Local `tsc` may be unreliable in this environment — type-check via `node node_modules/typescript/lib/tsc.js --noEmit` if `npx tsc` fails.
- Two coach home screens exist: **Coach** lands on `CoachDashboardScreen`; **Admin + Super-admin** land on `CoachHomeScreen` (the 10-tile Manage grid).

---

## 11. Reference
- Technical audit: `BPT Academy - Technical Audit.pdf` (2026-06-15).
- Full running project log (internal): `~/.openclaw/workspace/memory/project-map-bpt-academy.md`.
