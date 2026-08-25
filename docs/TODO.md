# TODO / Known Gaps

Living tracker. Update this in place as items are resolved -- move
resolved items to the "Resolved" section at the bottom with a date
instead of deleting them, so there's a record of what was decided and
when. This file exists so incomplete work survives across chat sessions
and CC handoffs instead of getting silently forgotten.

## Data verification

- [x] **Units library (`data/units.json`)** — grown from the original
      142-entry roster-only stub to **151 units** via a faction-by-faction
      card-extraction rollout completed 2026-08-23 (see "Points gathering
      pass" and the five "Card extraction pass" sections below, and
      "Extraction rollout complete" for the full summary). Status per field:
      - `factions`, `rank`, `legality` (active/removed): sourced
        directly, `roster_verified: true`.
      - `unique`, `unit_types`: heuristic guesses (name-pattern based)
        for units not touched by an extraction batch, each with its own
        `*_verified: false` flag; **corrected to `true` from real card
        data for every extracted unit** (several were wrong, e.g.
        vehicles previously marked `unique: true`).
      - `affiliation`: Black Sun, Pyke Syndicate, and Mandalorian
        (Gar Saxon, Mandalorian Super Commandos) now populated from
        extraction; still not confirmed card-by-card for every case.
      - **`stats`: 124 of 151 units now have a confirmed, real
        `points` value** (`points_verified: true`, `points_source`
        cited), and **55 of 151 have a fully-verified complete stat
        block** (points + wounds + courage/resilience + speed + defense
        die + surges + weapons + keywords -- Empire and Republic only,
        the two extraction tools that included speed/defense/surge
        data). The remaining 96 priced-but-incomplete units are missing
        only speed/defense_die/attack_surge/defense_surge, by design of
        the tools used for those batches -- a real, well-scoped gap, not
        a mystery. 27 units still have zero stat data (not covered by
        any extraction batch). See "Extraction rollout complete" below
        for the full breakdown, including 7 caught stale-cost conflicts
        and a ~100+-entry running list of unresolved raw keyword
        strings.
      - **Known coverage gap**: the original roster snapshot likely
        predates several 2026 releases referenced in AdeptiCon 2026
        coverage -- the Mandalorian Clans battle force (Bo-Katan Kryze,
        Axe Woves, Paz Vizsla), the "scoundrel era" Han Solo/Chewbacca
        mercs (beyond what extraction covered), the Jedi Council pack,
        and the Leaders of the Separatist Alliance pack (Admiral
        Trench). None of these are in `units.json` yet.
- [x] `data/keywords.json` — grown from ~85 to **108 entries**; ~19 new
      keywords confirmed and added during the same 2026-08-23 pass
      (Advanced Targeting, Agile X, Aid, Assault X, Associate, Ataru
      Mastery, Attack Run, Backup, Barrage, Bolster X, Cache, Calculate
      Odds, Command Vehicle X, Complete the Mission, Contingencies X,
      Coordinate: [Unit Name/Type], Counterpart, Covert Ops, Cycle).
      Keywords **E through Z beyond these new entries are still**
      marked `"verified": false` -- this pass added new confirmed
      entries, it did not go back and verify the original unverified
      range.
- [x] **Keyword resolution pass (2026-08-23, same day)**: built a
      mechanical raw-string-to-id resolver
      (`db/seed.rs::resolve_keyword_id`) and populated the previously-empty
      `unit_keywords` join table for real. Grew `data/keywords.json` from
      108 to **163 entries** to cover the ~100+-unique-string gap noted
      below -- 44 sourced from a real keyword glossary
      (swgametools.gyozaguy.com/legion/keywords, cross-checked 2026-08-23)
      or a corroborated secondary source, marked `verified: true`; 11 left
      as honest `verified: false` placeholders where no rules text could
      be found anywhere checked (Combat Shield, Death from Above,
      Distract, Hold the Line, Hunted, "I'm Part of the Squad Too",
      Infinite Power, Interrogate, One Step Ahead, Small, Weighed Down) --
      see each entry's `verification_note`. **Result: 563 of 566 raw
      keyword occurrences across all 151 units now resolve (99.5%)** and
      `unit_keywords` is populated accordingly; `keywords_resolved_to_library`
      is now computed per-unit at seed time instead of always `false`.
      **The 3 remaining unresolved occurrences are all bare "Transport"**
      (missing its "Open"/"Closed" suffix in the raw extraction text on 3
      units) -- a genuine source-data truncation, not a missing-keyword
      gap; not guessed at. Run
      `cargo test --lib db::seed:: -- --nocapture` (from `src-tauri/`, in
      PowerShell) to reproduce the diagnostic and see the exact
      unresolved list.
- [x] **First real app launches -- 2026-08-23, found and fixed 3 live
      bugs.** See docs/DECISIONS.md's matching entry for full detail.
      Highlights: (1) every `db/seed.rs` seed function's `INSERT OR
      REPLACE` was an implicit delete-then-insert that a RESTRICT-FK'd
      child table would reject on any second app launch -- fixed with
      real `ON CONFLICT DO UPDATE` upserts across all six seed
      functions, plus a new `reseeding_twice_does_not_violate_foreign_keys`
      regression test; (2) `RankSection.tsx`'s per-rank unit-count badge
      summed `entries.length` instead of each entry's `count`; (3)
      "Padmé Amidala" was mojibake'd as "PadmÃ©" in `data/units.json`.
      None of these were caught by `cargo check`/`cargo test`/`tsc`/
      `vite build` -- only surfaced by actually running the compiled
      app, twice, with real usage in between.
- [ ] Spot-check whether unparameterized "Armor" (cancel-all-hits, no X
      value) is genuinely gone from the current rules, or just not
      surfaced by the source used for the A-D check. Cross-reference
      against Atomic Mass Games' own PDF Core Rulebook directly if
      possible: https://www.atomicmassgames.com/swlegiondocs/
- [ ] Card image/text database is unpopulated. No scraper has been
      built yet.
- [ ] `src-tauri/src/scraper/rules_update_checker.rs` is an unbuilt
      stub -- the "check for new rules" feature doesn't exist yet.

## Library build order (per project owner's instruction)

1. [x] Keywords library (`data/keywords.json`) -- built, partially verified.
2. [x] Units library (`data/units.json`) -- roster built and verified;
       stats still need populating (see above).
3. [x] Upgrades library (`data/upgrades.json`) -- **seed only.** 29
       generic (non-faction) cards populated across 6 categories
       (Command, Comms, Force, Gear, Grenades, Training), names
       confirmed via a live source. See "Upgrades library gaps" below
       -- this is the least complete library so far, by a wide margin.
4. [x] Command cards library (`data/command-cards.json`) -- grown
       2026-08-24 from the original 4-card generic-only seed to **232
       cards**, `commander_unit_id` resolved for 117 of the 173
       commander-specific ones. See "Command cards library gaps" below.
5. [x] Scenarios/objectives library (`data/scenarios.json`) --
       **thinnest seed yet.** See "Scenarios library gaps" below --
       this one surfaced a genuinely important finding, not just a
       coverage gap.
6. [x] Code scaffolding for CC -- Rust canonical types
       (`src-tauri/src/types/*.rs`), a hand-written TypeScript mirror
       (`src/lib/types/manual_seed.ts`), and a SQLite migration
       (`src-tauri/migrations/0001_init.sql`). See "Code scaffolding
       status" below.
7. [x] Affiliations (`data/affiliations.json`), Battle Forces
       (`data/battle-forces.json`), Factions (`data/factions.json`) --
       sourced from two REAL official AMG PDFs, not secondary sites.
       See "Affiliations/Battle Forces/Factions status" below -- this
       round caught and corrected a mistake before it shipped.
8. [x] Collection tools groundwork -- `data/expansions.json` (product/
       retail-box reference library), `0002_collection.sql` (ownership
       tracking schema), Rust/TS types for both. See "Collection tools
       status" below. This is genuinely well-validated, not just
       hand-reviewed -- see the note.
9. [x] Army Creation screen -- first UI screen, establishes the visual
       design system for all future screens. See "UI status" below and
       `docs/UI_DESIGN.md`.
10. [x] Tauri backend bootstrap + collection-tracking command layer --
        the crate didn't exist before this; see "Backend bootstrap
        status" below.
11. [x] Army list save/load -- see "Backend bootstrap status" below.
12. [x] Units library points-gathering pass (2026-08-23) -- see "Points
        gathering pass" below.
13. [x] Empire card-data extraction merge (2026-08-23) -- see "Card
        extraction pass -- Empire batch" below. First faction with real,
        complete stat blocks.
14. [x] Republic card-data extraction merge (2026-08-23) -- see "Card
        extraction pass -- Republic batch" below. Caught a real
        stale-source conflict this time, not just new data.
15. [x] Rebel card-data extraction merge (2026-08-23) -- see "Card
        extraction pass -- Rebel batch" below. Resolved the open R2-D2
        question and confirmed a 3rd stale-snapshot conflict.
16. [x] Separatist card-data extraction merge (2026-08-23) -- see "Card
        extraction pass -- Separatist batch" below. Found a
        mixed-vintage snapshot, not just stale points this time.
17. [x] Shadow Collective card-data extraction merge (2026-08-23) --
        see "Card extraction pass -- Shadow Collective batch" below.
        **This completes the faction-by-faction rollout.**
18. [x] Landed the card-extraction batch into the app's real
        schema/types/UI (2026-08-23) -- the data above existed only as
        JSON content and docs narration until this pass wrote it to
        disk and fixed two breaking issues it caused (the
        `shadow_collective` Faction rename, and a foreign-key hazard in
        how raw printed keywords were being seeded). See "Backend
        bootstrap status" below.
19. [ ] Anything else identified along the way.

## Points gathering pass (2026-08-23) -- units.json only

- [x] **16 units now have confirmed, current points** (`stats.points`
      populated, `stats.points_verified: true`, `stats.points_source`
      cited): the-bad-batch-rebel (150), the-bad-batch-republic (160),
      rebel-commandos (42), wookiee-warriors-freedom-fighters (62),
      wookiee-warriors-kashyyyk-resistance (62), imperial-special-forces
      (56), range-troopers (60), maul (115), bx-series-droid-commandos
      (60), tx-130-saber-class-fighter-tank (145),
      wookiee-warriors-noble-fighters (62),
      wookiee-warriors-kashyyyk-defenders (62), maul-shadow-collective
      (130), pyke-syndicate-capo (42), wicket (64),
      imperial-death-troopers (66). Sourced from the official AMG April
      2026 Rules & Points Developer Update plus one tournament-analysis
      article for Death Troopers' base cost.
- [x] **Real correction found via this data**: "the-bad-batch" was
      previously one merged unit entry with `factions: [rebel,
      republic]`. The points update lists DIFFERENT costs for the two
      (150 vs 160), proving they're distinct cards despite sharing a
      name/concept. Split into `the-bad-batch-rebel` and
      `the-bad-batch-republic`.
- [x] **Faction renamed `mercenary` -> `shadow_collective`** throughout
      units.json (143 units checked, 3 affected), per explicit
      instruction. Schema (`unit.schema.json`) updated to match.
- [x] **Cross-file naming gap** -- `data/factions.json`,
      `data/affiliations.json`, and `data/battle-forces.json` still say
      `mercenary`, not `shadow_collective`; this app's UI displays
      "Assassins" for the same faction. Three different names for the
      same faction existed across the project. **Now narrower**: as of
      the 2026-08-23 landing pass, this app's Rust/TS types and
      `uiMapping.ts` also say `shadow_collective`, matching units.json --
      only the three untouched data files above still say `mercenary`.
      See "Affiliations/Battle Forces/Factions status" below.
      **Reconciled 2026-08-23** (same day, later pass): `data/factions.json`'s
      `mercenary` entry (`id` and `name`) and `data/battle-forces.json`'s
      `shadow-collective` entry's `faction` field are now `shadow_collective`,
      matching everywhere else. **`data/affiliations.json` was deliberately
      left unchanged** -- checked its full content first (per this pass'
      plan) and confirmed "Mercenary" there refers to a real, distinct
      Legion game concept (the affiliation/keyword that makes a unit
      unaligned and hireable across factions -- see data/keywords.json's
      new `mercenary` entry, sourced during the same day's keyword
      resolution pass), not this app's `shadow_collective` faction id. A
      blind find-replace would have wrongly conflated the two. Neither
      file is parsed by any Rust/TS code (confirmed before editing), so
      this was a content-only change with no compile/type-check risk.
- [ ] **Real technical limitation, worth knowing for future sessions**:
      AMG's official per-faction Unit Card PDFs have a text layer with
      only copyright boilerplate; card data is baked into image/vector
      art, not extractable as text without OCR. Full stat coverage
      remained unreachable until the project owner ran a separate
      extraction tool and provided real structured card data directly
      (see the five "Card extraction pass" sections below) -- this is
      exactly the gap the originally-planned "scraper" feature exists
      to solve.

## Card extraction pass (2026-08-23) -- units.json only, Empire batch

- [x] **30 units now have complete, real stat blocks** (points, base
      count, wound threshold, courage/resilience, speed, defense die,
      attack/defense surge, full weapon profiles, printed keywords) --
      28 existing Empire units updated, 2 new units created
      (`df-90-mortar-trooper`, `idens-id10-seeker-droid`). Source: a
      real extraction the project owner ran against the official AMG
      Galactic Empire Unit Cards PDF.
- [x] **Schema extended** to represent what the real data actually
      contains: `subtitle`, `resilience` (vehicles use this instead of
      courage), `attack_surge`/`defense_surge`, `weapons_verified`,
      `keywords_resolved_to_library`, and a new `rank: "attached"`
      value for companion/detachment units (the ID10 droid, the DF-90
      Mortar Trooper) not independently chosen in list-building.
- [x] **`unique` corrected for several units** wrong from the original
      heuristic guess: 74-Z Speeder Bikes, Dewback Rider, AT-ST,
      TX-225 GAVw Occupier Tank were previously marked `unique: true`;
      real card data confirms they are NOT unique.
- [x] **`unit_types` corrected/confirmed for all 30** from the card's
      actual printed type line rather than name-pattern guesses.
- [x] **Keyword cross-reference: 59 of 84 raw printed keyword strings
      in this batch plausibly match an existing `keywords.json` entry;
      25 do NOT** (Prepared Position, Detachment: X, Unstoppable,
      Interrogate, Field Commander, Retinue: X, Special Issue: X,
      Guidance: X, Direct: X, Hold the Line, Hover: Air X, Master of
      the Force X, Reliable X, Ruthless, Small, Speeder X, Spur,
      Tactical X, Unconcerned, Flexible Response X). `stats.keywords`
      stores the raw printed text as-is, NOT resolved ids --
      `keywords_resolved_to_library: false` on every unit in this
      batch. **Resolved 2026-08-23** by the keyword resolution pass
      above -- all but "Interrogate", "Hold the Line", and "Small" now
      have real `keywords.json` entries and resolve.
- [ ] **Weapon `dice` values stored as printed strings** (e.g. "1R +
      2B + 2W"), not parsed into structured `{red, black, white}`
      counts. Deliberate -- the raw string is lossless and unambiguous;
      consider structuring later if list-building needs to compute
      attack pools programmatically.
- [ ] This was Empire only. Republic, Rebel, Separatist, and Shadow
      Collective still needed the same treatment at the time -- now
      done, see the batches below.

## Card extraction pass (2026-08-23) -- units.json only, Republic batch

- [x] **25 existing units updated, 1 new unit created**
      (`c-3po-human-cyborg-relations`). 55 units total now have
      fully-verified stat blocks.
- [x] **Important catch: this extract's PDF snapshot predates the
      April 2026 points update for at least 3 units.** Wookiee Warriors
      (Kashyyyk Defenders), Wookiee Warriors (Noble Fighters), and
      TX-130 Saber-class Fighter Tank all matched PRE-update costs.
      **Kept the already-verified current points for these 3** and did
      NOT overwrite them with the extract's stale values -- all other
      stats were still merged in. Logged per-unit in `stats.points_source`.
      **Rule adopted for all future batches**: check every extract cost
      against `points_verified: true` values before trusting it.
- [x] **Two-source cross-validation**: LAAT/le Patrol Transport appears
      in both the Empire and Republic extracts with identical stats --
      independent confirmation, good confidence signal.
- [x] Keyword cross-reference: 48 of 74 raw keyword strings plausibly
      resolve to existing `keywords.json` entries; 26 do not (Duelist,
      Djem So Mastery, Soresu Mastery, Master of the Force X, Equip: X,
      Direct: X, Detachment: X, Guidance: X, Hover: Ground, and
      others). **Resolved 2026-08-23** by the keyword resolution pass
      above.
- [ ] Republic still incomplete -- Jedi Knight, Jedi Knight General,
      Hondo Ohnaka, and others remain unpopulated.

## Card extraction pass (2026-08-23) -- units.json only, Rebel batch

- [x] **27 existing units updated, 1 new unit created**
      (`mark-ii-medium-blaster-trooper`). 2 units (R2-D2, C-3PO Human
      Cyborg Relations) cross-confirmed as genuinely shared cards.
- [x] **Resolved the open R2-D2 question from the Republic batch** --
      this extract's R2-D2 is IDENTICAL to the Republic one, confirming
      a real shared card, not a same-name-different-card situation like
      "The Bad Batch."
- [ ] **This extraction tool provided a smaller field set than Empire/
      Republic** -- 34 Rebel units now have confirmed points/wounds/
      courage/keywords/weapons but NOT speed/defense die/surge;
      `stats_verified` is deliberately `false` on all of them for this
      reason, not because the populated fields are in doubt.
- [x] **Third instance of the stale-PDF-snapshot pattern**: Rebel
      Commandos, Wookiee Warriors (Freedom Fighters), Wookiee Warriors
      (Kashyyyk Resistance) all matched the April-2026-update's
      "reduced FROM" values again.
- [x] Keyword cross-reference: 52 of 74 resolve; 22 do not (Duelist,
      Jar'Kai Mastery, Master of the Force X, Teamwork: X, Detachment:
      X, Equip: X, Guidance: X, Field Commander, Allies of Convenience,
      One Step Ahead, and others). **Resolved 2026-08-23** by the
      keyword resolution pass above -- all but "One Step Ahead" now
      have real `keywords.json` entries and resolve.
- [ ] Rebel still incomplete -- Boba Fett (Daimyo), Din Djarin, Hondo
      Ohnaka, Rebel Agent, Wicket's full card, and others remain.

## Card extraction pass (2026-08-23) -- units.json only, Separatist batch

- [x] **22 existing units updated, 1 new unit created**
      (`geonosian-warriors-geonosian-engineers`, confirmed via its
      "Special Issue: Rapid Interdiction Force" keyword to be the new
      unit mentioned in the April 2026 update).
- [x] **4th/5th instances of the stale-cost pattern**: BX-Series Droid
      Commandos and Maul both matched pre-April-2026 values again.
- [ ] **New finding, different from pure staleness: this snapshot is a
      MIXED vintage.** Droidekas show `Heavy Droid Trooper`/Courage,
      matching the April 2026 errata. STAP Riders show "AI: Move" where
      the same update says it was errata'd to "AI: Dodge" -- does NOT
      match. **Kept the extract's literal "AI: Move" text** rather than
      silently "correcting" it. Staleness isn't all-or-nothing per PDF.
- [x] Added `Heavy Droid Trooper` to the type-mapping table (maps to
      `["trooper", "droid"]`).
- [x] Keyword cross-reference: 48 of 77 resolve; 29 do not (Death from
      Above, Weighed Down, Makashi/Juyo/Jar'Kai Mastery, Override,
      Strategize X, Programmed, Retinue, Wheel Mode, Self-Destruct X,
      and others). **Resolved 2026-08-23** by the keyword resolution
      pass above -- all but "Death from Above" and "Weighed Down" now
      have real `keywords.json` entries and resolve.
- [ ] Separatist still incomplete -- Bossk, Cad Bane, Hondo Ohnaka,
      Super Tactical Command Droid, and others weren't in this batch.

## Card extraction pass (2026-08-23) -- units.json only, Shadow Collective batch (FINAL)

- [x] **15 existing units updated, 3 new units created** (Grogu, Omega,
      and a third distinct "The Bad Batch" card specific to Shadow
      Collective). **12 of the updated units gained `shadow_collective`
      added to their `factions` array** -- confirming these mercenary
      units are genuinely usable across all five factions.
- [x] **"The Bad Batch" now has 3 confirmed distinct cards**: Rebel
      (150pts), Republic (160pts), Shadow Collective (140pts) -- all
      different costs, all genuinely separate cards sharing a name/
      concept. The Shadow Collective version's card face oddly showed
      NO keywords and no weapons -- flagged rather than guessed at;
      likely explanation is that its rules are split onto its
      counterpart card (Omega), but that's not confirmed.
- [x] **6th and 7th stale-cost conflicts**: Pyke Syndicate Capo and
      Maul/Shadow Collective -- both match pre-April-2026 values again.
      This specific PDF (`DOC13_Mercenary_Units.pdf`) was independently
      identified as a 2025/04 upload, older than the other batches'
      PDFs -- consistent with, and a good explanation for, the
      staleness.
- [x] **A-A5 Speeder Truck cross-validated exactly** against the
      Rebel-faction version already merged.
- [x] Keyword cross-reference: 34 of 49 resolve; 15 do not (Juyo
      Mastery, Allies of Convenience, Hunted, Infinite Power, "I'm Part
      of the Squad Too," Wound X, Combat Shield, and others).
      **Resolved 2026-08-23** by the keyword resolution pass above --
      all but "Hunted", "Infinite Power", "I'm Part of the Squad Too",
      and "Combat Shield" now have real `keywords.json` entries and
      resolve (those 4 are genuinely new/obscure enough that no source
      checked had rules text for them; left as honest unsourced
      placeholders).

## Extraction rollout complete -- summary across all 5 factions

- **Total units in the library: 151** (was 142 at the start of this
  rollout -- 9 new units discovered via extraction: DF-90 Mortar
  Trooper, Iden's ID10 Seeker Droid, C-3PO Human Cyborg Relations,
  Mark II Medium Blaster Trooper, Geonosian Warriors/Geonosian
  Engineers, Grogu, Omega, and a 3rd "The Bad Batch" variant).
- **124 of 151 units have confirmed current points.**
- **55 of 151 units have fully-verified complete stat blocks** --
  Empire and Republic only, the only two extraction tools that
  included speed/defense/surge data.
- **The remaining 96 units with points but not a full stat block** are
  Rebel/Separatist/Shadow-Collective units missing only speed/
  defense_die/attack_surge/defense_surge, by design of those
  extraction tools.
- **7 stale-cost conflicts caught and correctly resolved** across all
  batches by cross-checking against the official April 2026 points
  update before trusting any extract's cost.
- **1 mixed-vintage snapshot finding** (Separatist) -- staleness isn't
  uniform per-PDF.
- **A running list of ~100+ unique raw keyword strings used on real
  cards that don't resolve to `keywords.json`** had accumulated across
  all five batches. **Resolved 2026-08-23**: 563 of 566 raw keyword
  occurrences across all 151 units now resolve into the real
  `unit_keywords` join table (99.5%) -- see the "Keyword resolution
  pass" entry under "Data verification" above for the full breakdown.
- **27 units still have zero data** (not covered by any extraction
  batch -- e.g. Imperial Officer, Jedi Knight, Rebel Agent). A real
  research pass to fill these is queued and ready to retry -- see "Fill-
  pass retry queue" below.
- **+4 units added 2026-08-24**: Mace Windu, Ki-Adi-Mundi, Plo Koon,
  Shaak Ti (Jedi Council Commander Expansion, confirmed real and shipped
  Aug 21 2026 via the same fill pass) -- roster-only stubs
  (`roster_verified: false`, no stats), same treatment as the original
  roster before extraction. **Library total is now 155, not 151.**

## UI status

- [x] `src/features/list-builder/ArmyCreationScreen.jsx` +
      `docs/UI_DESIGN.md` -- syntax-checked with TypeScript's
      transpiler (not a full build/render check, no browser available
      in this sandbox, but real syntax validation, not just
      hand-review).
- [x] **"Assassins" naming** -- resolved at the save/load boundary on
      2026-08-23, not by renaming the data layer:
      `src/features/list-builder/uiMapping.ts` maps the UI's "assassins"
      label to the real backend faction id (`shadow_collective` as of
      the later 2026-08-23 rename -- see docs/DECISIONS.md;
      `uiMapping.ts` was updated in step with that rename) and
      "traditional"/"custom" to the schema's "official"/"freeform"
      whenever a list is saved or loaded. The UI keeps its display
      label; `data/factions.json`/`affiliations.json`/
      `battle-forces.json` still say `mercenary` as of this writing --
      see the "Reconcile faction naming" entry below. If a third place
      ever needs this same UI-label mapping, promote it out of the
      list-builder feature folder first.
- [x] **Real accounts UI (ProfilePicker) -- built 2026-08-23.**
      `src/features/accounts/ProfilePicker.tsx` lists local profiles via
      `listUsers()` and lets you select one or create a new one via
      `createUser()`. `App.tsx` now owns the selected `userId` (persisted
      to `localStorage` under `legion-app:last-user-id` so it survives a
      restart, with existence re-checked against `listUsers()` on
      launch) and passes it down to `CollectionScreen`/
      `ArmyCreationScreen`, plus a "Switch Profile" button in the nav.
      `useCollection`/`useArmyListBuilder` now take `userId` as a
      parameter instead of each independently resolving one.
      `getOrCreateDefaultUser()` (the old silent stopgap) was deleted
      from `lib/api/accounts.ts` -- nothing calls it anymore. Verified
      via `tsc` + `npm run build` (both clean) and `cargo check`/
      `cargo test` on the full crate (unaffected, still clean) -- **not
      visually tested in a running `tauri dev` window**, no display
      available in this environment; the profile-switch/create flow
      itself hasn't been clicked through.
- [x] **Real unit data wired -- 2026-08-23.** The "+ Add Unit" flow
      (`RankSection`/`AddUnitPicker`) now lists real, active-legality
      units from `units.json` filtered by the selected faction/rank, and
      picked units persist as real `army_list_entries` rows. Per-unit
      stat columns (points/WT/SPD/DEF) were dropped from each row rather
      than faked, since every one of those stats is still `null` for
      every unit -- see the honesty-constraint bullet below, now also
      applied here. Command cards got a real picking UI on 2026-08-24 --
      see that entry near "Per-entry upgrade picking" below.
- [x] **Rank badges now show real live validation, not static labels
      -- 2026-08-24.** Superseded by real backend rank-count validation
      (`src-tauri/src/domain/list_validation.rs` +
      `commands/list_validation.rs`, checked against
      `data/factions.json`'s sourced standard-army bounds) -- see the
      2026-08-24 Resolved entry below. The old static "Required"/
      "Optional" qualitative labels are gone.
- [x] **App shell/navigation -- real routing added 2026-08-24.**
      `react-router-dom` (`HashRouter`, no server to do path rewrites in
      a bundled Tauri webview) replaced the manual tab-switcher stopgap
      in `App.tsx`; Campaign Mode's campaign list/dashboard are now real
      nested routes (`/campaigns`, `/campaigns/:campaignId`) instead of
      component-local state. See the 2026-08-24 Resolved entry below.
- [ ] No responsive/mobile pass done -- fixed desktop width for now.
      Explicitly deferred by the project owner (2026-08-24) -- not
      attempted this pass.
- [x] `src/features/collection/CollectionScreen.tsx` -- built
      2026-08-23, the first screen wired to a real Tauri backend instead
      of sample data. See "Backend bootstrap status" below for the full
      breakdown; it's a genuinely working vertical slice (browse
      catalog -> add to collection -> see derived unit ownership ->
      adjust with an override), not a mockup.

## Collection tools status

- [x] **"Collection tools" interpreted as**: tracking which physical
      products/miniatures a user owns, so list-building can eventually
      flag "you don't have a model for this" or filter to owned-only.
      Confirm this matches what you meant if it doesn't already look
      right in the data.
- [x] `data/expansions.json` -- reference library mapping retail
      products to the units/upgrades/command cards they contain. This
      is the missing link `units.json`'s (currently unused) `expansion`
      field was always going to need. **Only 2 products seeded**
      (Upgrade Card Pack, 501st Legion Battle Force Starter Set) out of
      a realistic 100+ products released for this game since 2018 --
      every individual Unit Expansion box is a gap. Both seeded
      entries cross-checked cleanly against units.json/upgrades.json.
- [x] `src-tauri/migrations/0002_collection.sql` -- **this was
      genuinely validated, not just executed.** Beyond running the SQL
      itself (like 0001), this migration was tested with realistic
      data: a simulated user "owns" the 501st Starter Set, and the
      `user_unit_ownership` view was checked to derive the EXACT
      correct quantities (2 Phase II Clone Troopers, 3 ARC Troopers,
      1 AT-RT, 1 Anakin Skywalker) -- not just "the query runs," but
      "the query returns the right numbers." A manual override
      (simulating a lost miniature) was also tested and correctly
      adjusted the total. A bad foreign-key insert was tested and
      correctly rejected. This is the most thoroughly tested piece of
      this project so far.
- [x] Design principle worth preserving: ownership is tracked at the
      PRODUCT level (what you'd actually buy), with unit-level
      quantities DERIVED via a join, plus an optional manual override
      table for proxies/losses/trades that doesn't fit the product
      model. Don't let a future change flatten this into a single
      "units I own" table -- that loses the "which box do I need to
      buy" information the feature exists to provide. See the design
      note at the top of `0002_collection.sql`.
- [x] Tauri commands for collection CRUD (add/remove owned product, set
      an override) -- built 2026-08-23. See "Backend bootstrap status"
      below.
- [ ] No UI concept for this yet either (a "my collection" screen,
      how owned-vs-missing is shown in the list builder).
- [ ] The dozens of upgrade/command-card names seen in the 501st
      Starter Set's box contents but not yet catalogued (Force Choke,
      EMP Droid Poppers, Smoke Grenades, JT-12 Jetpacks, etc. -- listed
      in `data/expansions.json`'s notes) are still an open gap in
      `upgrades.json`, not resolved by this pass.

## Affiliations/Battle Forces/Factions status -- READ FIRST

- [x] **Important self-correction, now resolved.** While building
      these, two official Battle Force PDFs (501st Legion and Shadow
      Collective) were compared directly. Their rank-requirement
      numbers turned out to be DIFFERENT from each other -- meaning
      each Battle Force has its own rank table, not a shared universal
      "standard army" rule. An earlier draft of this work nearly
      copied the Shadow Collective numbers into `data/factions.json`
      as if they were generic. That was caught before it was written
      to the file. **Sourced for real 2026-08-24** via the multi-agent
      fill pass: fetched the actual current (2.6.0, effective
      7.24.2024) Core Rulebook PDF and extracted its text directly.
      Added as `factions.json`'s new `standard_army_rank_requirements`
      field. See docs/DECISIONS.md's matching entry.
- [ ] `data/affiliations.json`: the 5 affiliation names and the
      order-issuing rule are confirmed directly from an official AMG
      PDF (high confidence). Per-affiliation flavor descriptions are
      empty, and the exact unit-to-affiliation mapping for Raiders,
      Rogues, and Maul Loyalists specifically was not confirmed
      card-by-card. **Attempted 2026-08-24 as part of the multi-agent
      fill pass but its agent hit a session usage limit before
      finishing -- see "Fill-pass retry queue" below.**
- [x] **`data/battle-forces.json` -- 8 of 10 now fully detailed
      (2026-08-24).** Was: 10 Battle Forces confirmed by name/faction/
      theme via a live index page, only 2 (501st Legion, Shadow
      Collective) actually populated with real data. **Now**: Blizzard
      Force, Imperial Remnant, Bright Tree Village, Separatist Invasion
      Force, Experimental Droids, and Wookiee Defenders were added via
      the multi-agent fill pass, each from its own real official PDF,
      with every `allowed_units` id independently cross-checked against
      the real `units.json` roster after the fact (all correct). Two
      source PDF URLs were dead (404) and replaced with working ones
      found via search, noted per-entry. **Still `fully_detailed:
      false`: Tempest Force and Echo Base Defenders** -- their agent
      hit the same session usage limit as affiliations above; see
      "Fill-pass retry queue" below, not a research gap.
      **Known coverage gap, now partly resolved**: the multi-agent pass
      also confirmed the Mandalorian Clans Battle Force is real and
      shipped (June 19, 2026) -- but its own units had enough per-unit
      classification uncertainty (Grogu, "Mandalorian Warriors, Fire
      Support") that this pass deliberately did NOT add it to
      `battle-forces.json` or `units.json`, logging it as a confirmed-
      real gap for a dedicated pass instead of guessing. Inferno Squad,
      Delta Squad, and a "212th Attack Battalion" remain unconfirmed
      as real Battle Forces at all.
      **Currency warning**: several of the newly-detailed source PDFs
      (Separatist Invasion Force: Oct 2022; Experimental Droids/Wookiee
      Defenders: Sept 2023) predate the confirmed July 2024 "2.6" rules
      refresh -- allowed-units/rank-requirements are current as
      printed, but unit stats/points/keywords referenced by them may
      be stale relative to current official documents. Per-entry
      `pdf_currency_warning` fields carry the specifics.
- [ ] **Unit naming inconsistency found**: the Shadow Collective PDF
      calls a unit "Maul (A Rival)"; `units.json` has it as
      "Maul (Shadow Collective)" (id `maul-shadow-collective`). Same
      unit, name mismatch between sources, not reconciled.
- [x] **Faction naming: three-way gap, now resolved.** `units.json`
      renamed the fifth faction `mercenary` -> `shadow_collective` on
      2026-08-23, and the 2026-08-23 landing pass carried that rename
      into this app's actual code (`types/common.rs::Faction`, the TS
      `Faction` type, `uiMapping.ts`) since `db/seed.rs` parses
      `units.json` directly. `data/factions.json` and
      `data/battle-forces.json` still said `mercenary` -- **reconciled
      2026-08-23 (same day, later pass)**, see the "Cross-file naming
      gap" entry near the top of this file for what changed and why
      `data/affiliations.json` was deliberately left as `mercenary`
      (it's a real, distinct Legion game concept there, not this app's
      faction id). This app's UI displays "Assassins" for the same
      faction either way (a UI-only label, mapped to `shadow_collective`
      in `uiMapping.ts`).
- [ ] **Unit legality conflict found**: the 501st Legion PDF lists
      "Phase II Clone Troopers" as an allowed Corps unit, but
      `units.json` marks that unit `legality: "removed"` based on the
      general roster source. Likely explanation: it may still be valid
      specifically within the 501st Battle Force even though it's gone
      from standard list-building -- not resolved, flagged in both
      files rather than silently picking one answer.
- [ ] New upgrade names surfaced but NOT added to `data/upgrades.json`
      yet: The Darksaber, Raiding Party Leader, Rook Kast, Saxon's
      Combat Shield, Saxon's Galar-90 Rifle, Saxon's Z-3X Jetpack
      Rockets, Saxon's ZX Flame Projector (all character-restricted,
      from the Shadow Collective PDF), Echo and Fives (from the
      501st PDF), and -- added to the surfaced-but-uncatalogued list
      2026-08-24 -- General Weiss (Blizzard Force), Call to Arms/Herbal
      Medicine/Onwards to Victory/Secret Ingredients (Bright Tree
      Village), and DT-57 "Annihilator" (Separatist Invasion Force).
      Good candidates for the next upgrades.json pass.

## Fill-pass retry queue (2026-08-24)

A multi-agent Workflow research pass hit an account-level session usage
limit partway through (9 of 14 agents failed with the exact same "session
limit" error, not a research problem -- see docs/DECISIONS.md's matching
entry). These are real, well-scoped, ready-to-run again -- the prompts and
unit batches are already written into the workflow script at
`C:\Users\jusek\.claude\projects\C--Users-jusek\0e753238-eb89-4839-a233-efe03a01e67f\workflows\scripts\legion-fill-pass-units-structure-wf_2e3265ef-4af.js`
(resumable via `Workflow({scriptPath, resumeFromRunId: "wf_2e3265ef-4af"})`
-- the 5 agents that already succeeded are cached and won't be re-run):

- [ ] 4 batches filling in speed/defense_die/attack_surge/defense_surge
      for the 71 units that have points but are missing those fields
      (`partial:rebel-a`, `partial:rebel-b`, `partial:separatist`,
      `partial:merc-sc` in the script).
- [ ] 3 batches building full stat blocks for the 27 zero-data units
      (`zero:republic-empire`, `zero:rebel`, `zero:separatist-other`).
- [ ] Tempest Force + Echo Base Defenders Battle Forces (`bf:2`) -- the
      only 2 of the original 8 not yet detailed; see the battle-forces
      entry above.
- [ ] Affiliation descriptions + the Raiders/Rogues/Maul Loyalists
      unit-mapping gap (`affiliations`).

## Code scaffolding status

- [x] `src-tauri/src/types/*.rs` -- structs for every library
      (Keyword, Unit, Upgrade, CommandCard, ScenarioObjective) plus a
      shared `common.rs` (Faction/Rank/UnitType/Legality/DefenseDie
      enums used across files, so they can't drift between them).
      **NOT compiler-checked** -- this sandbox has no Rust toolchain
      (no rustc/cargo, no network for crates). Hand-reviewed carefully,
      but CC's very first step on this file set should be `cargo check`.
- [x] `src/lib/types/manual_seed.ts` -- hand-written TS mirror of the
      Rust types, explicitly marked temporary in its own header comment.
      **Delete this file once real codegen (tauri-specta/ts-rs) is set
      up** -- don't let a hand-maintained TS file and a generated one
      coexist long-term, that's exactly the drift the type-generation
      plan in FILE_STRUCTURE.md exists to prevent. Not typechecked
      (no `tsc` in this sandbox either).
- [x] `src-tauri/migrations/0001_init.sql` -- **this one WAS actually
      validated**, not just hand-reviewed: executed against a real
      in-memory SQLite database, then all five current JSON libraries
      (108 keywords, 142 units, 29 upgrades, 4 command cards, 6
      scenario/objective entries) were loaded through it end-to-end
      with foreign keys enforced (`PRAGMA foreign_keys = ON`). A
      deliberate bad-reference test (a command card pointing at a
      nonexistent unit id) was correctly rejected by the schema's FK
      constraint. This gives real confidence in the schema shape, not
      just in the Python build scripts that produced the JSON.
- [ ] `restricted_to` on Upgrade and `courage`/`units_activated` on
      Unit/CommandCard are deliberately loosely typed
      (`serde_json::Value` / `unknown` / stored as TEXT in SQL) because
      the real shape isn't settled yet. Tighten these once real
      populated examples exist and the pattern is clear -- don't
      guess a strict shape prematurely.
- [x] Tauri command layer (`commands/*.rs`) -- built 2026-08-23. See
      "Backend bootstrap status" below.

## Backend bootstrap status (Tauri command layer) -- READ FIRST

- [x] **The crate didn't exist at all before this pass** -- no
      `Cargo.toml`, `tauri.conf.json`, `main.rs`; `db/` and `commands/`
      were empty except `_PURPOSE.md`. Built 2026-08-23: the full Tauri
      2 skeleton (`main.rs`/`lib.rs`, `Cargo.toml`, `tauri.conf.json`),
      a `db/migrate.rs` that applies `migrations/*.sql` in order
      (tracked via a `schema_migrations` table so relaunching doesn't
      re-run them), a `db/seed.rs` that loads every `data/*.json`
      library into SQLite via `INSERT OR REPLACE` on every launch
      (idempotent, and means a `data/` content update ships to the DB
      automatically next run), and the collection-tracking command
      layer end to end: `commands/accounts.rs` (`create_user`,
      `list_users` -- minimal, since collection rows need a real
      `user_id`), `commands/collection.rs` (add/remove owned
      expansion, set/remove unit override, read `user_unit_ownership`),
      `commands/reference.rs` (read-only `list_expansions`/`list_units`
      catalog lookups, parsed straight from the embedded JSON rather
      than reverse-joining SQL back into nested structs).
- [x] Added `src-tauri/src/types/user.rs` (a `User` struct) -- the
      `users` table existed in `0001_init.sql` but nothing modeled it
      in Rust until now.
- [x] `domain/` deliberately left untouched -- collection CRUD has no
      business rules beyond the SQL `CHECK` constraints already
      enforce. First real `domain/` code arrives with official-mode
      list validation once unit points/stats are populated.
- [x] `db/queries/collection.rs` has a `#[cfg(test)]` module that
      replays the 501st Starter Set scenario already manually validated
      and written up above (owns the box -> derives the exact 2/3/1/1
      unit quantities -> a manual override adjusts the total) as a real
      automated regression test, plus a second test for removing an
      owned expansion. Neither has been run in this environment (see
      below).
- [x] **Compiler-checked for real -- 2026-08-23.** Rust (via `rustup`),
      MSVC C++ Build Tools (via `winget`, the actual missing piece --
      `cargo` alone can't link on Windows without it), and Node.js LTS
      were installed on this machine for the first time in the
      project's history. `cargo check` and `cargo test` both pass
      clean (exit 0) against the full crate, including the
      just-landed 151-unit card-extraction batch -- both
      `db/queries/collection.rs` regression tests pass. `npm run build`
      (`tsc && vite build`) also passes clean -- every hand-written TS
      file across `lib/api/`, every hook, every component type-checks
      with zero errors. One real bug caught and fixed in the process:
      `tauri-build` requires `icons/icon.ico` to embed as the exe's
      Windows resource even with `bundle.active: false` -- that file
      never existed; added a placeholder (needs real app branding
      later). `npm audit` flags a moderate esbuild dev-server CORS
      advisory (GHSA-67mh-4wv8-2f99) -- dev-server only, doesn't affect
      the production build; the fix requires a breaking Vite 5->8
      major bump, not applied without being asked. See
      docs/DECISIONS.md.
- [x] **Frontend build tooling + `lib/api/` wrappers -- built
      2026-08-23.** `package.json` (React 18 + Vite 5 + TS 5, plus
      Tailwind/PostCSS/autoprefixer and `lucide-react` -- both were
      already assumed by `ArmyCreationScreen.jsx` but never actually
      installed anywhere), `vite.config.ts`, `tsconfig.json`/
      `tsconfig.node.json` (`allowJs: true` so `tsc` tolerates importing
      the existing `.jsx` screen), root `index.html` + `src/main.tsx` +
      `src/App.tsx` (mounts `ArmyCreationScreen` -- still the sample-data
      mockup per "UI status" above, not wired to real data yet) +
      `src/index.css` (Tailwind directives). `tauri.conf.json` now has
      `devUrl`/`beforeDevCommand`/`beforeBuildCommand` pointing at the
      Vite dev server. `src/lib/api/accounts.ts`, `collection.ts`,
      `reference.ts` are typed `invoke()` wrappers over every command
      built in the prior pass -- the one place the frontend is allowed
      to call `invoke()`, per `lib/api/_PURPOSE.md`. Added a `User`
      interface to `manual_seed.ts` to match `types/user.rs`.
      **Not run** -- same no-Node-toolchain caveat as the Rust side;
      `npm install && npm run build` (or `tsc --noEmit`) is the first
      real check. `dist/index.html`'s one-file placeholder is superseded
      the first time `npm run build` actually runs (now gitignored).
- [x] **`CollectionScreen` wires every `lib/api/` function to a real
      screen -- built 2026-08-23.** `src/features/collection/`:
      `hooks/useCollection.ts` loads the catalog (`listExpansions`,
      `listUnits`) and `userId`'s state (originally claimed the first
      profile from `listUsers()`, or created a "Default Profile", with no
      real picker -- **replaced 2026-08-23 by a real ProfilePicker, see
      below**), then exposes `addExpansion`/`removeExpansion`/
      `adjustUnitOverride`/`clearUnitOverride`, each re-syncing
      `getUserUnitOwnership` after the write. Three presentational
      components (`ExpansionCatalog`, `OwnedExpansions`,
      `UnitOwnershipTable`) render it. `ArmyCreationScreen.jsx` was left
      unwired at the time this was written -- see the army-list
      save/load entry below for where that got picked up. Not run --
      same no-toolchain caveat as everything else.
- [x] **Army-list save/load -- built 2026-08-23.** `types/army_list.rs`
      (`ArmyList`, `ArmyListEntry`, `ArmyListWithEntries` -- mirrors
      `army_lists`/`army_list_entries` in `0001_init.sql`; added
      `ArmyListMode` to `common.rs`), `db/queries/lists.rs`,
      `commands/lists.rs` (`create_list`, `update_list_header`,
      `delete_list`, `list_lists_for_user`, `get_list_with_entries`,
      `add_list_entry`, `update_list_entry_count`, `remove_list_entry`),
      same layering as the collection command layer. This was the
      forcing function to finally wire `ArmyCreationScreen.jsx` to real
      unit data (`army_list_entries.unit_id` is a real FK -- there was
      nothing valid to persist without it): the screen now has a working
      "Add Unit" picker sourced from real `units.json` via `list_units`,
      per-entry count steppers, and Save/Load/New wired to
      `useArmyListBuilder` (`src/features/list-builder/hooks/`).
      `ModeToggle`/`RankSection` got extracted into their own component
      files in the process (the screen was already past the ~300-line
      guideline before this pass's additions). `hexToRgba` moved to
      `src/lib/utils/color.ts` as a shared helper.
- [x] **`army_list_command_cards` picking -- built 2026-08-24.**
      `ArmyCreationScreen.jsx`'s command-hand strip now uses real data
      (`list_command_cards`, `add_list_command_card`/
      `remove_list_command_card`) instead of `SAMPLE_COMMAND_CARDS`,
      which is gone. **Real, load-bearing gap found while building this**:
      `data/command-cards.json` has exactly 4 cards (the full generic
      set) and zero commander-specific cards, so a real 7-card hand
      (per the file's own `_meta.command_hand_rule`) can't actually be
      built yet -- the UI is an honestly-banner-flagged preview against
      those 4 cards, not a claim of a complete hand-builder. See
      docs/DECISIONS.md's matching entry.
- [x] **`army_list_battle_deck` picking -- built 2026-08-24.** Same
      pattern as command cards (`list_scenarios`, `add_list_battle_deck_card`/
      `remove_list_battle_deck_card`, `AddBattleDeckPicker.tsx`). **Real
      gap found, sparser than command cards' 4-card set**:
      `data/scenarios.json` has ~6 Primary Objective cards and ZERO
      Secondary/Advantage cards, against a real 9-card (3+3+3) deck rule
      -- the UI is an honestly-banner-flagged preview against the Primary
      Objectives that exist, same "structure now, content later" approach
      as command cards. See docs/DECISIONS.md's matching entry. The list
      builder's core structure (units, upgrades, command cards, battle
      deck) is now feature-complete end to end -- remaining list-builder
      work is content depth (see the command-card and upgrade-card
      research-pass gaps above), not missing UI.
- [x] **Per-entry upgrade picking -- built 2026-08-24.** `ArmyListEntry.upgrades`
      is now actually written to via `update_list_entry_upgrades`
      (`commands/lists.rs` -> `db/queries/lists.rs::update_entry_upgrades`).
      New `UnitDetailModal.tsx`, opened by clicking a unit row in
      `RankSection.tsx`, shows the unit's stat block, weapons, real
      keyword descriptions, and a best-effort upgrade-equip picker (see
      docs/DECISIONS.md's matching entry for why it's "best-effort" --
      `upgrade_bar` is still null for every unit). `RankSection` rows now
      show each entry's equipped-upgrade names inline, so two entries of
      the same unit visibly show different loadouts without opening the
      popup. Still open: real per-unit `upgrade_bar` slot data (still
      null for all 151 units) and the ~160+ faction/unit-specific upgrade
      cards `data/upgrades.json` is still missing (see that file's
      `_meta` and the entry below).
- [ ] **No query-layer tests for `db/queries/lists.rs`**, unlike
      collection's regression test replaying the 501st Starter Set
      scenario -- flagged as a gap rather than skipped silently. Would
      want: create a list, add/remove/recount entries, confirm
      `get_list_with_entries` round-trips correctly.
- [ ] `ArmyCreationScreen.jsx` is still `.jsx`, not `.tsx`, despite now
      driving real, non-trivial state -- the new logic itself (the hook,
      `uiMapping.ts`, every extracted component) is fully typed, but the
      screen's own JSX file relies on `tsconfig.json`'s `allowJs: true`
      rather than being type-checked itself (`checkJs` is off). Worth a
      full conversion once the screen stabilizes further.
- [ ] `tauri.conf.json`'s `identifier` (`dev.legion-app.desktop`) is a
      placeholder -- pick a real reverse-domain identifier before ever
      distributing a build.
- [x] **Landed the card-extraction data batch + fixed the schema break
      it caused -- 2026-08-23.** The 151-unit `units.json`/108-entry
      `keywords.json`/updated `unit.schema.json` from the extraction
      rollout below existed only as pasted content and doc narration
      until this pass wrote them to disk (verified via `grep` that none
      of it was on disk beforehand). Two breaking fixes, not just new
      fields: (1) `Faction::Mercenary` -> `Faction::ShadowCollective` in
      `types/common.rs` (`rename_all` changed to `snake_case` so the
      multi-word variant serializes correctly), plus the matching
      `mercenary` -> `shadow_collective` rename in three
      `0001_init.sql` CHECK constraints and the TS `Faction` type and
      `uiMapping.ts` -- without this, `db/seed.rs` would fail to parse
      the first `shadow_collective` unit on every app launch. (2)
      `stats.keywords` is now raw printed keyword text (e.g. "Full
      Pivot"), not ids -- the old seed path wrote these straight into
      `unit_keywords`, whose `keyword_id` column has a real foreign key
      into `keywords(id)`; that would violate the FK on nearly every
      unit. Fixed with a new `keywords_json` raw-blob column (same
      treatment as `weapons_json`) and removed the `unit_keywords`
      writes -- that table stays empty until a real string-to-id
      resolution pass exists (**done 2026-08-23, see the "Keyword
      resolution pass" entry near the top of this file**). Also added
      `Rank::Attached` (companion
      units), and `UnitStats.points_verified` (real per-unit signal,
      independent of the coarser `stats_verified`) -- used to unlock a
      real UI feature: `RankSection`/`ArmyCreationScreen` now show
      actual point costs and a real points total for the 124/151 units
      with verified costs, with unpriced units counted separately
      rather than treated as free. `0001_init.sql` was edited directly
      (not a new migration) -- see the note at the top of that file.
      `docs/TODO.md`/`docs/DECISIONS.md` had diverged from a separate
      data-focused session by this point (new card-extraction sections
      vs. this session's Tauri/UI sections) -- merged, not overwritten.

## Scenarios library gaps (data/scenarios.json) -- READ FIRST

- [ ] **Important finding, not just a gap**: Star Wars Legion replaced
      its entire competitive objective system in the "2.6"/"Legion 260"
      Core Rulebook update (~July 2024). The OLD system (separate
      Objective / Deployment / Condition cards, 800pt standard / 500pt
      skirmish format) is explicitly deprecated and no longer supported
      for play. The CURRENT system uses Primary Objective / Secondary
      Objective / Advantage cards at **1000pt standard** (with a
      separate **600pt "Recon"** format). `data/scenarios.json` is
      built against the current system -- if you see 800pt/500pt or
      "Objective/Deployment/Condition" terminology referenced anywhere
      else (old notes, your own memory of the game, older community
      content), treat it as outdated.
- [ ] Only **3 of an estimated 6 total Primary Objective cards** have
      confirmed names (Shifting Priorities, Recover the Research,
      Close the Pocket). 3 more names surfaced (Outflank, Supply Run,
      Bunker Assault) but could not be confirmed as current/correctly
      categorized -- flagged `roster_verified: false`.
- [ ] **Zero Secondary Objective cards** catalogued.
- [ ] **Zero Advantage cards** catalogued.
- [ ] **Zero Recon-format (600pt) cards** catalogued -- this whole
      smaller-game-size format is uncovered.
- [ ] **Zero official AMG narrative "Scenario" cards** catalogued.
      Note: these are AMG's own non-competitive thematic scenario
      cards, and are NOT the same thing as this app's user-facing
      Campaigns feature -- that stays a placeholder per earlier
      decisions. Don't conflate the two when populating this later.
- [ ] Every `victory_condition` and `points_of_interest` field is
      `null` across all entries -- not filled from memory, same
      reasoning as every other library.
- [ ] Should find and read the actual current Core Rulebook PDF
      (https://www.atomicmassgames.com/swlegiondocs/) directly for
      this one rather than relying on secondary community sources --
      the objective/mission system is central enough to list-building
      and setup that it's worth the extra verification pass.

## Command cards library gaps (data/command-cards.json)

- [x] **Commander-specific cards populated -- 2026-08-24.** Grown from
      the original 4-card generic-only seed to **232 cards** via a
      command-card expansion pass the project owner ran and provided as
      a finished `command-cards.json`, sourced from official AMG
      print-and-play command-card PDFs, the June 17 2026 errata, and
      2025-2026 release/developer articles. Landed into the app's real
      schema/types/DB (previously it only existed as the pasted file):
      - **`commander_unit_id` resolved for 117 of 173 commander-specific
        cards** by a mechanical resolver matching each card's
        `unit_activation_restriction` (and, as a same-field fallback,
        its own name) against the real `data/units.json` roster -- the
        source pass couldn't do this itself since it didn't have that
        file. Matches were verified against direct name/subtitle
        equality only; a broader pass that also scanned each card's
        flavor-text `effect_description` for character names was tried
        and discarded after it produced one confirmed wrong match
        (attributing "Moment of Triumph," a Grand Moff Tarkin card, to
        Darth Vader because his name appears in the card's flavor text)
        -- a real example of why this project's "don't guess" rule
        exists, not just a hypothetical one.
      - **The remaining 56 are a genuine, categorized gap, not a
        resolver failure**: ~20 are jointly owned by two named units in
        one restriction (e.g. "Fifth Brother & Seventh Sister",
        "Chewbacca & Luke Skywalker") or usable by either of two (e.g.
        "Jedi Knight or Jedi Knight General", "Kalani or Kraken") --
        `commander_unit_id` is a single field and can't represent
        "owned by A or B" without a real schema change (adding a second
        id column, or an array) that wasn't made this pass; ~20 have a
        generic order-count restriction ("2 Trooper units", "3 units")
        with no named owner in the text at all -- these cards are real
        and do belong to a specific commander in the actual game, the
        printed restriction text just doesn't say who, and confirming
        it needs the actual card image, not just this text; the rest
        name a real character who isn't in `units.json` yet (Grand
        Admiral Thrawn, General Tagge, Grand Moff Tarkin, Bo-Katan
        Kryze, The Armorer, Paz Vizsla, Ursa Wren, Rook Kast -- all from
        packs/battle-forces this project already flagged as
        incompletely catalogued, e.g. see "Affiliations/Battle
        Forces/Factions status"'s Mandalorian Clans note above). One
        exception was hand-verified and added outside the mechanical
        pass: "The Hand Thing" resolves to Grogu (`grogu`) -- its
        restriction text says "No units" but its effect text
        unambiguously names him as the card's subject.
      - **Schema/DB changes this required, not just data**:
        `pips`/`units_activated` are now nullable in both
        `data/schema/command-card.schema.json` and
        `0001_init.sql`/`types/command_card.rs` -- 15 and 21 cards
        respectively have a real printed value the source pass's
        materials didn't expose (each has a `notes` field saying so),
        and `pips` now allows `0` (one real card, "Sorry About the
        Mess," is explicitly treated as 1-pip while building the hand
        but stores its literal printed value). The old DB `CHECK` that
        required every commander-specific card to have a non-null
        `commander_unit_id` was **dropped**, not relaxed to a default --
        real card data disproved the one-card-one-commander assumption
        it encoded (see the joint/either-or cards above). `faction_restriction`
        values were normalized from the source pass's full faction
        names ("Galactic Empire", etc.) to this app's short ids
        ("empire", etc.) to match the existing `Faction` enum/schema
        enum -- the schema enum's own `mercenary` was also fixed to
        `shadow_collective` in the same edit (stale, same pattern as
        the `faction.schema.json`/`battle-force.schema.json` fix
        noted elsewhere in this file). UI display of `pips` (the
        command-hand strip and the add-card picker) falls back to
        `"?"` for the null cases rather than rendering `null`/`NaN`.
      - Verified via `npm run validate:data` (9/9 clean), `cargo test`
        (22/22, including the reseed-twice regression test, which
        exercises the full 232-card seed against the changed schema
        twice in a row), and `npm run build`/`npm test` (25/25) --
        real, not just "the JSON parses."
      - **Not yet done**: no attempt to fill the ~56-card gap above by
        guessing at effect text or ownership; no `battle_force_restriction`
        vs. `commander_unit_id` cross-check against `battle-forces.json`'s
        own roster lists (a possible future resolver signal for some of
        the "generic order-count, no named owner" cards). Effect text on
        the original 4 generic cards is still paraphrased and mostly
        unverified against exact current wording, same caveat as before
        this pass -- only Standing Orders' "returns to hand" mechanic has
        higher confidence.
- [ ] Should double check whether the newer 2025-era commander kits
      (Customizable Jedi General/Knight, etc.) changed the "each
      commander has ~3 personal cards" assumption -- some newer units
      may have more/fewer or share a pool differently.

## Upgrades library gaps (data/upgrades.json)

- [ ] **Zero entries** for 9 of 15 categories: Armament, Crew,
      Generator, Hardpoint, Heavy Weapon, Ordnance, Personnel,
      Programming, Pilot. These are almost entirely faction- and
      unit-specific cards (one set per unit expansion), which is most
      of the actual card pool in the game -- the 29 generic cards
      seeded so far are a small fraction of the total.
- [ ] A newer 191-card "Upgrades Card Pack" (SWQ144, released Sept 19
      2025) reportedly adds generic **Generator** and **Programming**
      cards to the non-faction pool, on top of the original 60-card
      pack's Command/Comms/Force/Gear/Grenades/Training. Exact card
      names in that expanded pack were not found in this pass.
- [x] **Effect-text/points research pass -- 2026-08-24.** 27 of the 29
      generic cards now have a real `effect_description`
      (`effect_verified: true`); 11 have a real `points` value where one
      clean, uncontested figure was found (many others have conflicting
      figures across points-update eras -- left `null`/unverified rather
      than guess which is current, see each card's `notes`). Still
      `null`/`false`: `comms-relay` (nothing usable found),
      `fragmentation-grenades` and `duck-and-cover` (source text was
      incomplete/partial, not confident enough to publish). The
      **faction/unit-specific cards from the gap above are still
      entirely unresearched** -- this pass only covered the 29 generic
      ones already seeded.
- [ ] `keywords_granted` and `weapon_profile` are now populated for 9 and
      1 of the 29 generic cards respectively (2026-08-24 pass, where the
      granted keyword/weapon was unambiguous from the sourced effect
      text) -- still `null` on the rest and on every non-generic card,
      same reasoning as above.
- [ ] A new upgrade card **sub-type called "Doctrine"** was found
      during research (introduced with the Customizable Jedi General &
      Knight kit, Sept 2025) -- added to the schema's category enum but
      not populated with any cards. Worth confirming with a current
      source whether "Doctrine" is really a distinct category or a
      Training-card subtype before relying on it.
- [ ] Force-user "Training" upgrades come in named sub-lines (e.g.
      "Jedi Training - Master Duelist") tied to lightsaber form choice
      -- not modeled yet. May need a `subtitle` field added to the
      schema once real Force/Training cards are populated.

## Open design questions (flagged, not decided)

- [ ] **User accounts**: current assumption is local profiles, no
      cloud/login server. Confirm this is actually what you want before
      the accounts module is built -- reworking this later is a real
      rearchitecture, not a small patch.
- [ ] **Cross-device sync**: not in scope under the local-profile
      assumption above. If you want Android and desktop installs to
      share army lists, that needs an explicit export/import or sync
      feature -- decide before or after MVP?
- [x] **List sharing/export (text case) -- built 2026-08-24.** Copy-to-
      clipboard and Export-as-`.txt` buttons in `ArmyCreationScreen.tsx`
      (`src/features/list-builder/listExport.ts`'s `buildListText`,
      mirroring Campaign Mode's Story tab pattern). Image export remains
      genuinely out of scope -- separate, much larger feature (canvas/
      screenshot rendering), not attempted.
- [ ] **Local profile protection**: do profiles need a password/PIN, or
      is "whoever has the device" sufficient?
- [x] **Type-generation tooling -- checked 2026-08-24, not adopted.**
      `docs/FILE_STRUCTURE.md` recommends `tauri-specta` for Rust->
      TypeScript type generation; this project pins `tauri = { version =
      "2", features = [] }` (currently resolving to `tauri v2.11.5`, per
      a real `cargo build`). Researched tauri-specta's actual current
      release: **`2.0.0-rc.25`** (2026-05-08) -- still a release
      candidate, over a year into RC iterations, never reached a stable
      1.0/2.0. Decision: **don't adopt it while it's still an RC** --
      pinning this project's entire type-safety layer to a pre-1.0
      dependency is real, avoidable risk for a maintenance-only benefit
      (no user-facing value), especially given `manual_seed.ts` already
      works, is fully in sync, and is explicitly self-documented as
      temporary. `manual_seed.ts` stays as-is for now. Re-check
      tauri-specta's release status before the next time this comes up
      -- if it's reached a real stable release by then, revisit.
- [ ] **Android distribution**: sideloaded APK assumed for v1. Play
      Store distribution (signing, review, policy compliance) is a
      separate later decision.

## Deferred features (intentionally undesigned)

(Campaigns module moved to Resolved 2026-08-24 -- it was the only entry
here.)

## Process / tooling setup

- [x] **JSON Schema validation wired up -- 2026-08-24.** `npm run
      validate:data` (`scripts/validate-data.mjs`, using real `ajv` +
      `ajv-formats`, network access confirmed available in this
      environment) validates all 9 `data/*.json` files against their
      `data/schema/*.schema.json` counterparts. First real run caught 2
      genuine issues -- `faction.schema.json` and
      `battle-force.schema.json` still had `"mercenary"` in their id/
      faction enums, predating the 2026-08-23 `shadow_collective` rename
      (a stale schema, not stale data) -- fixed both, now `All data files
      match their schemas.`. Not yet wired into a pre-commit hook/CI
      step (no CI exists in this project yet) -- still a real gap, but
      the validator itself is now real and runnable on demand.
- [x] **Type-generation pipeline decision made, not built -- see the
      "Type-generation tooling" entry above under Open design
      questions**: checked `tauri-specta`'s actual release status
      (still `2.0.0-rc.25`), decided not to adopt it while pre-1.0.
      `manual_seed.ts` stays hand-maintained for now.
- [ ] Decide on Android build signing/keystore setup once the desktop
      MVP is stable enough to be worth mobile-testing.

---

## Resolved

- **2026-08-24** -- Command-card library expansion landed (4 -> 232
  cards) and `commander_unit_id` resolved for 117 of 173
  commander-specific cards against the real `units.json` roster,
  including a schema/DB relaxation (`pips`/`units_activated` now
  nullable, the old "commander-specific must name a commander" `CHECK`
  dropped) that real card data required. See "Command cards library
  gaps" below for the full breakdown, including exactly which 56 cards
  are still unresolved and why (joint/either-or ownership one field
  can't represent, or a named character not yet in `units.json`) and
  the one wrong match a broader resolver attempt produced and that got
  discarded before landing. Verified via `npm run validate:data` (9/9),
  `cargo test` (22/22, reseed-twice regression included), and
  `npm run build`/`npm test` (25/25).
- **2026-08-24** -- Structural/code-gap cleanup pass, run in waves per
  the project owner's request, ending in this verification pass (all
  green: `cargo test` 22/22, `npm run build` clean, `npm test` 25/25,
  `npm run validate:data` 9/9, `npm run tauri dev` relaunched with no
  migration/seed/runtime errors):
  - **Frontend test tooling** (previously zero coverage): vitest +
    React Testing Library + jsdom installed (`vitest.config.ts`,
    `src/test/setup.ts`). Real tests, not placeholders:
    `uiMapping.test.ts` (faction/mode translation, including a full
    round-trip check), `keywordResolve.test.ts` (every resolution rule:
    colon-truncation, trailing-digit-strip, `-x`/`-x-y` fallback,
    override tables, raw-prefix overrides), `ProfilePicker.test.tsx`
    (a real RTL render+interaction smoke test, mocking `lib/api/
    accounts.ts`), `listExport.test.ts` (see below).
  - **Official-mode army-list rank validation** (previously: rank
    badges were static "Required"/"Optional" labels, nothing checked a
    list against real rules despite the data existing).
    `data/factions.json`'s `standard_army_rank_requirements` restructured
    from plain prose per rank to `{text, min, max}` (same already-
    verified bounds, not a new claim -- nothing consumed the old shape,
    confirmed safe). New `src-tauri/src/domain/list_validation.rs`
    (second real occupant of `domain/`, pure, unit-tested) +
    `commands/list_validation.rs::validate_list` (loads a saved list's
    entries, resolves ranks via `commands::reference::list_units()`,
    sums counts, checks bounds -- returns empty for freeform lists,
    nothing to check there). `RankSection.tsx`'s badges are now live:
    "OK", the real shortfall/overflow message, or nothing at all until
    the list is saved (never claims "OK" when it hasn't actually
    checked).
  - **Real top-level navigation** (previously: `App.tsx`'s hand-rolled
    tab switcher, explicitly flagged as a stopgap; Campaign Mode's list/
    dashboard nav was component-local state bolted on top).
    `react-router-dom` + `HashRouter` (see `src/main.tsx`'s comment on
    why hash over browser routing). Routes: `/army-builder`,
    `/collection`, `/campaigns`, `/campaigns/:campaignId` -- a specific
    campaign now has a real, refreshable/shareable URL.
  - **`ArmyCreationScreen.jsx` -> `.tsx`** (last untyped screen in the
    app) -- real prop/state types throughout, including a
    `LucideIcon`-typed rank-icon field (a genuine, previously-untyped-
    and-therefore-unnoticed type mismatch surfaced and got fixed in
    `RankSection.tsx` too during the conversion). `allowJs` stays on in
    `tsconfig.json` (nothing else depends on turning it off).
  - **TS type-generation tooling**: researched, not adopted -- see the
    "Type-generation tooling" entry above. A real, dated, re-checkable
    answer now exists instead of an open question.
  - **Army list text export**: Copy/Export-as-`.txt` buttons, mirroring
    Campaign Mode's proven Story tab pattern -- see the "List sharing/
    export" entry above.
  - **JSON schema validation wired up and run for real** -- caught and
    fixed 2 real stale schema enums (pre-`shadow_collective`-rename
    `"mercenary"` in `faction.schema.json`/`battle-force.schema.json`).
    See the "JSON Schema validation wired up" entry above.
  - **Explicitly NOT touched this pass** (product decisions, not code
    gaps -- see this file's "Open design questions" section): profile
    PIN/password, cross-device sync, list export as an image, any
    mobile/responsive work (project owner said skip mobile explicitly).
- **2026-08-24** -- Windows bundling turned on. `src-tauri/tauri.conf.json`
  had `bundle.active: false` since the crate's original bootstrap (an exe
  could be compiled, but no installer/bundle was ever produced) -- flipped
  to `true`, `targets: ["nsis", "msi"]` (Windows only, per explicit
  instruction -- macOS/Linux/mobile deliberately not touched), plus the
  `windows.webviewInstallMode: downloadBootstrapper` +
  `windows.nsis.installMode: currentUser` (no admin required to install)
  config from Tauri's own docs. Ran a real `npm run tauri build`: both
  `Legion App_0.1.0_x64-setup.exe` (NSIS, ~2.7MB) and
  `Legion App_0.1.0_x64_en-US.msi` (WiX, ~3.9MB) built clean in
  `src-tauri/target/release/bundle/{nsis,msi}/` -- NSIS 3.11 and WiX
  Toolset 3.14.1 were both auto-downloaded by Tauri's bundler, no manual
  toolchain install needed on this machine. Also verified the **portable,
  no-install path**: copied the raw `target/release/legion-app.exe`
  (~11.3MB) to a folder outside the repo and launched it directly -- it
  ran standalone (no dev server, no project directory needed), and
  correctly created/reused its real SQLite database in
  `%APPDATA%\dev.legion-app.desktop\` (OS-standard per-user app-data path,
  not relative to the exe's location) -- confirms it's genuinely portable,
  not just "compiles." Caveat: the raw exe (unlike the two installers)
  doesn't carry any WebView2 bootstrapping -- if a target machine has
  WebView2 entirely missing (rare; it ships with Windows 11 and via Edge
  updates on nearly all Windows 10 machines), the bare exe won't render.
  Neither installer has actually been double-clicked/run through yet
  (that changes system state -- Start Menu entries, registry, an
  uninstaller -- left for the project owner to try deliberately rather
  than done unprompted). `icons/icon.ico` is still the placeholder noted
  in the 2026-08-23 backend-bootstrap entry below, not real app branding
  -- fine functionally, worth swapping for real Legion-themed art later.
- **2026-08-24** -- Campaign Mode built end-to-end: migration
  `0003_campaigns.sql` (14 tables + a `campaign_participant_totals`
  view), `domain::campaign_rules` (first real occupant of `domain/`),
  `db::queries::campaigns_{core,detail,content,play}`,
  `commands::campaigns_{core,detail,content,play}` (registered in
  `lib.rs`), and a full `src/features/campaigns/` UI (campaign list +
  create, a tabbed dashboard: Overview/Paths/Missions/Roster &
  Store/Upgrades) wired into `App.tsx` as a third top-level tab. Covers:
  branching narrative paths, sequenced missions with multi-outcome
  rewards, written battle reports with per-model casualty logging and
  auto-retirement on wipeout, a per-campaign store with unlock-threshold
  and max-count gating, and a non-banking hero-upgrade purchase rule.
  `cargo test` (2 new integration tests + 8 domain-rule unit tests, 15
  total, all passing) and `npm run build` both verified; dev server
  relaunched clean with no migration/seed errors. See docs/DECISIONS.md
  for the schema calls made (bookkeeping-not-rules-engine principle,
  dedicated roster table, unlock-threshold semantics, upgrade-tier
  semantics). Not yet independently spot-checked by the project owner in
  the live app -- do that before considering this fully closed.
- **2026-08-23** -- Tauri backend bootstrap + collection-tracking
  command layer. The crate didn't exist at all beforehand (no
  `Cargo.toml`/`main.rs`/`tauri.conf.json`, `db/` and `commands/` were
  empty). Built: the full Tauri 2 crate skeleton; `db/migrate.rs`
  (applies `migrations/*.sql` in order, tracked so relaunching doesn't
  re-run them); `db/seed.rs` (loads every `data/*.json` library into
  SQLite on every launch, idempotent via `INSERT OR REPLACE`, so a
  content update ships to the DB automatically); the full collection
  CRUD command layer (`commands/accounts.rs`, `commands/collection.rs`,
  `commands/reference.rs`) plus a new `types/user.rs`. See "Backend
  bootstrap status" above for the full breakdown and what's still open
  (no toolchain here to run `cargo check`/`cargo test`; no frontend
  build tooling yet; army-list CRUD not started).
