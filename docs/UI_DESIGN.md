# UI Design System

Reference for every screen built after this one. First screen (Army
Creation) established these tokens -- reuse them, don't reinvent per
screen. See `src/features/list-builder/ArmyCreationScreen.jsx` as the
canonical working example.

## Concept: "Deployment Manifest" / holotable console

Dark, near-space background with faction-tinted panels that read like a
tactical holotable display -- thin borders, low-alpha color fills rather
than solid blocks, a slow scanline sweep on the primary focus panel. Kept
deliberately restrained everywhere except that one signature panel, per
the frontend-design skill's "spend your boldness in one place" principle.

## Color tokens

Base:
- `bg-void`: radial gradient from `#10131A` (center) to `#07090D` (edges)
- `panel-border-idle`: `#232A38`
- `ink-primary`: `#E8ECF2` / `ink-muted`: `#8891A3`

Faction hues (single canonical hex per faction, reused at different alpha
values rather than separate light/dark hex pairs):

| Faction | Hex | Notes |
|---|---|---|
| Separatist | `#2F7FD1` | saturated tactical blue |
| Republic | `#8B5FE0` | rich violet-purple |
| Rebel | `#3FA35A` | alliance green |
| Empire | `#C23B3B` | imperial crimson |
| Assassins | `#1B1D22` fill / `#C9CBD3` accent | see naming note below |

**Naming note**: the project's data layer (`data/factions.json`) calls
this faction `mercenary`. This screen displays it as "Assassins" per
explicit instruction from the project owner -- treated as a UI-only
display label, resolved (not renamed) on 2026-08-23 when army-list
save/load was built: `src/features/list-builder/uiMapping.ts` maps
`"assassins"` to the real `"mercenary"` id at the point a list is saved
or loaded, the same way it maps this screen's `"traditional"`/`"custom"`
mode values to the schema's `"official"`/`"freeform"`. Neither vocabulary
got renamed -- the UI keeps its label, the data layer keeps its id.

**"Black" faction implementation note**: literal black doesn't read as a
distinct color against an already-near-black background. Assassins is
implemented as a slightly-lighter-than-void neutral panel fill with a
bright silver/white accent color carrying the "this is a distinct zone"
job instead of the hue itself -- worth knowing before anyone tries to
reuse a naive `hexToRgba(black, alpha)` for it elsewhere.

## Traditional vs. Custom (the "bold vs light" rule)

Applied identically to every panel type (army meta header, rank
sections, command hand strip) -- this consistency is the point, not just
a header-panel detail:

- **Traditional**: higher alpha fill (~0.16-0.22), solid border,
  heavier border width (2px on the primary header panel).
- **Custom**: lower alpha fill (~0.05-0.08), dashed border, thinner
  (1px).

Same hue family in both cases -- the distinction is weight/boldness, not
a different color, matching the literal instruction ("custom cards
should be lighter, whereas traditional should be darker and bolder").

## Typography

- Display/headers: **Rajdhani** (500/600/700) -- geometric, technical,
  sci-fi-HUD-appropriate. Used for section labels, army name, mode
  toggle.
- Body: **Inter** (400/500) -- everything else.
- Data/stats/points: **IBM Plex Mono** (via the shared `.font-mono`
  utility class in `src/index.css`) -- every numeric readout (points,
  WT/SPD/DEF, pip counts, owned quantities) uses this so numbers are
  visually distinct from prose at a glance.

**2026-08-23 update**: the Google Fonts `@import` and `.font-mono` class
used to live in a per-component `<style>` block (see the original note
below), on purpose, until a shared app shell existed to hoist them into.
`App.tsx` now mounts more than one screen (`ArmyCreationScreen` +
`CollectionScreen`), so that condition is met -- both now live once in
`src/index.css`, loaded via `main.tsx`. A screen's own `<style>` block
should hold only what's genuinely specific to that screen (e.g.
`ArmyCreationScreen`'s `.scanline` keyframes stay local, since only its
one signature panel uses them).

## Layout pattern for a data-entry screen

1. Thin uppercase eyebrow (breadcrumb-style context, not a real nav bar
   yet).
2. One "meta panel" at the top holding the record's identity fields
   (name, category/faction, key limits, mode) -- this is the panel that
   gets the boldest treatment (thicker border, scanline signature).
3. Collapsible sections below, one per logical grouping (here: unit
   rank). Each section shows a running subtotal in its header even when
   collapsed.
4. Any cross-cutting summary (points used, command hand) as a final
   strip at the bottom, not floated separately.

## Honesty constraint carried into the UI

Traditional-mode rank badges show qualitative state ("Required" /
"Optional") rather than specific numeric ranges (e.g. NOT "Corps 2-6").
This is deliberate: the project's own research found rank-requirement
numbers differ per Battle Force, and the true generic "standard army"
numbers were never independently confirmed (see `docs/TODO.md`). Don't
add specific numbers to this UI until that's actually sourced -- a
confident-looking UI badge with a guessed number is worse than a vague
one.

**Extended to unit rows on 2026-08-23**: once real units replaced the
sample data in the rank sections, the same rule applied to their
points/wounds/speed/defense columns -- every one of those stats is
`null` for every unit in `data/units.json`. Rather than show a fake `pts`
number (or a `0` that would misleadingly read as "free"), those columns
were dropped from the row entirely, and the header's points-total/limit
progress bar was replaced with a plain unit count plus a note that a real
total isn't available yet. Don't reintroduce a computed points total
anywhere in this screen until real point costs exist in the data.

## Second screen: My Collection (2026-08-23)

`src/features/collection/CollectionScreen.tsx` is the first screen built
after this doc and reuses its tokens (dark panels, Rajdhani/Inter/
IBM Plex Mono, `bg-void` gradient) but isn't faction-scoped, so it isn't
part of the Traditional/Custom system above. It introduces one new
accent -- a teal (`rgba(79, 209, 197, ...)`) for its header panel -- as a
neutral "this is app data, not army-building" signal, distinct from any
faction hue. If a third non-faction-scoped screen gets built, promote
that teal to a named token here rather than re-picking a color by eye.

## What's NOT decided yet

- **App shell/navigation is still just a stopgap.** `App.tsx` has a
  minimal two-tab switcher (Army Builder / My Collection) purely so the
  new Collection screen is reachable -- explicitly not real navigation
  design (no routing library, no way to deep-link, no nav for unit
  sub-menus). Design this for real once there are more than two screens.
- No responsive/mobile breakpoint pass done -- built at a single desktop
  width (`max-w-3xl`) for now.
- Iconography is all `lucide-react` for now (available in the artifact
  environment); confirm that's still fine once this moves into the real
  Tauri+React app, which may want to swap in game-specific iconography
  later.
