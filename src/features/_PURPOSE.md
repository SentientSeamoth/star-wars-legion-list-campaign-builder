# features/

Each subfolder is a self-contained feature (list-builder, scenarios,
campaigns, keyword-library, card-browser, accounts).

RULES:
- A feature folder may import from: src/lib/, src/components/, and its
  own subtree. It may NOT import from another feature's folder.
- If two features need the same logic, promote that logic to
  src/lib/utils/ (generic helpers) or src/components/ (shared UI) --
  don't reach across the feature boundary or copy-paste it.
- Each feature owns its own components/ and hooks/ subfolders. Keep
  feature-specific state inside the feature; don't leak it into global
  state unless it's genuinely cross-feature (e.g. the active user
  profile).
