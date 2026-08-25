import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Separate from vite.config.ts (which is dev-server config Tauri depends
// on) so test tooling can't accidentally affect `tauri dev`/`npm run
// build`. See docs/TODO.md's 2026-08-24 "frontend test tooling" entry.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
