# Volpair — Product Specification

_Last updated: 2026-04-30_
_Status: In progress — Sections 1–3_

---

## Section 1 — Product Vision & Core Concept

### What is Volpair?

Volpair is a dating app for padel players. It uses the sport as the context, the icebreaker, and the filter — so that by the time two people connect romantically, they already have something real in common.

The court is where it starts. Volpair makes sure it doesn't have to end there.

### The Core Insight

Padel creates natural chemistry. You play with someone for 90 minutes, you read their energy, you see how they handle pressure, you share the post-match moment. That's more intimacy than most first dates. Volpair captures that and turns it into connection.

The sport is the vehicle. Dating is the destination.

### The Two Modes

**💘 Connect Mode** *(primary — this is the dating app)*
- Discover players you've shared a court with — or who are in your padel circle
- The romantic layer is always present, never forced
- Mutual signals only — nobody knows you're interested until they are too
- Available from day one

**🎾 Play Mode** *(secondary — find a match partner)*
- Find someone to play with for a specific game
- Useful, but not the reason people download Volpair
- Playtomic already does court booking — we do the human layer

### The Four Questions (mandatory on onboarding)

After connecting their booking platform, every new user answers exactly 4 questions:

1. 📍 **Where are you based?** — home city / area
2. 🎯 **What are you looking for?** — *A date / A doubles partner / Both / Just exploring for now*
3. 👀 **Who do you want to be seen by?** — *Everyone / Women only / Men only / No preference*
4. 🗣️ **One line about yourself** — free text, optional but encouraged

Everything else — skill level, play style, reliability, favourite clubs, availability — is inferred automatically from match history.

### The Three Rules

1. **No manual data entry** — your profile is built from real match history
2. **Mutual only** — romantic signals are invisible until both people send one
3. **No mindless swiping** — every action is intentional (the Serve mechanic)

### Who Is This For?

**Primary:** padel players 22–45 who play regularly, are single or open to meeting people, and want to meet someone who genuinely shares their lifestyle — not just their interests on paper.

**Secondary:** players looking for a compatible doubles partner for recreational matches.

**Not for:** complete beginners with no match history, or people with no interest in the social/dating layer.

### Why Now?

- Padel is the fastest-growing sport in the world — 25M players, doubling every 3 years
- Spain, UK, Sweden, Italy, UAE, US all exploding simultaneously
- Zero dedicated dating app for padel players exists
- Playtomic data gives us real behavioural proof of compatibility that no generic dating app can replicate

---

## Section 2 — User Flows

### Flow 1 — Onboarding

**Entry point:** User downloads Volpair, opens for the first time.

**Step 1 — Welcome screen**
Single screen. No signup form. Just:
- Volpair logo + tagline
- One button: **"Connect with Playtomic"**
- Small text link: *"Don't have Playtomic? You can use a different platform"*

**Step 2 — Platform connect**
- User selects their booking platform (Playtomic, Matchi, On the Court, other)
- Enters credentials for that platform
- Volpair authenticates and pulls: match history, skill level, level confidence, clubs played at
- Loading screen: *"Building your profile from your match history…"* — 5–7 seconds (real data collection in progress)

**Step 3 — Profile preview**
One screen showing what we've inferred:
- Name (from platform)
- Skill level (e.g. "4.7 — Advanced Competitive")
- Matches played + win rate
- Top clubs
- *"Does this look right?"* → Yes / Something's wrong

**Step 4 — The 4 Questions**
One question per screen, clean and fast. Cannot be skipped.

- *"Where are you based?"* → city search
- *"What are you looking for?"* → Date / Doubles partner / Both / Just exploring
- *"Who do you want to be seen by?"* → Everyone / Women only / Men only / No preference
- *"One line about yourself"* → free text, "Skip" available on this one only

**Step 5 — Photos**
- **Free users:** upload 1–3 photos (minimum 1 required)
- **Premium users:** unlimited photos + short video clips (court highlights, rally footage)
- No photo = profile not visible to others
- Can add more later from profile settings

**Step 6 — Done**
- *"You're in. Your first match is waiting."*
- Lands on Connect Mode home screen

**Total time: under 2 minutes.**

---

### Flow 2 — Connect Mode (Dating — Primary)

**Home screen — three discovery layers:**

**Layer 1: People you've played with**
- Players from your match history on connected platform
- Strongest signal — you already know if there was something there
- Sorted by recency + Volpair Score
- Shows: name, photo, level, last played together, mutual clubs

**Layer 2: Friends of your court**
- Players who've shared a court with people you've played with
- Two degrees of court separation — not strangers
- Adjacent to your real padel world

**Layer 3: Nearby players**
- Opted-in users within your area at compatible level
- Only shown after layers 1 + 2 are exhausted

**Player card shows:**
- Photo(s)
- Name + age
- Level badge (e.g. 4.7)
- Shared court history (*"You played together at Carbon Padel, March 15"*)
- Volpair Score (0–100)
- Mutual connections (*"3 players you know also played with them"*)
- Premium badge + highlighted card border (premium users only)

**The three actions (no swiping):**
- 🎾 **Play again** — sport intent, zero romantic pressure, always safe to send
- 👋 **Connect** — social, open-ended, friendly
- 💘 **Volley** — romantic signal, invisible to the other person until they send one back

**Mutual Volley → Match**
When both users send a Volley, both are notified simultaneously:
*"You and [Name] both sent a Volley. The court is yours."*
→ Opens directly into a conversation with the Serve prompt

---

### Flow 3 — The Serve (First Message)

Replaces the blank chat box. When a connection happens, one person sends a **Serve** — a short intentional opener:

- A challenge: *"Rematch Saturday?"*
- An intro: *"Good game last week — always looking for strong players at your level"*
- A stat compliment: *"That win rate though 👀"*

The other person **returns the serve** or lets it drop. No reply = expires after 72 hours. No ghosting by design.

**Free users:** 5 Serves per day
**Premium users:** unlimited Serves

---

### Flow 4 — Play Mode (Find a Partner — Secondary)

Accessed via mode toggle on home screen.

**Home shows:**

**1. Open Courts**
Live games near you needing players. Card shows:
- Club name + distance
- Date and time
- Level needed
- Spots left (1, 2, or 3)
- Host name + reliability score
- One tap → send a Serve to join

**2. Find a Partner**
Compatible players sorted by Volpair Score, sport-intent framing.

---

### Flow 5 — Post-Match Prompt

24 hours after a logged match, both players receive a notification:
*"You played with 3 people yesterday. Want to connect with any of them?"*

Simple cards: **Yes / Maybe / Not really**

- Both Yes → connected, Serve prompt opens
- One Yes + one Maybe → gentle nudge to the Maybe
- Romantic matching also happens here — after shared experience, never cold

---

### Flow 6 — Notifications

- 💘 Mutual Volley match
- 🎾 Someone sent you a Play again
- 👋 Someone sent you a Connect
- 📬 New Serve received
- 📅 Post-match prompt (24h after a game)
- 🔄 Platform sync complete (new matches imported)
- ⭐ Premium: you were Volleyed (see who without sending one back)

---

### Freemium Model

**Free**
- 3 photos
- 5 Serves per day
- Connect + Play modes
- Standard profile card
- See Volley matches only when mutual

**Premium (~€9.99/month)**
- Unlimited photos + video clips
- Unlimited Serves
- Profile highlighted with premium badge + gold border
- See who sent you a Volley before sending one back
- Priority placement in all discovery layers
- Advanced filters (level range, club, availability, looking for)
- 24h Boost (appear at top of nearby)
- Read receipts on Serves

---

## Section 3 — Data Model

### Core Entities

---

#### `users`
Volpair's own user record (separate from Playtomic).

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| email | text | From Playtomic auth |
| full_name | text | From platform |
| date_of_birth | date | For age display |
| gender | text | male / female / other |
| bio | text | The one line (question 4) |
| looking_for | text | date / partner / both / exploring |
| visible_to | text | everyone / women / men / no_preference |
| city | text | From question 1 |
| location_lat | float | For proximity calculation |
| location_lon | float | For proximity calculation |
| is_premium | boolean | |
| premium_expires_at | timestamp | |
| profile_complete | boolean | All 4 questions answered + photo |
| created_at | timestamp | |
| last_active_at | timestamp | |

---

#### `platform_connections`
Links a Volpair user to their booking platform account.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | FK → users |
| platform | text | playtomic / matchi / on_the_court |
| platform_user_id | text | e.g. "4987425" |
| access_token | text | Encrypted |
| refresh_token | text | Encrypted |
| token_expires_at | timestamp | |
| last_synced_at | timestamp | |
| created_at | timestamp | |

---

#### `player_stats`
Derived stats calculated from match history. Recalculated on each sync.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | FK → users |
| platform | text | |
| level_value | float | e.g. 4.68 |
| level_confidence | float | 0–1 |
| total_matches | int | |
| wins | int | |
| losses | int | |
| win_rate | float | 0–1 |
| avg_set_score_for | float | Average sets won per match |
| avg_set_score_against | float | |
| play_style | text | aggressive / defensive / balanced / net-dominant |
| preferred_time_of_day | text | morning / afternoon / evening |
| preferred_days | text[] | [monday, thursday, saturday] |
| top_clubs | jsonb | [{club_id, club_name, play_count}] |
| updated_at | timestamp | |

---

#### `matches`
Every match imported from a booking platform.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| platform | text | |
| platform_match_id | text | e.g. "603c94ef-..." |
| tenant_id | text | Club ID on the platform |
| tenant_name | text | Club name |
| court_name | text | |
| city | text | |
| country_code | text | |
| lat | float | |
| lon | float | |
| played_at | timestamp | |
| duration_minutes | int | |
| match_type | text | competitive / casual |
| surface_type | text | panoramic / crystal / wall / outdoor |
| result_confirmed | boolean | |
| created_at | timestamp | |

---

#### `match_players`
Junction: which Volpair users (and platform-only players) participated in each match.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| match_id | uuid | FK → matches |
| user_id | uuid | FK → users (null if not on Volpair yet) |
| platform_user_id | text | Always present |
| platform_name | text | Name from platform |
| team_id | text | "0" or "1" |
| result | text | won / lost / unconfirmed |
| level_value | float | At time of match |
| level_confidence | float | |

---

#### `volpair_scores`
Calculated compatibility score between two users. Recalculated on sync.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| user_a_id | uuid | FK → users |
| user_b_id | uuid | FK → users |
| total_score | int | 0–100 |
| skill_score | int | 0–25 |
| style_score | int | 0–20 |
| availability_score | int | 0–20 |
| location_score | int | 0–15 |
| chemistry_score | int | 0–10 |
| proximity_score | int | 0–10 |
| matches_together | int | Times played together |
| last_played_together | timestamp | |
| calculated_at | timestamp | |

---

#### `connections`
All actions between users (play again, connect, volley).

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| sender_id | uuid | FK → users |
| receiver_id | uuid | FK → users |
| action_type | text | play_again / connect / volley |
| status | text | pending / accepted / declined / expired |
| matched_at | timestamp | When mutual volley fired |
| created_at | timestamp | |
| expires_at | timestamp | 72h for serves |

---

#### `serves` (conversations)
The Serve mechanic — messages between matched/connected users.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| connection_id | uuid | FK → connections |
| sender_id | uuid | FK → users |
| body | text | |
| read_at | timestamp | null if unread |
| created_at | timestamp | |

---

#### `clubs`
Padel clubs imported from platforms or added manually.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| platform | text | |
| platform_tenant_id | text | |
| name | text | |
| city | text | |
| country_code | text | |
| lat | float | |
| lon | float | |
| surface_types | text[] | |
| court_count | int | |
| is_partner | boolean | Volpair partner club |
| created_at | timestamp | |

---

### Key Relationships

```
users
  ├── platform_connections (1 user → many platforms)
  ├── player_stats (1 per platform)
  ├── match_players → matches (all matches ever played)
  ├── volpair_scores (pairs, recalculated on sync)
  ├── connections (actions sent/received)
  └── serves (messages within connections)

matches
  ├── match_players (4 per match)
  └── clubs (where it was played)
```

---

### Score Calculation Logic

Runs as a background job on every platform sync for every user pair with any court history overlap.

```
skill_score     = max(0, 25 - (level_delta / 0.08))          // 25pts at 0 delta, 0pts at 2.0 delta
style_score     = compatibility_matrix[style_a][style_b]      // lookup table 0–20
availability    = (overlapping_time_slots / total_slots) * 20 // time pattern overlap
location_score  = max(0, 15 - (distance_km / 6.67))          // 15pts at 0km, 0pts at 100km
chemistry_score = min(10, matches_together * 2 + rematch_bonus + post_match_yes * 3)
proximity_score = min(10, mutual_connections * 2)             // shared padel circle
```

---

---

## Section 4 — Screen Inventory

### Auth & Onboarding

| # | Screen | What it shows | Actions |
|---|---|---|---|
| 1 | Welcome | Logo, tagline, connect button | Connect with Playtomic / Choose different platform |
| 2 | Platform Select | List of supported platforms | Select platform |
| 3 | Platform Login | Email + password fields | Submit credentials, loading state |
| 4 | Syncing Profile | Animated loading (5–7s) | None — passive |
| 5 | Profile Preview | Inferred name, level, matches, win rate, top clubs | Confirm / Something's wrong |
| 6 | Question 1 — Location | City search field | Search + select city |
| 7 | Question 2 — Intent | 4 option cards | Select one |
| 8 | Question 3 — Visibility | 4 option cards | Select one |
| 9 | Question 4 — Bio | Free text field | Type / Skip |
| 10 | Photo Upload | Camera + gallery picker | Upload 1–3 photos (premium: unlimited + video) |
| 11 | Onboarding Complete | "You're in" screen | Enter app |

### Connect Mode (Dating — Primary)

| # | Screen | What it shows | Actions |
|---|---|---|---|
| 12 | Connect Home | Three discovery layers, player cards | Scroll, tap card, send Play again / Connect / Volley |
| 13 | Player Profile | Full profile: photos, level, stats, shared history, Volpair Score, mutual connections | Play again / Connect / Volley / Report |
| 14 | Mutual Volley Match | Full-screen match moment: both names, confetti, "The court is yours" | Send first Serve / Maybe later |
| 15 | Connections List | All active connections sorted by last activity | Tap to open conversation |
| 16 | Conversation | Serve thread between two matched users | Type + send Serve, view read receipt (premium) |
| 17 | Post-Match Prompt | Cards for each player from yesterday's match | Yes / Maybe / Not really per player |

### Play Mode (Secondary)

| # | Screen | What it shows | Actions |
|---|---|---|---|
| 18 | Play Home | Open Courts feed + Find a Partner list | Toggle between two sub-views |
| 19 | Open Court Detail | Club, date/time, level range, host info, spots left, all 4 player slots | Send a Serve to join |
| 20 | Create Open Court | Form: club search, date/time picker, level range, spots available | Publish court |
| 21 | Find a Partner | Player cards sorted by Volpair Score, sport-intent framing | Send Play again / Connect |

### Profile

| # | Screen | What it shows | Actions |
|---|---|---|---|
| 22 | My Profile | Photos, bio, level badge, stats, top clubs | Edit profile |
| 23 | Edit Profile | Edit bio, photos, visibility settings, intent | Save changes |
| 24 | My Stats | Full match history, win rate, level history chart, play style breakdown, top partners | View only |
| 25 | Platform Sync | Connected platforms, last synced, sync status | Force re-sync, connect new platform, disconnect |
| 26 | Premium Upgrade | Feature comparison free vs premium, pricing | Subscribe / Restore purchase |

### Notifications & Settings

| # | Screen | What it shows | Actions |
|---|---|---|---|
| 27 | Notifications | All alerts: volleys, serves, post-match prompts, syncs | Tap to navigate to relevant screen |
| 28 | Settings | Account, notifications, privacy, visibility, blocked users, delete account | Toggle switches, navigate to sub-screens |
| 29 | Blocked Users | List of blocked users | Unblock |
| 30 | Delete Account | Confirmation flow | Confirm deletion |

### Discovery & Clubs

| # | Screen | What it shows | Actions |
|---|---|---|---|
| 31 | Club Profile | Club name, location, courts, surface types, photos, players you know who play there | Navigate, share |
| 32 | Nearby Players Map | Map view of opted-in players near you | Tap pin → mini player card → view full profile |

### Modals & Overlays

| # | Screen | What it shows | Actions |
|---|---|---|---|
| 33 | Report User | Reason selection | Submit report |
| 34 | Volpair Score Breakdown | Radar chart showing all 6 score dimensions for a pair | View only |
| 35 | Level Explainer | What the level number means, how it's calculated | Dismiss |
| 36 | Premium Paywall | Triggered when free user hits a premium feature | Upgrade / Not now |
| 37 | Boost Confirm | "Your profile will be boosted for 24h" | Confirm / Cancel |

**Total: 37 screens**

### Navigation Architecture

```
Bottom Tab Bar (4 tabs):
├── 💘 Connect     → Connect Home (12)
├── 🎾 Play        → Play Home (18)
├── 💬 Messages    → Connections List (15)
└── 👤 Profile     → My Profile (22)

Notification bell → Notifications (27)
Settings gear    → Settings (28)
```

**Stack flows:**
- Connect Home → Player Profile → Mutual Volley Match → Conversation
- Play Home → Open Court Detail / Create Open Court / Find a Partner
- My Profile → Edit Profile / My Stats / Platform Sync / Premium Upgrade
- Notifications → any screen via deep link

---

---

## Section 5 — MVP Definition

The MVP has one job: **prove the core loop works with real users.**

The core loop is:
> Connect booking platform → see people you've played with → send a Volley → match → have a conversation

Everything else is a distraction until that loop is validated.

---

### ✅ MVP — v1.0 (Ship This)

**Onboarding (screens 1–11)**
Complete onboarding including all 4 questions, profile preview, and photo upload. First impression is non-negotiable.

**Platform Connections**
- Playtomic ✅
- Matchi ✅
- On the Court ✅

**Connect Mode — full (screens 12–17)**
- Connect Home with all 3 discovery layers (played with, friends of court, nearby)
- Player Profile with stats + shared history
- Mutual Volley match screen
- Connections List
- Conversation (text Serves)
- Post-match prompt (24h after a game)

**Play Mode — Find a Partner (screens 18, 21)**
- Play Home
- Find a Partner sorted by Volpair Score
- No Open Courts yet — that's a later feature

**Profile (screens 22, 23, 24, 25)**
- View + edit profile
- My Stats (match history, win rate, play style)
- Platform Sync screen (connect / disconnect / re-sync)

**Notifications (screens 27)**
- Volley matches, new Serves, post-match prompts, sync complete

**Settings + Safety (screens 28, 29, 30, 33)**
- Settings, blocked users, delete account, report user

**Modals (screens 34, 35)**
- Volpair Score Breakdown radar chart
- Level explainer

**Free tier only**
No premium for v1.0 — validate the product first, monetise once retention is proven.

---

### 🔜 v1.1 — Premium + Growth

- Premium tier + paywall (screens 26, 36, 37)
- Boost feature
- Read receipts on Serves
- See who Volleyed you (premium)
- Priority placement in discovery
- Unlimited photos + video clips (premium)
- Advanced filters

---

### 🔮 v2.0 — Scale

- Play Mode — Open Courts (screens 19, 20)
- Nearby Players Map (screen 32)
- Club Profiles + partner club programme (screen 31)
- Additional platforms (CourtReserve, club-specific)
- Background sync job (hourly, server-side)
- League / tournament mode
- Club-installed Volpair dashboard

---

### MVP Build Order

1. Supabase schema (all 8 tables from Section 3)
2. Platform auth + sync service (Playtomic, Matchi, On the Court)
3. Volpair Score calculation engine
4. Onboarding screens (1–11)
5. Connect Home — all 3 layers
6. Player Profile screen
7. Volley / Connect / Play again actions
8. Mutual Volley match screen
9. Conversations (Serve mechanic)
10. Post-match prompt
11. Play Mode — Find a Partner
12. My Profile + Edit Profile + My Stats + Platform Sync
13. Notifications (in-app + push)
14. Settings, block, report, delete account
15. Volpair Score Breakdown modal
16. Internal testing (TestFlight + Expo Go)

**Total MVP screens: 32**
**Total MVP DB tables: 8**

---

---

## Section 6 — Technical Architecture

### Stack

| Layer | Technology | Why |
|---|---|---|
| Mobile | React Native + Expo SDK 54 | Cross-platform iOS + Android, same stack as BPT Academy, fast iteration |
| Backend | Supabase | Postgres + Auth + Realtime + Storage + Edge Functions in one |
| Auth | Supabase Auth | Volpair account separate from platform credentials |
| Platform sync | Edge Functions | Server-side API calls — platform credentials never exposed to client |
| Real-time | Supabase Realtime | Live conversation updates, instant Volley match notifications |
| Storage | Supabase Storage | Profile photos, video clips |
| Push notifications | Expo Notifications + APNs/FCM | Match alerts, new Serves, post-match prompts |
| Score engine | Postgres functions + Edge Functions | Volpair Score calculated server-side on every sync |
| Payments (v1.1) | RevenueCat | Handles App Store + Play Store subscriptions cleanly |

---

### Auth Flow

Two separate auth layers that never conflict:

**Layer 1 — Volpair account (Supabase Auth)**
- User creates a Volpair account with email + password
- Standard Supabase JWT session
- This is the user's identity inside Volpair

**Layer 2 — Platform credentials (encrypted, stored server-side)**
- User enters their Playtomic/Matchi/OTC email + password during onboarding
- Credentials sent to a Supabase Edge Function — never touch the client again
- Edge Function authenticates with the platform, stores encrypted tokens in `platform_connections`
- All subsequent platform API calls go through Edge Functions only

```
Mobile App
    │
    ├── Supabase Auth (Volpair JWT) ──────── all app requests
    │
    └── Edge Function: platform-sync
            │
            ├── Playtomic API (v1/v3)
            ├── Matchi API
            └── On the Court API
```

---

### Platform Sync Flow

Triggered on:
1. First connect (onboarding)
2. Manual re-sync (user taps sync button)
3. App foreground after >6h (v1.1: background job)

**Sync steps (Edge Function):**
1. Refresh platform access token if expired
2. Fetch last N matches from platform API
3. Upsert into `matches` + `match_players` (idempotent — safe to re-run)
4. Recalculate `player_stats` for this user
5. Identify other Volpair users in those matches → link via `platform_user_id`
6. Recalculate `volpair_scores` for all newly linked pairs
7. Update `platform_connections.last_synced_at`
8. Trigger notification if new matches found

**Idempotency:** every match has a `platform_match_id`. Upsert on conflict — no duplicates ever.

---

### Volpair Score Engine

Runs as a Postgres function `calculate_volpair_score(user_a_id, user_b_id)`.
Called automatically via trigger after every `player_stats` update.

```
skill_score     = MAX(0, 25 - (ABS(level_a - level_b) / 0.08))
style_score     = style_compatibility_matrix[style_a][style_b]   -- 0–20
availability    = overlap(time_slots_a, time_slots_b) * 20
location_score  = MAX(0, 15 - (distance_km / 6.67))
chemistry_score = MIN(10, matches_together * 2 + rematch_bonus + post_match_yes * 3)
proximity_score = MIN(10, mutual_connections * 2)

total = skill + style + availability + location + chemistry + proximity
```

Stored in `volpair_scores`. Discovery queries ORDER BY total_score — no calculation at query time.

---

### Discovery Query Logic

**Layer 1 — Played with:**
Users who appear in the same matches as the current user, ordered by Volpair Score.

**Layer 2 — Friends of court:**
Users who've played with anyone in Layer 1 but haven't played with the current user directly.

**Layer 3 — Nearby:**
Opted-in users within 50km, compatible level, not already in layers 1 or 2, ordered by Volpair Score.

---

### Real-time

Supabase Realtime subscriptions for:
- `connections` table → new Volley match fires instantly on both devices
- `serves` table → new message appears without polling

---

### Storage Structure

```
Supabase Storage:

avatars/
  {user_id}/
    photo_1.jpg
    photo_2.jpg

clips/  (premium only)
  {user_id}/
    clip_1.mp4
```

All files served via signed URLs. Public access disabled.

---

### Edge Functions

| Function | Trigger | Does |
|---|---|---|
| `platform-auth` | Onboarding | First-time credential validation + token storage |
| `platform-sync` | Manual / on open / scheduled | Full platform data pull + score recalc |
| `calculate-scores` | After player_stats update | Recalculates Volpair scores for all pairs |
| `post-match-prompt` | Scheduled (daily) | Sends prompts 24h after matches |
| `send-notification` | Various triggers | Wraps Expo push notification API |

---

### Key Technical Decisions

- **No client-side platform API calls** — all through Edge Functions. Credentials stay server-side always.
- **Pre-calculated scores** — discovery is instant because scores are never computed at query time.
- **Idempotent sync** — safe to run multiple times, no duplicate data ever.
- **platform_user_id as the bridge** — links platform-only players to Volpair users the moment they sign up, retroactively populating shared history.
- **RevenueCat for subscriptions** — avoids building your own receipt validation for App Store and Play Store.
- **PostGIS for location** — enables efficient radius queries for Layer 3 discovery.

---

---

## Section 7 — Launch Strategy

### The Cold Start Problem

Every social app faces this: the app is useless until there are users, but users won't join until the app is useful. Volpair has a natural advantage — **the data exists before the users do.**

When someone signs up, we immediately import their full match history. They can see everyone they've ever played with who's also on Volpair — on day one. The value is instant, even with a small user base.

The strategy: get 200–300 real padel players in one city to sign up in the same week. Critical mass in a small pond before expanding.

---

### Launch Market: United Kingdom 🇬🇧

**Why UK first:**
- Existing connections and influencers in the UK padel scene — this is the single biggest advantage
- Fastest-growing padel market in Europe — new clubs opening every month
- English-speaking → easier content creation, press coverage, App Store reviews
- London alone has 50+ padel clubs on Playtomic and growing fast
- Strong social padel culture — post-match drinks, active WhatsApp communities, weekend leagues

**Launch city: London**
Highest club density, young professional demographic (25–40), high disposable income, massive appetite for social sport apps. The padel scene is tight-knit enough to create word-of-mouth fast but large enough to scale.

**Second city (month 2–3): Manchester**
Second largest padel scene in the UK, strong club network, younger demographic.

**Third city (month 3–4): Birmingham / Leeds / Bristol**
Expand to other major UK cities as London reaches critical mass.

**Spain launch (month 4–6): Barcelona + Madrid**
Once the product is proven in English, localise and expand to the world's largest padel market with a validated product and real testimonials.

---

### Getting the First 1,000 Users

**Phase 1 — Seeding (before public launch)**
- Leverage existing UK connections directly — personal intros to club managers and coaches carry more weight than cold outreach
- Identify the 10–15 most active padel clubs in London on Playtomic (Carbon Padel, Padel Social Club, Destination Padel, etc.)
- Reach out to club managers — offer "Volpair Partner Club" status
  - Free: club gets a profile page, featured placement, analytics
  - In return: they promote Volpair to members (WhatsApp groups, noticeboards, front desk)
- Activate UK padel influencers and coaches from existing network — they play 5x/week with dozens of different people and have real audiences
- Private beta: invite-only, 100–200 players from existing network, gather feedback before public launch

**Phase 2 — Launch week**
- Simultaneous club activations across London — QR codes at courts, locker rooms, reception desks
- Short-form video content: "We analysed your Playtomic history and built your dating profile" — shocking, shareable, true
- TikTok + Instagram Reels showing the onboarding flow — the 5–7s "analysing your matches" screen is genuinely compelling content
- UK padel influencers post genuine product demos launch week — no paid ads, real players, real reactions
- PR angle: "The first dating app built for padel players" — sports media + lifestyle press

**Phase 3 — Organic growth loop**
- Post-match prompt fires 24h after every game → drives re-engagement
- Every connection creates a shareable story ("we met on Volpair, played together 6 months ago")
- Referral mechanic: invite a friend → both get 7 days premium free
- Club partnership programme scales — each new partner club brings their member base
- Target padel leagues and social tournaments in London as activation events

---

### The Playtomic Partnership Conversation

Right now we're reverse-engineering their API — grey area, works for MVP, not sustainable long-term.

**The pitch to Playtomic:**
- We drive more bookings to their platform (Volpair users book courts to meet matches)
- We make their data more valuable (players stay engaged with Playtomic because Volpair uses it)
- We're not a competitor — we're a social layer on top of their booking infrastructure
- Offer: revenue share on premium subscriptions driven by Playtomic-connected users

**When to have this conversation:** after 5,000 active users. Before that you have no leverage.

**If they say no:** credential-connect continues to work. Build Matchi and On the Court partnerships in parallel to reduce dependency.

---

### Key Metrics to Track from Day 1

| Metric | Target (end of month 1) | Why it matters |
|---|---|---|
| Signups | 500 | Baseline |
| Profile complete rate | >70% | Onboarding quality |
| Day 7 retention | >40% | Product is working |
| Volleys sent per user (week 1) | >3 | Core action happening |
| Mutual Volley rate | >15% | Signal quality is good |
| Conversations started | >50% of matches | The loop closes |
| Organic referrals | >20% of signups | Word-of-mouth is working |

**The one metric that matters most:** Day 7 retention. If people are still opening the app 7 days after signing up, the product works. Everything else is noise until that number is solid.

---

### Pre-Launch Checklist

- [ ] App Store listing ready (EN + ES)
- [ ] Google Play listing ready (EN + ES)
- [ ] Privacy policy live (GDPR compliant — dating app = sensitive data category)
- [ ] Age verification flow (18+ minimum)
- [ ] Terms of service live
- [ ] volpair.com landing page live (email capture pre-launch)
- [ ] @volpair handles secured on Instagram, TikTok, X, LinkedIn, YouTube
- [ ] 5 partner clubs confirmed in London
- [ ] 2–3 padel influencers confirmed for launch week
- [ ] Playtomic sync tested with 50+ real accounts
- [ ] Matchi + On the Court sync tested
- [ ] Push notifications working on iOS + Android
- [ ] Moderation plan in place (report flow, response time SLA)

---

_SPEC.md complete as of 2026-04-30. Next: begin implementation._
