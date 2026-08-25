# commands/

Thin Tauri command wrappers ONLY. Each function here:
- Deserializes input from the frontend
- Calls into `domain/` for any business logic/validation
- Calls into `db/` for any persistence
- Serializes and returns the result

RULES:
- No business logic here. No validation logic here. No SQL here.
- If a command function is doing math, checking rules, or branching on
  game logic, that logic belongs in `domain/` and this file should just
  call it.
- One file per data domain (cards.rs, keywords.rs, lists.rs, etc.) --
  don't dump unrelated commands into one file.
- This is the ONLY layer the frontend talks to (via generated bindings).
  Frontend must never reach into `db/` or `domain/` directly -- it can't,
  since those aren't exposed, but don't add a command that just proxies
  raw SQL either.
