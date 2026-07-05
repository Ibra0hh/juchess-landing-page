# JuChess — Project Handoff / Continuity Notes

> Read this first when resuming. It captures the full state so you don't have to re-review every file.

## What this is
**JuChess / ChessJU** — the University of Jordan Chess Club public website + player portal.
Premium, official, elegant feel. UI only, **mock data only** — no backend, no real APIs, no auth service.

## Design system / visual language
- Background parchment/cream `#F7EFE2` (landing) / `#F5EFE3` (app pages)
- Ink navy `#1E2B45` / `#16213B`
- Burgundy accent `#7A2431` (hover `#5F1B26`), deep burgundy section `#5A1922`
- Brass highlight `#A98A3F` / `#C9AE6B`
- Fonts: **Cormorant Garamond** (serif display), **IBM Plex Sans** (UI), **IBM Plex Mono** (numbers)
- Thin borders, restrained shadows, rounded pro cards. No emoji, no neon, no heavy gradients.

## Tech / architecture
- Everything is **Design Components** (`.dc.html`). Inline styles only; logic in `class Component extends DCLogic`.
- **`data.js`** = single source of truth (loaded via `<script src="data.js">` in each page's `<helmet>`). Exposes `window.JU`:
  - `JU.players` — 12 mock players (name, rating, username). First 6 are the required roster.
  - `JU.tournaments` — 9 tournaments, ONE per format, all `status: 'Active'`.
  - `JU.gamesBySource` — chess.com / lichess / tournament game pools (for Games review flow).
  - `JU.fenBoard(fen)` — parses FEN → cell array for mini boards.
  - `JU.getTournament(id)`, `JU.findGame(id)`.
  - `JU.auth` — mock localStorage auth: `get()`, `set(user)`, `clear()`, `initials(name)`. Key = `ju_auth`.
  - Each tournament gets `t.gameRounds` built by `buildRounds(t)` — realistic round-by-round games per format (circle method for RR/DRR/Swiss, bracket-derived for elim/multi, weekly for league, boards for team, live/recent for arena).

## Pages (all `.dc.html` in project root)
- **Home.dc.html** — animated landing = the club homepage. Sections: Hero (two knight images facing off + falling pieces + mouse parallax) → Vision (burgundy, 3 points: spread the game / play in person / sharpen skills) → Team (6 members: Chair, Vice Chair, Software Developer, Designer, Event Manager, Media & Outreach) → Contact/App (App Store + Google Play buttons, email, socials) → navy footer. Nav centered, all 5 links (Home/Tournaments/Games/Leaderboard/Profile) + auth widget. Tweaks: none critical.
- **Tournaments.dc.html** — list. Search + 3 centered filters (Upcoming/Active/Completed, default Active). Each row: time-control SVG icon (Blitz=lightning, Rapid=stopwatch, Bullet=rocket, Classical=two-dial clock) + name + status + format/timecontrol + date/venue/players.
- **Tournament.dc.html** — detail. **3 tabs only**: Home / Games / (Standings OR Bracket), centered.
  - Home tab = info overview card + description + arena countdown/team dashboard (as info) + **register/sign-in card** (signed-out → Sign in/Create account; signed-in → Register toggle).
  - Games tab = broadcast boards **grouped by round, newest/live round FIRST** (reversed). Every card action = "Watch the game". Cards link to Games.dc.html?game=ID.
  - Standings/Bracket tab = player table + crosstable (RR/DRR) / league / team / arena tables; bracket for SE/DE/Multi-stage-2. **Bracket has SVG connector lines** tracing winner advancement (burgundy=decided, dashed brass=live) via `drawBracketLines()` (redrawn in componentDidUpdate + resize).
- **Games.dc.html** — shared board workspace. Left: board + eval bar (matches board height). Right rail: Game Review (source→search→list→Start Review→eval graph/accuracy/classifications/move list/prev-next) and New Analysis (blank workspace, engine line, opening, move table, PGN/FEN import, New/Save/Review/Run). No chess clock anywhere. No avatar/explainer.
- **Leaderboard.dc.html** — podium + full rating ladder table.
- **Profile.dc.html** — identity card, season summary, recent games, upcoming, **Sign out** button (JU.auth.clear).
- **Sign In.dc.html** — centered card, Apple (left) + Google (right) w/ logos, Sign In / Sign Up / Enter as guest / Forgot password. Mock sign-in: sets JU.auth, redirects to Profile.
- **Sign Up.dc.html** — "Create Player Club Account": full name, email, phone, University ID (only place IDs appear), Chess.com/Lichess optional, password + confirm w/ live rule chips.
- **Forgot Password.dc.html** — identify → OTP → new password → done. Unknown account → "We don't have this account in the database." Known e.g. `ibrahim_ju`, `leenh`.

## Nav across app pages
Centered nav (`margin: 0 auto`): Home · Tournaments · Games · Leaderboard · Profile. Right side = auth widget: initials avatar (→ Profile) if signed in, else Sign In button. **Tools page was removed entirely.**

## Standalone deliverable
**JuChess.html** — self-contained bundled Home landing page (via super_inline_html). Re-bundle after any Home.dc.html change: `super_inline_html(Home.dc.html → JuChess.html)`. Note: its Tournaments/Games/Sign-in links point to the separate app pages (only work inside the full project, not in the lone file). Home.dc.html has a `<template id="__bundler_thumbnail">` required for bundling.

## Assets (assets/)
- `crest.png` — club crest (circular cutout), the brand mark.
- `knight-light.png`, `knight-dark.png`, `board-scene.png` — cut-out 3D renders for the landing hero (backgrounds removed via run_script flood-fill).

## Archived old landing versions (archive/)
- `Home v1.dc.html` (first dashboard-style), `Home v2 knights-leap.dc.html` (crest→board leap concept). Current Home is "The Duel" direction.

## Known intentional tradeoffs
- All tournaments are Active → Upcoming/Completed filter tabs are empty (chosen so every format shows at once).
- Time controls kept varied per tournament so the category icons stay varied.
- Bracket line mapping uses match i → next round floor(i/2) (correct for single-elim; approximate for DE/multi).

## Likely next steps / open ideas
- Optionally repopulate Upcoming/Completed filters.
- Mobile nav drawer (nav links hide under ~960px currently).
- Per-member team photos/socials on Home Team section.
- Real Bullet-time-control tournament (rocket icon currently only shows if a timeControl contains "Bullet").

## How to resume efficiently
1. Read this file.
2. `data.js` is the data brain — most content changes happen there.
3. Tournament.dc.html is the most complex page (tabs, brackets, rounds).
4. After Home changes, re-bundle JuChess.html.
