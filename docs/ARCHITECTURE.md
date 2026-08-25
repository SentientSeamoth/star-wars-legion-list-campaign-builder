# Star Wars: Legion Desktop App — Architecture Plan

Status: pre-build planning doc, written before implementation. Hand this to
Claude Code as project context.

## Goals (from project brief)
- Desktop app, Linux + Windows, not overly complex to build/maintain.
- Local saves that actually work (existing apps fail here).
- Frequent, easy updates (esp. rules/points/errata).
- Not overly locked-down on permissions.
- Card image + text database, keyword library, encoded rules engine.
- A feature that checks for new official rules content and can pull it into
  the app's data.
- User accounts + saved army lists.
- Army list builder in two modes: (1) official-rules-validated, (2) freeform.
- Game scenario setup.
- Custom campaign system — **placeholder only for now**, empty module, no
  design guesses. Build last.

## Stack decision
- **Tauri 2.x** (Rust core + system webview) over Electron.
  - Reasoning: much smaller binaries, lower memory footprint, native
    installers for both Linux (AppImage/deb) and Windows (msi/exe) from one
    config, and a Rust backend is a good fit for a local SQLite DB + a
    scraper/update-checker running as background jobs.
  - Frontend: React + TypeScript + Vite. Keeps UI work approachable.
- **SQLite** (via `tauri-plugin-sql` or `rusqlite`) as the local database.
  Single-file DB, easy to back up, no server, no account required to run
  the app locally — solves the "existing apps don't save easily" complaint
  directly.
- **User accounts**: default assumption is **local profiles**, not
  cloud/online accounts — multiple people can use the same install without
  needing a login server. This avoids you having to run or pay for backend
  infrastructure. If you actually want cross-device sync later, that's an
  additive feature (e.g. optional export/import or a sync service), not a
  rearchitecture. Flag if that assumption is wrong before CC builds the
  accounts module.

## Mobile (Android) access
Good news: this doesn't require a second app or a rewrite. **Tauri 2.x
(stable, currently v2.10.x) officially targets Android and iOS from the
same Rust core + web frontend used for desktop** — confirmed current as of
March 2026. Practical implications for this project:
- The React UI, the SQLite data layer, and most of the rules-engine logic
  in `src-tauri/` are shared across desktop and Android builds.
- Native platform code (if ever needed — e.g. Android-specific file
  pickers or notifications) is written as small Kotlin plugins bridged
  into the Rust/JS layers; you won't need to maintain a separate Kotlin
  app.
- Not every desktop plugin is guaranteed to have a mobile-ready
  equivalent yet, so any plugin we pick for things like the scraper's
  background scheduling or file system access needs an "Android-tested"
  check before we depend on it.
- Distribution: sideloaded APK is simplest to start (matches the
  "not locked down on permissions" goal); Play Store distribution is a
  separate, later decision if you want it, since that adds signing,
  review, and policy overhead.
- Sync caveat: since user accounts are local-profile-based (see above),
  an Android install and a desktop install won't automatically share army
  lists unless we add an explicit export/import or sync feature. Worth
  deciding once the desktop app is stable, not now.

## Repo layout
```
legion-app/
  src/                      # React/TS frontend
    features/
      list-builder/
      scenarios/
      campaigns/            # placeholder only, see below
      keyword-library/
      card-browser/
      accounts/
    components/
    lib/                    # shared frontend helpers, API client to Rust
  src-tauri/                # Rust backend
    src/
      db/                   # SQLite schema, migrations, queries
      rules_engine/         # list validation, keyword resolution
      scraper/              # card/image scraper + rules-update checker
      accounts/
      commands.rs           # Tauri commands exposed to frontend
    migrations/
  data/                     # seed data, versioned, human-editable JSON
    keywords.json           # <-- built below
    rules/
      core_rules_version.json
      errata.json
    cards/
      schema.md
  docs/
    ARCHITECTURE.md         # this file
```

## Data model sketch (SQLite)
- `cards` (id, name, faction, unit_type[unit/command/upgrade/battle/scenario/etc],
  rank, points_cost, keywords[json], image_path, source_version, last_verified)
- `keywords` (id, name, type[unit/weapon/upgrade], parameterized, stacks,
  description, rules_version_added, rules_version_changed)
- `army_lists` (id, user_id, name, mode[official/freeform], faction,
  points_total, created_at, updated_at)
- `army_list_entries` (list_id, card_id, count, upgrades[json])
- `users` (id, display_name, local profile only — no password required
  unless you want multi-profile protection)
- `scenarios` (id, name, objective_cards[json], rules_text, source)
- `campaigns` — placeholder table, intentionally empty schema for now
- `rules_updates_log` (id, checked_at, source_url, version_found, diff_summary,
  applied[bool]) — this backs the "search for new rules" feature: it's an
  audit trail, not silent auto-editing of rules data.

## Card image/text database
- Store images on disk under an app-data cache folder, DB holds paths +
  source attribution + a content hash so the update checker can tell if a
  card's art/text has changed upstream (errata) vs. is new.
- Card *types* to model explicitly, since they behave differently:
  unit cards, upgrade cards, command cards, battle cards, objective/scenario
  cards, mission cards (Tours of Duty), Tours of Duty character cards.

## Rules-update checker
- A background/manual-trigger job in `src-tauri/src/scraper/` that checks
  Atomic Mass Games' own rules/points/errata pages and any wiki/community
  source you approve, compares against `rules_updates_log`, and surfaces a
  "here's what changed" diff for you to review and apply — not a silent
  auto-patch. Respect robots.txt / ToS on any source; official AMG PDFs are
  the safest source of truth since they're published for free public use.

## List builder — two modes
- **Official mode**: validated against faction, rank limits, unique-card
  limits, and current points, all pulled from the `data/` library so an app
  update (or a rules-update-checker run) can change validation without a
  code change.
- **Freeform mode**: same UI, validation rules skipped/relaxed — good for
  proxying, homebrew, "rule of cool" lists.

## Campaigns module
- Create the folder, the DB table, and a stub route in the UI
  ("Campaigns — coming soon") and stop there, per your instruction. No
  further design until you spec it.

## Open items to revisit with you later (not asked now, just logged)
- Whether user profiles ever need password protection or stay open/local.
- Whether list-sharing (export a list as text/image to share) is in scope.
