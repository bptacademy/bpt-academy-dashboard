# BPT Academy — First-Week Onboarding Checklist

Deep detail is in **[HANDOVER.md](./HANDOVER.md)** (referenced as §).

## 🔴 Before anything else — security (HANDOVER §8)
- [ ] **Rotate the Supabase access token** (`sbp_0231359…`) — it's in the repo's git history
- [ ] Plan the **git-history purge** of `.env` + `CREDENTIALS.md` (`git filter-repo`), *after* rotation
- [ ] Confirm the **DB password** rotation propagated everywhere it's used

## Day 1 — Access & environment
- [ ] GitHub access to `bptacademy/bpt-academy-dashboard`
- [ ] Supabase org access (project `nobxhhnhakawhbimrate`)
- [ ] Expo/EAS team (`bptacademyuk`)
- [ ] Apple Developer + App Store Connect (team `R7365964A2`, app `6769894988`)
- [ ] Google Play Console
- [ ] Vercel (dashboard), Stripe, Mux, Resend dashboards
- [ ] Obtain `mobile/.env` + `dashboard/.env.local` values (§5)
- [ ] `cd bpt-academy/mobile` → `npm install` → `npx expo start --tunnel`

## Day 2 — Read & orient
- [ ] Read **HANDOVER.md** fully — especially §2 (repo layout), §6 (build/release), §8 (security), §10 (gotchas)
- [ ] Learn the 5 roles + which home screen each lands on (§10): Coach → `CoachDashboardScreen`; Admin/Super-admin → `CoachHomeScreen`
- [ ] Skim `mobile/src/navigation/index.tsx`, the promotion engine, and the push pipeline (`trg_push_on_notify` → `process-notifications`)
- [ ] Internalise: `profiles` has **no email column**; **RLS failures are silent**

## Week 1 — Release + first tasks
- [ ] **Submit v1.6.0 (build 40) for review** on App Store Connect (build is already VALID there)
- [ ] Upload the **Android AAB** (versionCode 41) to Google Play
- [ ] After release, bump `academy_settings.min_required_version` → `1.6.0`
- [ ] Deploy/verify the `process-notifications` edge function in prod
- [ ] Start replacing the **247 `any`** usages with generated DB types
- [ ] Plan extraction of `bpt-academy/` into its own clean repo (§2)

## Build/release reminders (HANDOVER §6)
- [ ] EAS `submit` can falsely report **ERRORED** while the upload succeeded — verify via the ASC API or `iTMSTransporter` before retrying
- [ ] `--auto-submit` does **not** fire when combined with `--no-wait`
