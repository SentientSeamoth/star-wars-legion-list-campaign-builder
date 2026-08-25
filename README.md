# Legion App

I built this app for *Star Wars: Legion* because I felt the existing apps were too rigid. This app is meant to allow list building, collection tracking, and campaign play. Custom options exist to allow players to do whatever they want outside the normal game rules.

## Why this exists

Every other Legion app I've tried gets one or two things right and fumbles the rest. Saves that silently corrupt or don't sync. Rules data that goes stale for months after an errata drops. Permission models that lock you out of your own lists. I wanted something that just works on my machine, keeps my data in a single file I control, and is easy to keep current when Atomic Mass Games changes something.

So: local-first, single SQLite database, no login wall, and a data layer that's plain versioned JSON — which means updating the app's rules/points/card library is simple.

## Features

**Army list builder**
- Official mode (validated against faction rank requirements) and freeform mode (proxying, homebrew, rule-of-cool) in the same UI
- Unit picker filtered by faction and rank, with real point costs and live totals
- Upgrade, command card, and battle deck picking per list
- Live rank-count validation against the actual rank requirement rules per faction
- Save, load, and manage multiple lists per profile
- Copy-to-clipboard and .txt export for sharing a list

**Collection tracking**
- Track which physical products/expansions you actually own, at the box level
- Unit-level ownership is derived automatically from what's in each box you own
- Manual overrides for proxies, losses, or trades that don't fit the box model

**Campaign mode**
- Branching narrative paths and sequenced missions with multi-outcome rewards
- Written battle reports with per-model casualty tracking and auto-retirement on wipeout
- A per-campaign store with unlock thresholds and purchase limits
- Hero upgrade purchases that don't bank unused credit

**Accounts**
- Local profiles only — no cloud account, no login server
- Multiple people can use the same install without stepping on each other's data
- Switch profiles from the nav at any time

**Data library**
- Units, keywords, upgrades, command cards, scenarios, factions, battle forces, affiliations, and product expansions, all as human-editable JSON under `data/`
- Every entry tracks whether it's been verified against a real source and where that source came from, rather than presenting best-guesses as fact
- Schema-validated (`npm run validate:data`) so a bad edit fails instead of breaking something three screens later

## Stack

- **Tauri 2** (Rust core + system webview) instead of Electron — smaller binaries, lower memory footprint, and a Rust backend that's a good fit for the local SQLite layer.
- **React + TypeScript + Vite** for the frontend.
- **SQLite** as the local database, one file, easy to back up.

Windows installers (NSIS and MSI) build clean via `npm run tauri build`, plus a portable standalone exe with no install step. Linux support is a stack goal from day one (Tauri supports it natively); Android is feasible later since Tauri 2 targets mobile from the same codebase, but that's not built yet.

## Project structure

```
legion-app/
  data/                 # seed data: units, keywords, upgrades, command cards,
                         # scenarios, factions, battle forces, affiliations,
                         # expansions — all versioned JSON, schema-validated
    schema/              # JSON Schema files, one per data file
  src-tauri/
    src/
      types/             # canonical Rust structs — source of truth for data shapes
      db/                 # SQLite schema, migrations, seeding — storage only
      domain/              # pure game-rules logic (list validation, campaign rules)
      commands/             # thin Tauri command layer exposed to the frontend
    migrations/            # numbered SQL migrations
  src/
    lib/
      api/               # the only place the frontend calls invoke() into Rust
      types/             # TypeScript mirror of the Rust types
    features/            # one folder per screen/feature: list-builder, collection,
                         # campaigns, accounts — features never import each other
    components/          # shared, dumb, presentational components
  docs/                  # architecture notes, decisions log, gap tracker
  tests/
```

The dependency direction is one-way: `data/` → `db/` → `domain/` → `commands/` → `lib/api/` → `features/`. Game-rules logic lives in exactly one place (`domain/`), so the frontend never re-implements rules it should just be calling.

## Getting started

```
npm install
npm run dev          # frontend only, in a browser
npm run tauri dev    # full app, real webview + Rust backend + SQLite
```

Build:

```
npm run build         # frontend build
npm run tauri build   # full desktop installers (NSIS + MSI on Windows)
```

Test and validate:

```
npm test               # frontend unit/component tests (vitest)
cargo test              # from src-tauri/ — Rust unit + integration tests
npm run validate:data    # checks every data/*.json file against its schema
```

## Data status

The app's code is structurally sound; the data needed is still a work in progress. `docs/TODO.md` tracks exactly what's verified, what's a placeholder, and what's still missing, library by library. `docs/DECISIONS.md` has the dated log of real design/data calls made along the way.

## Not affiliated

This is an unofficial fan-made tool. *Star Wars: Legion* is a trademark of Atomic Mass Games / Lucasfilm Ltd. This project isn't endorsed by or affiliated with either.

## Authorship

JJusek - Splinter Kaninchen
v1.0 launched August 25, 2026
