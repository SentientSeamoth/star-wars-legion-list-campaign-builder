# db/

Data access layer only. SQL queries, schema, migrations plumbing.

RULES:
- No business/game-rules logic here. This layer doesn't know what
  "official mode" or "Arsenal X" means -- it just stores and retrieves
  rows.
- `queries/` is organized by table/domain, mirroring `commands/`.
- Schema changes go through `migrations/` (see src-tauri/migrations/),
  never as ad-hoc ALTER statements buried in application code.
