# lib/api/

The ONLY files in the frontend allowed to call the generated Tauri
`invoke()` bindings.

RULES:
- One file per data domain (cards.ts, keywords.ts, lists.ts...),
  mirroring src-tauri/src/commands/.
- Feature components never import from '@tauri-apps/api' directly --
  they import a typed function from here. This means if a command's
  signature changes, there is exactly one place in the frontend to fix,
  and it's easy to grep for every place the backend is actually touched.
