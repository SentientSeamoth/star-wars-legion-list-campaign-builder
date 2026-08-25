# Decisions Log

Short, dated entries for choices that are actually settled. Purpose: so
a future CC session (or you, months from now) doesn't silently
relitigate or contradict something already decided. Add one line (plus
a sentence of "why" if it's not obvious) whenever a real decision gets
made. Don't log routine implementation details here -- only things that
would be annoying to accidentally reverse.

- **2026-08-25** — Dropped the originally-planned AMG-site rules-update
  scraper (`src-tauri/src/scraper/`, never built) in favor of a simpler
  "Update Data" button that pulls curated `data/*.json` from this
  project's own GitHub repo. Reasoning: the actual workflow that's
  emerged is the project owner curating/verifying new card data (often
  via a separate research pass) and handing it off already-finished --
  the app scraping and parsing AMG's site itself was always going to be
  the fragile, high-maintenance part of that plan (PDF text layers are
  image-baked per docs/TODO.md's "real technical limitation" note,
  page layouts change, ToS/robots.txt considerations), for no benefit
  once a human is curating the data anyway. Not built yet -- see
  `docs/ROADMAP.md`'s P3 entry for the plan and its real prerequisite
  (data currently loads at compile time via `include_str!`, not
  runtime -- an update button has nothing to overwrite yet).
- **2026-08-25** — Attempted live GUI click-through testing (screen
  coordinates + simulated mouse/keyboard via PowerShell) during a full
  audit pass, as a way to catch real UI bugs beyond what `cargo
  test`/`npm test` prove. Abandoned it after one click landed on the
  wrong window (a VS Code panel instead of the app) and typed stray
  text into an unrelated input -- no actual harm done (nothing was
  submitted), but blind screen-coordinate automation on a real desktop
  with unpredictable window layering is too risky for the value it
  adds here. **Don't retry this approach** -- if live UI verification
  is needed again, it needs a driver that can confirm window focus
  before each action (real UI Automation / accessibility-tree
  targeting, not raw coordinates), not another screenshot-and-guess
  loop. Code-level verification (build, tests, live launch without
  interaction) is the fallback and is what backs this pass's findings
  in `docs/ROADMAP.md`.
- **2026-08-24** — Structural cleanup pass: adopted **`react-router-dom`
  with `HashRouter`** for real app navigation (no server exists in a
  bundled Tauri webview to handle path rewrites, so hash routing over
  browser routing). Adopted **vitest + React Testing Library** for
  frontend tests (matches the Vite toolchain already in place). Adopted
  **`ajv`** for JSON Schema validation (`npm run validate:data`). Did
  **not** adopt `tauri-specta` for TS codegen -- still a pre-1.0 release
  candidate (`2.0.0-rc.25` as of this check) a year-plus into RCs; real,
  avoidable risk for a maintenance-only benefit. `manual_seed.ts` stays
  hand-maintained. Restructured `data/factions.json`'s
  `standard_army_rank_requirements` from prose-only to `{text, min,
  max}` per rank so real code can check a list against it (same sourced
  bounds, not a new claim) -- first thing to actually consume that
  field. See docs/TODO.md's 2026-08-24 Resolved entry for the full
  breakdown.
- **2026-08-24** — Windows bundling enabled (`bundle.active: true`,
  `targets: ["nsis", "msi"]`), scoped to Windows only per explicit
  instruction -- macOS/Linux/mobile bundling intentionally not
  configured yet. NSIS `installMode` set to `currentUser` (installs
  without admin rights). See docs/TODO.md's 2026-08-24 entry for the
  real build/test that validated this.
- **2026-08-22** — Chose **Tauri 2.x** (Rust + React/TS) over Electron.
  Reasoning: smaller binaries, lower memory, native installers for
  Linux/Windows, and confirmed current support for building the same
  codebase to Android without a rewrite.
- **2026-08-22** — Database is **SQLite**, local file, no server.
  Directly addresses the "existing apps don't save easily" complaint.
- **2026-08-22** — User accounts are **local profiles**, not cloud
  accounts. Open question in docs/TODO.md if this needs revisiting.
- **2026-08-22** — Campaigns module is a **placeholder only** until
  explicitly specced. Not an oversight -- see docs/TODO.md.
- **2026-08-24** — The above hold is **lifted**: the project owner
  explicitly specced Campaign Mode (narrative, warband-style campaigns
  played with a real physical group -- permadeath rosters, a homebrew
  credits/store economy, branching hero-unit upgrade paths, written
  battle reports, solo/two-player/GM+player support). Built end-to-end
  in `src-tauri/migrations/0003_campaigns.sql`,
  `src-tauri/src/{types,domain,db/queries,commands}/campaigns_*.rs`,
  `src/features/campaigns/`. Key schema calls made along the way:
  - **Bookkeeping/journal system, not a rules engine.** This app has no
    fixed rule set to encode (every homebrew campaign invents its own
    mechanics) -- countable facts (credits, model counts, meter values,
    costs) got real typed columns; bespoke narrative/mechanical text
    (path fluff, custom battle mechanics, upgrade effects) is freeform
    `TEXT` the GM authors by hand, same honesty-first spirit as the rest
    of this project's data model, just pointed at user-authored content
    instead of official game data.
  - **Dedicated `campaign_roster_entries` table**, not a reuse of
    `army_lists`/`army_list_entries` -- campaign rosters need per-model
    permadeath tracking, a specialty flag, and purchase provenance that
    don't fit the list-builder shape, and `army_lists.mode`'s CHECK
    constraint doesn't include a campaign mode.
  - **Store `unlock_spend_threshold` gates on a participant's
    CUMULATIVE credits spent** (confirmed directly with the project
    owner against their real homebrew store list), not a meter and not
    a free grant -- the item's own cost is still charged once the
    threshold is met.
  - **Hero-upgrade "N Points" tiers are a label only, not a spendable
    currency** (also confirmed directly) -- the real rule is a
    non-banking rate limit: completing a mission grants exactly one
    upgrade-purchase opportunity, and an unused one never carries over.
    Modeled as a single boolean flag on `campaign_participants` that
    gets overwritten (never incremented) on each mission completion.
  - Old placeholder `campaigns` table (id/name/created_at, unused by any
    command) was dropped and recreated in the new migration rather than
    edited in place -- see the migration file's own header comment.
- **2026-08-22** — All game-rules logic lives in
  `src-tauri/src/domain/` as pure functions. Frontend never
  re-implements rules logic in TypeScript. See docs/FILE_STRUCTURE.md.
- **2026-08-22** — Rust structs in `src-tauri/src/types/` are the
  canonical data schema; TypeScript types are generated from them
  (tooling choice, e.g. tauri-specta, still to be confirmed compatible
  -- see docs/TODO.md).
- **2026-08-22** — Content libraries are being built in a fixed order:
  keywords, then units, then upgrades, then command cards -- each later
  library is allowed to reference the earlier ones (e.g. units
  reference keyword ids; upgrades/command cards will reference unit
  ids). Don't build upgrades or command cards before units is stable.
- **2026-08-22** — Unit roster (`data/units.json`) intentionally ships
  with all numeric stats (points, wounds, weapons, etc.) as `null`
  rather than filled in from memory. Roster placement (faction/rank/
  legality) was cross-checked against a live source; stats were not,
  because getting point costs wrong is worse than leaving them blank in
  a tool meant for real list-building.
- **2026-08-22** — Upgrade card categories fixed at 15 (Armament,
  Command, Comms, Crew, Force, Gear, Generator, Grenades, Hardpoint,
  Heavy Weapon, Ordnance, Personnel, Programming, Pilot, Training) plus
  a provisional 16th, "Doctrine" (new as of a Sept 2025 release, needs
  re-confirming). `data/upgrades.json` only seeds the generic
  non-faction cards so far -- the faction/unit-specific majority of the
  card pool is a known, tracked gap, not an oversight.
- **2026-08-22** — `data/command-cards.json` uses `commander_unit_id`
  to reference `data/units.json` ids directly, and this cross-reference
  is checked at validation time (a command card can't point at a unit
  that doesn't exist). Only the 4 generic Core Set cards are seeded;
  commander-specific cards (~150-200 across all commanders/operatives)
  are the single largest known gap across all four libraries so far.
- **2026-08-22** — Confirmed the competitive objective/mission card
  system changed entirely in the 2024 "2.6 refresh": old Objective/
  Deployment/Condition cards (800pt/500pt) are deprecated; current
  system is Primary/Secondary/Advantage cards (1000pt standard /
  600pt Recon). `data/scenarios.json` is built against the current
  system only. This app's user-facing Campaigns feature (still a
  placeholder) is explicitly a different thing from AMG's own
  narrative "Scenario" cards -- don't merge those concepts later.
- **2026-08-22** — Wrote the first real code scaffolding for CC: Rust
  canonical types (`src-tauri/src/types/`), a temporary hand-written TS
  mirror (`src/lib/types/manual_seed.ts`, delete once codegen exists),
  and a SQLite migration (`0001_init.sql`). The Rust/TS were hand-
  reviewed but not compiler-checked (no toolchain in this sandbox).
  The SQL migration WAS actually executed against real SQLite and
  round-trip tested by loading every current JSON library through it,
  including a deliberate bad-foreign-key test -- treat the SQL schema
  as validated, and the Rust/TS types as a strong draft pending
  `cargo check`/`tsc`.
- **2026-08-22** — Built affiliations/battle-forces/factions from two
  real official AMG PDFs (not secondary sites) -- the strongest
  sourcing this project has had. Caught a real mistake in the process:
  each Battle Force has its OWN rank-requirement table, not a shared
  "standard army" rule -- confirmed by comparing two official PDFs
  that disagreed. `data/factions.json` deliberately omits a generic
  rank table rather than risk stating a wrong one; the true generic
  rule still needs sourcing from the Core Rulebook directly.
- **2026-08-22** — Collection tracking is designed around PRODUCT-level
  ownership (`user_collection` -> `expansions`) with unit-level
  quantities DERIVED via `expansion_contents_units`, plus a
  `unit_ownership_overrides` table (signed delta) for proxies/losses/
  trades that don't map to a product purchase. A SQL view,
  `user_unit_ownership`, is the single place this derivation logic
  lives -- domain/ code should query it, not reimplement the join.
  This schema was tested with real simulated data (not just executed):
  owning the 501st Starter Set correctly derived exact per-unit
  quantities, and an override correctly adjusted the total.
- **2026-08-22** — UI design direction: dark "holotable console" theme,
  faction hues at varying alpha rather than separate light/dark hex
  pairs, Traditional=bold/solid vs Custom=light/dashed applied
  uniformly to every panel type. Rajdhani for headers, Inter for body,
  IBM Plex Mono for all numeric readouts. See docs/UI_DESIGN.md. The
  "Assassins" faction display name (vs data layer's "mercenary") is an
  open reconciliation item, not yet resolved.
- **2026-08-23** — Bootstrapped the actual Tauri 2 crate (none of
  `Cargo.toml`/`main.rs`/`tauri.conf.json` existed before) and built
  the collection-tracking command layer end to end, per
  `docs/TODO.md`'s own "natural next step" note. Two choices worth
  recording: (1) `db/seed.rs` re-loads every `data/*.json` library into
  SQLite via `INSERT OR REPLACE` on *every* launch rather than a
  one-time seed -- idempotent, and means a future `data/` content
  update (new units, corrected points) reaches the DB automatically on
  next run, which directly serves the "frequent, easy rules/points
  updates" goal in `docs/ARCHITECTURE.md`. (2) `domain/` was
  deliberately left empty for this pass -- collection CRUD has no
  business rule beyond what the SQL `CHECK` constraints already
  enforce, so there's nothing pure-function-shaped to put there yet;
  the first real `domain/` code should arrive with official-mode list
  validation once unit points/stats exist. Army-list CRUD and the
  frontend `lib/api/` wrappers were explicitly left out of scope. See
  "Backend bootstrap status" in `docs/TODO.md` for the full file list
  and remaining gaps (no toolchain available to `cargo check` this).
- **2026-08-23** — Scaffolded the frontend build (React 18 + Vite 5 +
  TypeScript 5 + Tailwind, per the stack already committed to in
  `docs/ARCHITECTURE.md`) and wrote `src/lib/api/` as typed `invoke()`
  wrappers over every command from the backend bootstrap above --
  closing the `commands/` → `lib/api/` arrow in
  `docs/FILE_STRUCTURE.md`'s dependency diagram. Discovered along the
  way: `ArmyCreationScreen.jsx` already assumed Tailwind utility classes
  and `lucide-react` icons, but neither was ever actually installed --
  both are now real `package.json` dependencies, not just assumed by
  the component. `App.tsx` mounts that screen directly so there's a
  real render smoke test once `npm install` runs, but it's still the
  sample-data mockup -- nothing in this pass wired it to `lib/api/`.
- **2026-08-23** — Built `src/features/collection/CollectionScreen.tsx`,
  the first screen wired to a real backend instead of sample data --
  exercises every command from the two prior passes end to end. Two
  choices worth recording: (1) since there's no accounts UI yet,
  `useCollection` silently claims the first local profile or creates a
  "Default Profile" -- a real stopgap, not a design decision about how
  profiles should work; replace once accounts gets designed for real.
  (2) `App.tsx` got a minimal two-tab switcher (not a router) purely so
  this screen is reachable -- `docs/UI_DESIGN.md` and `docs/TODO.md`
  both flag this as a stopgap, not the app-shell/navigation design that
  was already a known open item. Also hoisted the Google Fonts
  `@import`/`.font-mono` class out of `ArmyCreationScreen.jsx`'s
  component-local `<style>` block into `src/index.css`, since
  `docs/UI_DESIGN.md` already named "a shared app shell exists" as the
  trigger to do that, and adding a second screen is exactly that
  trigger. `ArmyCreationScreen.jsx` itself was deliberately left
  unwired -- it needs real faction/unit data *and* unit points (still
  `null` in `units.json`) to be honestly wired, which is a separate,
  larger piece of work than this pass.
- **2026-08-23** — Built army-list save/load
  (`commands/lists.rs`/`db/queries/lists.rs`/`types/army_list.rs`,
  `src/features/list-builder/`). This is what finally wired
  `ArmyCreationScreen.jsx` to real unit data -- `army_list_entries.unit_id`
  is a real foreign key, so there was nothing valid to persist while
  "Add Unit" only produced fake sample rows with no `id`. Three choices
  worth recording: (1) `add_entry` always inserts a new
  `army_list_entries` row (`count = 1`) rather than merging into an
  existing row for the same unit -- matches how the UI already shows one
  row per "Add Unit" click; a future upgrade-loadout picker would make
  merging actively wrong anyway (two rows of the same unit with
  different upgrades aren't the same line item). (2) `points_total`
  stays untouched at the schema's `DEFAULT 0` -- with every unit's
  `points` still `null`, there's nothing real to compute it from, same
  reasoning as every other "don't guess a number" call in this project.
  The UI now shows a plain unit count instead of a points total/limit
  bar. (3) The `"assassins"`/`"mercenary"` and
  `"traditional"`/`"official"` mismatches (both previously flagged as
  open items) got bridged at the save/load boundary in a new
  `uiMapping.ts`, not fixed by renaming either vocabulary.
  `ArmyCreationScreen.jsx` was already past `docs/FILE_STRUCTURE.md`'s
  ~300-line guideline before this pass's additions, so `ModeToggle` and
  `RankSection` were extracted into their own component files (its
  stated fix for exactly this situation) rather than left inline.
  Command cards and the battle deck are still not wired -- no picking UI
  exists for either yet; see `docs/TODO.md`.
- **2026-08-23** — Project development moved to Claude Code for
  hand-coded edits; that channel shifted to "info gatherer" role,
  working one library at a time, filling in unresolved fields rather
  than building new structure. First pass: units.json.
- **2026-08-23** — Fifth-faction naming settled as `shadow_collective`
  (not `mercenary` or `Assassins`) per explicit instruction --
  applied to units.json and its schema only that session.
  factions.json/affiliations.json/battle-forces.json (still say
  "mercenary") and this app's UI label ("Assassins") were deliberately
  left unchanged per scope instruction, but now constitute a known
  three-way naming inconsistency -- see docs/TODO.md.
- **2026-08-23** — The PDF-image-extraction wall hit earlier is solved:
  the project owner ran their own extraction tool against the official
  card PDFs and provided real structured card data. First batch
  (Empire, 28 units + 2 newly-discovered) merged into units.json with
  full stat blocks. This also caught real errors in earlier heuristic
  guesses (several vehicles wrongly marked `unique: true`) and surfaced
  25 keywords used on real cards that don't exist in keywords.json yet.
- **2026-08-23** — Republic batch merged (25 units + 1 new). Adopted a
  rule for handling extraction batches going forward: before merging
  any unit's cost, check it against existing `points_verified: true`
  values first. The Republic extract's PDF snapshot predated the April
  2026 points update for 3 units -- caught because their extract costs
  matched the article's explicit "reduced FROM" values.
- **2026-08-23** — Rebel batch merged (27 units + 1 new, 2 cross-
  faction confirmed). Same stale-cost pattern hit a 3rd time. This
  batch's tool also omitted speed/defense/surge fields entirely (by
  design) -- `stats_verified` stays false on those units even though
  points/wounds/keywords/weapons are solid. R2-D2 confirmed as a
  genuinely shared Rebel/Republic card.
- **2026-08-23** — Separatist batch merged (22 units + 1 new).
  Stale-cost pattern hit a 4th/5th time. New wrinkle: this snapshot is
  a MIXED vintage -- Droidekas correctly show the April 2026 "Heavy
  Droid Trooper" errata, but STAP Riders do NOT show the same update's
  "AI: Dodge" errata (still "AI: Move"). Staleness isn't uniform across
  a whole PDF.
- **2026-08-23** — Shadow Collective batch merged (15 units + 3 new),
  completing the faction-by-faction card-extraction rollout across all
  five factions. Final state: 151 units total, 124 with confirmed
  points, 55 with fully-complete stat blocks. "The Bad Batch" turned
  out to have 3 genuinely distinct cards (Rebel/Republic/Shadow
  Collective), each a different cost.
- **2026-08-23** — Landed the full card-extraction batch above into
  this app's actual schema/types (it had only been narrated in
  docs/TODO.md and pasted units.json/keywords.json content until this
  pass -- verified via `grep` that none of it was on disk yet). Two
  breaking issues found and fixed, not just new fields added: (1) the
  `mercenary` -> `shadow_collective` Faction rename requires the same
  change in `types/common.rs`'s enum, three `0001_init.sql` CHECK
  constraints (`unit_factions`, `command_cards.faction_restriction`,
  `army_lists.faction`), the TS `Faction` type, and `uiMapping.ts` --
  without it, `db/seed.rs` would fail to deserialize the very first
  `shadow_collective` unit on startup. (2) `stats.keywords` is now
  populated with raw printed keyword strings (e.g. "Full Pivot"), not
  ids -- `keywords_resolved_to_library: false` on every unit confirms
  this. The existing seed path wrote `stats.keywords` straight into the
  `unit_keywords` join table, whose `keyword_id` column has a real
  foreign key into `keywords(id)` -- inserting a raw display string
  there would violate that FK on nearly every unit. Fixed by adding a
  `keywords_json` column (same raw-blob treatment as `weapons_json`)
  and removing the `unit_keywords` writes entirely; that table now
  stays empty until a future pass actually resolves strings to ids.
  Also added a new `Rank::Attached` variant (companion units like
  Grogu/Omega/Iden's ID10) and `UnitStats.points_verified` (a real,
  per-unit signal independent of the coarser `stats_verified`, since a
  unit can have a confirmed cost while still missing speed/defense/
  surge) -- used to unlock a real feature: `RankSection`/
  `ArmyCreationScreen` now show actual point costs and a real points
  total for verified units instead of hiding all point data, with
  unpriced entries counted separately rather than treated as free.
  `0001_init.sql` was edited directly rather than via a new numbered
  migration for this -- see the note at the top of that file for why
  (schema has never been executed by a compiled build in this project,
  so "append-only once shipped" doesn't yet apply). `docs/TODO.md` and
  `docs/DECISIONS.md` themselves had also diverged from a separate
  data-focused work session by this point -- merged rather than
  overwritten, so none of this session's Tauri/UI documentation above
  was lost.
- **2026-08-23** — Installed the actual toolchain on this machine for
  the first time (Rust via `rustup`, MSVC C++ Build Tools via `winget`,
  Node.js LTS) and ran real verification: `cargo check`/`cargo test`
  pass clean against the whole crate (both collection regression tests
  pass), `npm run build` passes clean (`tsc` across every hand-written
  TS file, then a real Vite production bundle). Every file written
  across every prior pass in this project compiled/type-checked
  correctly on the first real attempt. One real bug found and fixed:
  `tauri-build` needs `icons/icon.ico` to embed as the exe's Windows
  resource regardless of `bundle.active` -- added a placeholder icon
  (needs real branding before ever distributing a build). Chose MSVC
  over the GNU/MinGW target for the C++ toolchain since this project's
  Tauri/webview2 dependencies are the well-supported path on that
  target, not GNU. Left the `npm audit` esbuild dev-server CORS finding
  unfixed -- it's dev-server-only (doesn't affect the production
  bundle) and the fix is a breaking Vite 5->8 bump, not something to
  apply without being asked.
- **2026-08-23** — Resolved the ~100+-unique-string raw-keyword gap
  (see docs/TODO.md's "Keyword resolution pass"). Chose a two-part
  approach over either alone: (1) a deterministic mechanical resolver
  (`db/seed.rs::resolve_keyword_id`) requiring zero new content --
  strips at the first colon, strips a trailing digit run, kebab-cases,
  then tries the result against known ids directly, then with a `-x` or
  `-x-y` suffix, matching the id-naming convention already used across
  every hand-written entry; (2) a real web-research pass (`WebFetch`
  against swgametools.gyozaguy.com/legion/keywords, a comprehensive
  community keyword glossary) to source real rules text for 44 of the
  genuinely-missing keywords, added to `data/keywords.json` as
  `verified: true` with a citing `verification_note` -- not guessed
  from memory, matching this project's standing rule. The 11 terms no
  checked source had text for were added as explicit `verified: false`
  placeholders rather than left out entirely, so `unit_keywords` can
  still link to them and the UI can honestly show "not yet sourced"
  instead of nothing. Result: 563 of 566 raw keyword occurrences now
  resolve (99.5%); the 3 remaining are a genuine source-data truncation
  (bare "Transport" missing its Open/Closed suffix on 3 units), not a
  missing keyword. `keywords_resolved_to_library` changed from an
  always-`false` passthrough of the source JSON to a real per-unit
  computed value (true only when the unit has keyword data and every
  entry of it resolved).
- **2026-08-23** — Built a real accounts UI
  (`src/features/accounts/ProfilePicker.tsx`), replacing the silent
  `getOrCreateDefaultUser()` stopgap that both `useCollection` and
  `useArmyListBuilder` previously called independently. `App.tsx` now
  owns the selected `userId` for the whole app (remembered across
  restarts via `localStorage`, re-verified against `listUsers()` on
  launch so a stale/invalid remembered id falls back to the picker) and
  passes it down as a required prop -- both hooks were changed to take
  `userId` as a parameter instead of resolving one themselves. No
  backend changes: `commands/accounts.rs` already had `create_user`/
  `list_users`. Deliberately did not add profile deletion/rename in this
  pass -- out of scope for "replace the silent stopgap with a real
  picker," not implied by it.
- **2026-08-23** — Reconciled the `mercenary`/`shadow_collective` naming
  gap in `data/factions.json` and `data/battle-forces.json` (both now say
  `shadow_collective`, matching `units.json` and all Rust/TS code).
  **Deliberately did NOT touch `data/affiliations.json`** -- read it in
  full first and confirmed its "Mercenary" references describe a real,
  distinct Legion game concept (the affiliation that makes a unit
  unaligned and hireable across factions, confirmed via the same day's
  keyword-resolution web research and now also documented in
  `data/keywords.json`'s `mercenary` entry), not this app's
  `shadow_collective` faction id. A blind find-replace across all three
  files would have wrongly conflated the two -- the earlier
  `units.json`/code rename was about this app's playable-faction slot,
  not about renaming the real "Mercenary" rules term everywhere it
  appears. Neither edited file is parsed by any Rust/TS code (checked
  first), so this was a content-only change.
- **2026-08-23** — First real `cargo tauri dev` launches of this project,
  ever. Found and fixed 3 real bugs live: (1) **A systemic seeding bug
  that crashed every second app launch, unconditionally**: every
  `seed_*` function in `db/seed.rs` used `INSERT OR REPLACE`, which is an
  implicit DELETE-then-INSERT; several tables it targets (`keywords`,
  `units`, `upgrades`, `command_cards`, `scenario_objectives`,
  `expansions`) are referenced by other tables with `ON DELETE
  RESTRICT`, and `seed_expansions` itself populates one such reference
  (`expansion_contents_units`) on the very first seed pass -- so the
  *second* pass's implicit delete was always rejected with "FOREIGN KEY
  constraint failed" on startup, no user action required. Fixed by
  converting every one of those six `INSERT OR REPLACE` statements to a
  real `INSERT ... ON CONFLICT(id) DO UPDATE SET ...` upsert, which
  updates in place and never triggers a delete. Added
  `reseeding_twice_does_not_violate_foreign_keys` as a permanent
  regression test. This was invisible to every check run so far
  (`cargo test` seeds a fresh in-memory DB exactly once per test) --
  only surfaced by actually launching the compiled app twice. (2) The
  per-rank unit-count badge in `RankSection.tsx` displayed
  `entries.length` (distinct row count) instead of summing each entry's
  `count` -- a single 50-count entry showed as "1 unit." (3) "Padmé
  Amidala" was mojibake'd as "PadmÃ©" in `data/units.json` (UTF-8
  double-encoding). All three found via the project owner actually using
  the app (creating profiles, army lists, adding units) -- underscores
  that `cargo check`/`cargo test`/`tsc`/`vite build` passing clean is
  necessary but not sufficient; nothing substitutes for actually running
  the thing.
- **2026-08-24** — Built upgrade equipping + a click-to-open unit detail
  popup (`UnitDetailModal.tsx`), wiring up `army_list_entries.upgrades_json`
  end to end for the first time (the column and `ArmyListEntry.upgrades`
  type existed since the list-builder work but nothing wrote to it). New
  backend: `list_keywords`/`list_upgrades` commands (mirroring
  `list_units`), `update_entry_upgrades` query +
  `update_list_entry_upgrades` command. `useArmyListBuilder`'s
  `BuilderEntry` gained `upgrades: string[]`; `RankSection` rows are now
  clickable and show each entry's equipped-upgrade names inline, so two
  entries of the same unit (e.g. two Clone Troopers squads) visibly show
  different loadouts without opening the popup. Two scope decisions made
  up front given real data gaps (`units.json`'s `upgrade_bar` is null for
  all 151 units; `data/upgrades.json` only has 29 generic cards): the
  equip picker is a best-effort open picker (any unit can take any
  generic-category card, banner-flagged as not slot-verified) rather than
  gated on real per-unit slot data that doesn't exist; and a bounded
  research pass sourced real effect text (27 of 29 cards) and points
  (11 of 29, where a single uncontested figure existed) for the existing
  generic cards, left honestly unverified elsewhere rather than guessed
  -- see `data/upgrades.json`'s `_meta.verification_status` and each
  card's `notes`. Also added a unique-unit guard while touching this code
  path (`addUnit`/`setEntryCount` now refuse a second entry or count > 1
  for `unique: true` units) -- directly closes the "50 Padmés" gap found
  the day before. The keyword-description lookup in the popup
  (`keywordResolve.ts`) is a hand-ported TS mirror of
  `db/seed.rs::resolve_keyword_id` -- keep the two in sync if that
  resolver's rules ever change.
- **2026-08-24** — Wired the command-cards picking UI, replacing
  `ArmyCreationScreen.jsx`'s hardcoded `SAMPLE_COMMAND_CARDS`. New
  backend: `list_command_cards` (mirrors `list_units`), `add_command_card`/
  `remove_command_card` queries against `army_list_command_cards`
  (`INSERT OR IGNORE`/`DELETE`, no upsert-vs-restrict hazard since nothing
  references this join table), `add_list_command_card`/
  `remove_list_command_card` commands. `ArmyListWithEntries` gained a
  `command_cards: Vec<String>` field. **Confirmed before building anything
  UI-facing**: `data/command-cards.json` has exactly 4 cards total (the
  full generic set -- Ambush/Push/Assault/Standing Orders); zero of the
  ~70-100 commander-specific cards each commander needs exist yet, so a
  real 7-card hand (2×1-pip + 2×2-pip + 2×3-pip + Standing Orders, per the
  file's own `_meta.command_hand_rule`) can't be built from this library
  regardless of UI. Researching that many commander-specific cards was
  explicitly scoped OUT of this pass (much larger than the 29-card
  upgrade-card research pass) -- the UI wires up real picking against the
  4 cards that exist, with a visible banner stating the hand is a preview,
  not a complete one. Traditional mode filters to generic cards (checking
  `faction_restriction` where set) plus any commander-specific card whose
  `commander_unit_id` is actually in the army; Custom mode shows
  everything, matching this screen's existing Traditional/Custom
  convention.
- **2026-08-24** — Revised the command-cards UI same day, from live
  testing feedback: (1) the always-visible grid became an explicit "+ Add
  Command Card" flow (`AddCommandCardPicker.tsx`, mirrors
  `AddUnitPicker.tsx`) -- selected cards now show as removable chips, add
  is a deliberate action, not "everything legal is pre-toggled." (2) The
  "present commander/operative" pool was checking `rankEntries.commander`
  only; Legion operatives (Boba Fett, etc.) carry personal command cards
  too, so it now checks both ranks (`personalityUnitIds`). (3) Custom-mode
  lists get a scope toggle inside the picker -- "My Army" (default, same
  pool as Traditional), "Same Faction" (any card whose owning
  commander/operative belongs to the chosen faction, even if not in the
  list), "All Cards" (the whole library, unrestricted) -- satisfying the
  project owner's explicit ask for custom lists to reach beyond the
  units-present pool. (4) The dropdown didn't show who a card belongs to
  clearly: generic cards showed nothing after the name (since none of the
  4 seeded cards are commander-specific, this was never visibly broken
  until pointed out), and commander-specific cards' owner name display was
  unverified live. Fixed: every option now reads `{name} — {Any Commander
  | owner name}`, always shown, not conditional.
- **2026-08-24** — Built the battle-deck picking UI (`army_list_battle_deck`),
  same day, same pattern as command cards end to end: `list_scenarios`
  command (flattens `ScenarioLibrary`'s 5 separate arrays -- primary/
  secondary/advantage/recon/narrative -- into one `Vec`, since each item
  already carries its own `category` the frontend filters on, exactly
  like `CommandCard.category`), `add_battle_deck_card`/
  `remove_battle_deck_card` queries, `add_list_battle_deck_card`/
  `remove_list_battle_deck_card` commands, `ArmyListWithEntries` gained
  `battle_deck: Vec<String>`, `AddBattleDeckPicker.tsx` mirrors
  `AddCommandCardPicker.tsx`. Applied this same day's command-card lesson
  proactively: every dropdown option always shows its category (`{name} —
  {Primary Objective | Secondary Objective | ...}`) from the first version,
  not added after the fact. **Data reality, confirmed before building**:
  `data/scenarios.json` has ~6 Primary Objective cards and ZERO Secondary/
  Advantage cards -- sparser than command cards' gap, against a real
  9-card (3 Primary + 3 Secondary + 3 Advantage) deck rule
  (`_meta.battle_deck_rule`). No scope-toggle equivalent to command cards'
  Traditional/Custom split -- scenario objective cards aren't owned by a
  unit or restricted to a faction, they're filtered only by `game_format`
  (mapped from the screen's point-limit preset: 1000 -> `standard-1000`,
  600 -> `recon-600`, a custom limit -> no format filter, since it doesn't
  correspond to a real format). Same "honest preview, not a complete deck"
  banner treatment as command cards.
- **2026-08-24** — First real multi-agent Workflow run in this project, a
  "huge fill pass" the project owner explicitly opted into (picking
  "Units & rosters" and "Army structure" as the priority areas, over
  Cards and Keywords). 14 agents launched in parallel; 9 hit an account-
  level session usage limit partway through and failed (not a research
  failure -- see docs/TODO.md's matching entry for exactly which and the
  retry plan). The 5 that completed produced real, high-quality, cited
  data, applied to the real files after independently cross-checking
  every referenced unit id against the actual `data/units.json` roster
  (the agents researched blind, without file access, so this check
  mattered -- every single id they referenced turned out correct):
  - **6 of the 8 remaining Battle Forces** (Blizzard Force, Imperial
    Remnant, Bright Tree Village, Separatist Invasion Force, Experimental
    Droids, Wookiee Defenders) went from `fully_detailed: false` to real
    allowed-units/rank-requirements/special-rules data, each fetched from
    its actual official PDF (two dead source URLs found and replaced with
    working ones in the process). Only Tempest Force and Echo Base
    Defenders remain undetailed -- their agent hit the session limit.
  - **The standard (non-Battle-Force) army rank-requirement table** --
    the gap explicitly called out in `data/factions.json`'s own `_meta`
    since the session that first distinguished it from Battle-Force-
    specific tables -- is now real, sourced by fetching the actual
    current Core Rulebook PDF and extracting its text directly (not a
    summary). Added as `factions.json`'s new `standard_army_rank_requirements`
    field.
  - **A "newer releases" investigation** confirmed the Mandalorian Clans
    Battle Force and the Jedi Council Commander Expansion (SWQ143) are
    both real, shipped products (June 2026 and Aug 21 2026 respectively)
    -- while correctly identifying that the "scoundrel-era Han &
    Chewbacca" and "Leaders of the Separatist Alliance" releases, though
    real, have NOT shipped yet (still preorder, per the publisher's own
    store), so neither was added. Only the 4 Jedi Council units (Mace
    Windu, Ki-Adi-Mundi, Plo Koon, Shaak Ti) were added to `units.json`,
    as roster-only stubs (`roster_verified: false`, all stats null,
    matching exactly how the original 142-unit roster started) --
    Mandalorian Clans' units were deliberately NOT added despite being
    confirmed-real, because the research itself flagged several of them
    ("Grogu," "Mandalorian Warriors, Fire Support") as unclear
    classifications, and Grogu already exists in `units.json` as a
    Shadow Collective unit, so adding it again would likely have been a
    duplicate. Logged as a real, confirmed gap for a dedicated pass
    instead of stretching uncertain agent output into the data file.
