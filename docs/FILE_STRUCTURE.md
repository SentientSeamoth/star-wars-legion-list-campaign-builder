# File System & Module Organization Plan

This doc exists to answer one question: **how do we structure this repo
so that an AI coding agent working across many sessions can't quietly
turn it into an unmaintainable pile?** Specifically it targets three
failure modes you named: inflated/vibe-coded files, data disagreement
between sections, and redundancy.

The skeleton described here has already been scaffolded on disk (see the
`legion-app/` folder you were given) with a `_PURPOSE.md` file in every
key directory, so the rules below are physically sitting next to the
code, not just in a doc CC can ignore.

## The three failure modes, and the specific rule that stops each one

**1. Inflated / vibe-coded files** — happens when an AI agent, given a
loose task, writes everything it needs into whatever file it's already
looking at, because that's the path of least resistance in the moment.

*Rule:* strict layering with single-responsibility folders (below), plus
a hard file-size guideline (~300 lines; split into subcomponents/hooks
or sub-modules past that), plus "one command = one job" for every Tauri
command. A file that's doing three things is a signal to split it, not a
signal that the app is "just complex."

**2. Data disagreement between sections** — happens when the frontend's
idea of what a "Card" or "ArmyList" looks like drifts from the backend's
idea, because someone (human or AI) hand-wrote a matching TypeScript
interface once and it fell out of sync after a schema change.

*Rule:* **one canonical schema per data shape, everything else is
generated or validated against it.** Two concrete mechanisms:
- Rust structs in `src-tauri/src/types/` are canonical. TypeScript types
  in `src/lib/types/generated.ts` are auto-generated from them (see
  "Type generation" below) and must never be hand-edited.
- Seed/reference JSON in `data/` (keywords, cards, rules) is validated
  against JSON Schema files in `data/schema/` so an edit that changes
  the shape fails loudly instead of silently breaking something
  downstream.

**3. Redundancy** — happens when the same logic (e.g. "is this list
legal under official rules") gets implemented once in Rust and then
re-implemented in TypeScript because a feature needed a quick preview
and it was easier to duplicate than to plumb through.

*Rule:* all game-rules logic lives in exactly one place —
`src-tauri/src/domain/` — as pure functions with no I/O. The frontend
never re-implements rules logic; it always calls a command that calls
domain code. If the UI needs instant feedback (e.g. live point-cost
totals as you build a list), that's still a call into the same Rust
logic via Tauri's IPC, not a parallel JS implementation.

## Dependency direction (the one diagram that matters)

```
data/ (seed JSON, versioned, human-editable)
   |
   v
src-tauri/src/db/          <- storage only, no game logic
   |
   v
src-tauri/src/domain/      <- pure game logic, no I/O
   |
   v
src-tauri/src/commands/    <- thin glue, exposed to frontend
   |
   v
src/lib/api/               <- ONLY place frontend calls invoke()
   |
   v
src/features/*/            <- UI, imports lib/ and components/ only
```

Arrows only point one direction. `domain/` never calls `commands/`.
`db/` never calls `domain/`. Features never import each other. If you
ever find yourself wanting to violate one of these arrows, that's a
signal the logic is in the wrong layer, not a reason to add a shortcut.

## Full annotated tree

```
legion-app/
  docs/
    ARCHITECTURE.md          # overall stack + feature decisions
    FILE_STRUCTURE.md        # this file
    TODO.md                  # living gap/decision tracker
    DECISIONS.md             # dated one-line log of settled decisions

  data/                                    # SEED DATA, not code
    keywords.json
    schema/
      keyword.schema.json                  # validates keywords.json
      card.schema.json                     # validates cards seed data
      rules-update-log.schema.json
    rules/
      core_rules_version.json
      errata.json
    cards/
      schema.md                            # documents card field meanings

  src-tauri/
    Cargo.toml
    tauri.conf.json
    migrations/                            # append-only, numbered SQL
      0001_init.sql
    src/
      main.rs
      types/            _PURPOSE.md        # <- canonical structs, source of truth
        card.rs
        keyword.rs
        army_list.rs
        scenario.rs
      db/               _PURPOSE.md        # <- storage only
        schema.rs
        queries/
          cards.rs
          keywords.rs
          lists.rs
          accounts.rs
      domain/           _PURPOSE.md        # <- pure game-rules logic
        list_validation.rs
        keyword_resolution.rs
        scenario_rules.rs
      commands/         _PURPOSE.md        # <- thin Tauri command wrappers
        cards.rs
        keywords.rs
        lists.rs
        scenarios.rs
        accounts.rs
        rules_updates.rs
        campaigns_core.rs                  # built 2026-08-24 -- campaigns/participants/meters
        campaigns_detail.rs                # built 2026-08-24 -- the one-call dashboard aggregate
        campaigns_content.rs               # built 2026-08-24 -- paths/missions/outcomes/upgrades/store
        campaigns_play.rs                  # built 2026-08-24 -- roster/purchases/battle reports
      scraper/          _PURPOSE.md        # <- card/rules scraping
        card_scraper.rs
        rules_update_checker.rs

  src/
    main.tsx
    App.tsx
    lib/
      api/              _PURPOSE.md        # <- ONLY place invoke() is called
        cards.ts
        keywords.ts
        lists.ts
        scenarios.ts
        accounts.ts
      types/            _PURPOSE.md        # <- AUTO-GENERATED, never hand-edit
        generated.ts
      utils/                               # small generic helpers only
    components/         _PURPOSE.md        # <- shared, dumb, presentational
      ui/
        Button.tsx
        Card.tsx
    features/           _PURPOSE.md        # <- self-contained, siloed
      list-builder/
        components/
        hooks/
      scenarios/
        components/
      campaigns/                           # built 2026-08-24 -- see hooks/, components/, CampaignsFeature.tsx
      keyword-library/
        components/
      card-browser/
        components/
      accounts/
        components/

  tests/
    domain/             _PURPOSE.md        # mirrors src-tauri/src/domain/ 1:1
    e2e/
```

## Type generation (the fix for cross-section data disagreement)

Recommended: **`tauri-specta`** (generates TypeScript bindings, including
function signatures for your commands, directly from Rust). Alternative:
`ts-rs` if you only want struct-to-type generation without the command
binding piece. Confirm whichever is compatible with the Tauri version CC
actually pins -- that's tracked in `docs/TODO.md` since I can't verify
current crate compatibility from here reliably.

Workflow once set up:
1. Add or change a field on a struct in `src-tauri/src/types/`.
2. Run the generation step (a `cargo run --bin generate-types` or
   equivalent, wired into a `just`/`make`/npm script).
3. `src/lib/types/generated.ts` updates automatically.
4. Frontend code that used the old shape now fails to typecheck at the
   exact call sites that need updating -- instead of silently reading
   `undefined` at runtime.

This turns "the frontend and backend disagreed about a data shape" from
a runtime bug into a compile-time error, which is the single biggest
lever for the "proper reference and data agreement between sections"
part of your ask.

## Data schema validation (for the `data/` folder specifically)

`data/*.json` files are content, not code, and get hand-edited or
scraper-updated over time, so they need their own guardrail separate
from the Rust type system. Each file in `data/` has a matching schema in
`data/schema/`. A `keywords.json` example is included in this handoff
(`data/schema/keyword.schema.json`) and has already been validated
against the current `data/keywords.json` as a working example -- see the
bottom of this doc.

Wire this into a pre-commit hook or a CI step once the repo has either,
so an edit that breaks the schema (e.g. CC "helpfully" renames a field
while adding a feature) fails immediately instead of surfacing as a
confusing bug three features later.

## Naming and size conventions

- **Files**: one primary export per file for components and command
  handlers. `ListBuilderPage.tsx` exports `ListBuilderPage` and not much
  else.
- **Size guideline**: ~300 lines is a soft ceiling. Past that, split by
  responsibility (a component's hooks move to `hooks/`, its subparts
  move to `components/`) rather than growing the file further.
- **No blind barrel files**: don't add an `index.ts` that does
  `export * from './everything'` across a whole feature. If you need a
  barrel, export only the feature's actual public surface (its page
  component, maybe a hook), so it's obvious from the barrel file alone
  what the rest of the app is allowed to depend on.
- **Commands are verbs, files are nouns**: `commands/lists.rs` contains
  `create_list`, `update_list`, `validate_list`, etc. -- all operations
  on the list *domain*, not grouped by which feature happened to call
  them first.

## Enforcing feature isolation

Add an ESLint rule so "features don't import each other" isn't just a
convention people forget under deadline pressure:

```json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["../../features/*", "@/features/*"],
            "message": "Features may not import from other features. Promote shared logic to src/lib/ or src/components/ instead."
          }
        ]
      }
    ]
  }
}
```
(Exact path patterns will need adjusting once CC sets up the real
import-alias config, but the intent is what matters: make the violation
a lint error, not a code-review nitpick that gets missed.)

## Module addition checklist

Paste this into a CC prompt whenever starting a genuinely new
feature/module, so scope stays bounded and the layering rules get
followed from the first commit rather than retrofitted:

```
New module: <name>

1. What does this module own? (one sentence)
2. What existing data types does it need? Do they already exist in
   src-tauri/src/types/, or do new ones need adding there first?
3. What domain logic (if any) does this need? Confirm it doesn't
   already exist in src-tauri/src/domain/ before writing new logic.
4. What commands does it expose? List them as verbs
   (create_x, validate_x, ...) -- one job each.
5. What does the frontend feature folder need? List the page(s),
   component(s), and confirm none of this logic belongs in lib/api/
   instead of the feature folder.
6. Does this module need to import from another feature folder? If
   yes, stop -- that logic needs to be promoted to lib/ or components/
   first.
7. Add an entry to docs/DECISIONS.md if this involved a real choice
   (library, pattern, data shape) worth remembering later.
```

## Proof of concept: schema validation working today

`data/schema/keyword.schema.json` was written and `data/keywords.json`
was validated against it as part of this handoff -- see the validation
output noted in the commit/session log. This isn't hypothetical
tooling; it's a pattern you can point CC at directly and say "follow
this same approach for card.schema.json."
