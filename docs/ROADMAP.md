# Path to "Complete" (v1)

Full audit pass, 2026-08-25. This is a prioritized punch list, not a
history — `docs/TODO.md` has the full dated narrative behind every
item here, and stays the source of truth for granular data-verification
tracking. This doc exists to answer one question: what's actually
between here and calling the app done, in its current planned scope
(list builder + collection tracker + campaigns — the campaign-system
placeholder from the original architecture plan is long since built
out, not a v1 gap anymore).

Method: read every doc, grepped the codebase for stub/TODO markers,
checked test coverage file-by-file, ran the actual compiled app and
watched it crash on launch, fixed what that revealed, then confirmed
the fix live. Not done this pass: a full manual click-through of every
screen — an attempt at automated UI testing went wrong (see the
2026-08-25 note in `docs/DECISIONS.md`) and was abandoned in favor of
code-level verification. So: functional testing here is real
(`cargo test`, `npm test`, live launch), but no one has clicked through
Collection or Campaigns screens recently to confirm they still render
right.

## P0 — Blocking, found this pass

- [x] **Migration edits don't reach already-created databases — fixed
      2026-08-25.** `src-tauri/migrations/0004_repair_command_cards_check.sql`
      rebuilds `command_cards` (SQLite's documented create-new/copy/
      drop-old/rename-new procedure, since CHECK constraints can't be
      altered in place) to converge every database -- old, already-
      current, or brand new -- to the schema now in `0001_init.sql`.
      Verified three ways: a new regression test
      (`db::migrate::tests::repairs_a_pre_0004_command_cards_table_without_losing_referencing_data`)
      that reproduces the old CHECK, proves it really rejects the
      shape of row the command-card expansion needs, applies the
      repair, and proves the same insert now succeeds with the FK-
      referencing child row still intact; `cargo test` (23/23); and a
      live launch of the actual compiled app against the real stale
      database file that crashed earlier in this pass -- it now seeds
      cleanly and both pre-existing profiles on that database survived
      untouched. **Also added a rule going forward** (in the new
      migration's own header comment): `0001_init.sql` does not get
      edited in place again now that real installs exist -- every
      future schema change is a new numbered migration.

## P1 — Core functionality gaps (the app does less than it claims)

- [ ] **Command hand and battle deck are still previews, not the real
      thing, for most factions -- blocked on remaining content, not
      code.** The command-card library is 232 entries now, but a legal
      7-card hand (2×1-pip + 2×2-pip + 2×3-pip + Standing Orders, no
      duplicates) needs enough commander-specific cards per character to
      actually fill it -- still thin outside the pattern established for
      characters already covered. Battle deck is **partly unblocked as
      of 2026-08-25**: `data/scenarios.json` now has all 10 current
      Primary Objectives (was 3), but still only 1 Secondary Objective
      and zero Advantage cards, against a real 9-card (3+3+3) deck
      requirement -- a full deck genuinely can't be built yet no matter
      how good the Primary coverage is. Both pickers are honestly
      banner-flagged as previews in the UI. Full breakdown in
      `docs/TODO.md`'s "Scenarios library gaps."
- [ ] **`upgrade_bar` is null for all 155 units -- blocked on content,
      not code.** The per-unit upgrade picker (`UnitDetailModal.tsx`)
      is explicitly "best-effort" because there's no real slot data to
      validate against. No source material for this exists yet.
- [x] **Collection tracking and list building now talk to each other
      -- built 2026-08-25.** `useArmyListBuilder` fetches the same
      `getUserUnitOwnership`/`listOwnedExpansions` data the Collection
      screen uses. `RankSection.tsx` flags a shortfall ("only 2 owned,
      need 4") on any list entry that exceeds what the profile owns.
      `AddUnitPicker.tsx` annotates every unit in the add-unit dropdown
      with its owned count and adds an "Owned only" filter checkbox.
      Deliberately gated behind `hasCollectionData` (true only once a
      profile has recorded at least one owned expansion) so a profile
      that's never touched the Collection screen sees the builder
      exactly as before, not a wall of false "not owned" warnings.
      Verified via `npm run build` (clean) and `npm test` (25/25,
      unaffected -- no test coverage added here, see P4 below). Not
      live-clicked-through in the running app this pass (see this
      doc's intro).
- [x] **56 unresolved command cards -- 15 more resolved 2026-08-25,
      41 remain (a real content gap, not a code gap).** Real card data
      proved a single `commander_unit_id` column couldn't represent
      every card's ownership shape: some cards are jointly owned by two
      named units, both required ("Fifth Brother & Seventh Sister"),
      and some are owned by either of two, one sufficing ("Jedi Knight
      or Jedi Knight General"). Replaced with a real
      `command_card_commanders` join table (migration
      `0005_command_card_commanders.sql`) plus a `commander_ownership`
      ("all"/"any") column, and used it to resolve 11 joint-owner cards
      and 4 either-owner cards against the real `units.json` roster.
      `AddCommandCardPicker.tsx`'s scope-gating logic now checks
      "all owners present" vs. "any owner present" correctly instead of
      just a single id. The remaining 41 are a genuine data gap (named
      characters not yet in `units.json` -- Grand Admiral Thrawn, Grand
      Moff Tarkin, Bo-Katan Kryze, others -- or generic restriction text
      with no named owner at all) -- not resolvable without more source
      material. Full breakdown in `docs/TODO.md`'s "Command cards
      library gaps." Verified via new regression tests in `db::migrate`
      (one reproduces the old single-column schema and proves the
      migration moves its data into the join table AND allows a second
      owner the old schema never could; `cargo test` 24/24 including
      the reseed-twice regression), `npm run validate:data` (9/9), and
      `npm run build`/`npm test` (25/25).

## P2 — Data completeness (large, ongoing, the biggest bucket)

- [ ] **Units** (155 total): 124 have confirmed points, 55 have fully
      verified complete stat blocks (Empire + Republic only), 27 have
      zero stat data at all.
- [ ] **Upgrades** (100 entries): zero cards in 8 of 15 categories
      (Armament, Hardpoint, Pilot, Doctrine, and others); real
      faction-specific coverage beyond Galactic Empire's 5 Stormtrooper
      heavy-weapon options and the shared named-character cards is
      essentially unresearched for Republic, Rebel, Separatist,
      Mercenary/Shadow Collective, and Mandalorian.
- [ ] **Scenarios**: thinnest library in the app — 3 confirmed Primary
      Objectives, 0 Secondary Objectives, 0 Advantage cards, 0
      Recon-format (600pt) cards, 0 narrative Scenario cards.
- [ ] **Affiliations**: the 5 names and order-issuing rule are
      confirmed, but exact unit membership for Raiders, Rogues, and
      Maul Loyalists was never confirmed card-by-card.
- [ ] **Battle Forces**: 8 of 10 fully detailed; Tempest Force and Echo
      Base Defenders are not.
- [ ] **Mandalorian Clans battle force isn't in the app at all yet** —
      confirmed real and shipped, deliberately not added because
      several of its units (Grogu, "Mandalorian Warriors, Fire
      Support") had unresolved classification questions.
- [ ] **Card image/text database**: not started. No images, no scraped
      card text, nothing — this is the feature the originally-planned
      scraper exists to eventually solve.
- [ ] `keywords.json` (165 entries): a meaningful subset — including
      the 2 added this pass (`smoke-x`, `mechanized-infantry`) and the
      11 left over from the 2026-08-23 resolution pass — are marked
      `verified: false` pending a real glossary cross-check.

## P3 — Unbuilt features from the original plan

- [ ] **Rules-update checker / scraper**
      (`src-tauri/src/scraper/`): zero code — the directory holds only
      a `_PURPOSE.md` file. This was one of the original project goals
      (detect new official rules/points/errata and surface a diff for
      approval) and hasn't been started.
- [ ] Card scraper (the thing that would actually populate the image/
      text database above): same status, unbuilt.

## P4 — Test coverage gaps

- [ ] **Rust query layer**: `db/queries/lists.rs`, `accounts.rs`,
      `campaigns_content.rs`, `campaigns_core.rs`, and
      `campaigns_detail.rs` have zero tests. (`campaigns_play.rs` and
      `collection.rs` do have real regression tests — that's the bar
      the rest should be held to.)
- [ ] **Frontend components**: only `ProfilePicker` has a real
      render/interaction test. Zero tests for `ArmyCreationScreen` and
      its 7 sub-components, `CollectionScreen` and its 3
      sub-components, and the entire campaigns feature (2 screens + 6
      components).
- [ ] **Hooks**: zero tests for `useArmyListBuilder`, `useCollection`,
      `useCampaign`, `useCampaignList` — the four places that actually
      hold screen state and call into the backend.
- [ ] `tests/domain/` is an empty placeholder (just `_PURPOSE.md`) —
      domain logic genuinely is tested, but inline inside
      `src-tauri/src/domain/*.rs` rather than in this tree, which
      doesn't match `FILE_STRUCTURE.md`'s own stated plan. Structural
      mismatch, not a coverage gap.

## P5 — Distribution / release readiness

- [ ] `tauri.conf.json`'s `identifier` is still the placeholder
      `dev.legion-app.desktop` — needs a real reverse-domain id before
      any real distribution.
- [ ] `icons/icon.ico` is a placeholder, not real app branding.
- [ ] **No CI at all.** Schema validation, `cargo test`, and `npm
      test` only run when someone remembers to run them locally —
      nothing stops a bad commit from landing.
- [ ] No `LICENSE` file.
- [ ] `npm audit` flags a moderate esbuild dev-server CORS advisory —
      dev-only, doesn't ship in the production build, but the fix
      needs a breaking Vite 5→8 bump that hasn't been evaluated.
- [ ] Only Windows installers have ever been built. Linux support was
      a stack goal from day one (Tauri supports it natively) but has
      never actually been built or run. Android is untouched.

## P6 — Open decisions (not code gaps — need your call)

- [ ] Local profile PIN/password: worth adding, or is "whoever has the
      device" fine?
- [ ] Cross-device sync (desktop ↔ Android later): in scope, or
      explicit export/import only?
- [ ] "Doctrine" upgrade category: keep as its own category, or fold
      into Training? (Currently unconfirmed which it really is.)
- [ ] License terms for the repo, if it's ever made public or shared
      beyond you.
- [ ] Android distribution timeline, if any — affects whether signing/
      keystore setup is worth doing soon or can wait indefinitely.
