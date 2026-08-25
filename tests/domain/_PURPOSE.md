# tests/domain/

Unit tests that mirror src-tauri/src/domain/ 1:1 (one test file per
domain module). Because domain/ is pure functions with no I/O, these
tests should run fast and never touch a real database.
