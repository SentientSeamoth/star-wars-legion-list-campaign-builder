# types/

Canonical Rust struct definitions for every shared data shape (Card,
Keyword, ArmyList, Scenario, etc.)

THIS IS THE SINGLE SOURCE OF TRUTH FOR DATA SHAPE. See
docs/FILE_STRUCTURE.md, section "Type generation," for how these get
turned into TypeScript types automatically. Nobody should hand-write a
matching interface in the frontend -- if you need a new field, add it
here first, regenerate, then use it in the frontend.
