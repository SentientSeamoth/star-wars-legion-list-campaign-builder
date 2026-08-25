# domain/

Pure business logic. No I/O, no database calls, no Tauri types.

This is where:
- Army list validation (official-mode rules) lives
- Keyword resolution/stacking logic lives
- Scenario/mission rule evaluation lives

RULES:
- Every function here should be a pure function: given the same inputs,
  always the same output, no side effects. This makes the game rules
  logic fully unit-testable without spinning up SQLite or Tauri at all
  (see tests/domain/).
- This is the ONE place list-validation rules are encoded. `commands/`
  and the frontend must never re-implement or duplicate this logic --
  if the frontend needs to preview validation results, it should call
  the same command that calls this code, not reimplement a shadow
  version in TypeScript.
