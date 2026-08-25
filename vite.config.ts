import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Standard Tauri 2 + Vite dev-server config: fixed port so tauri.conf.json's
// devUrl can point at it, and ignore src-tauri/ so a Rust rebuild doesn't
// trigger a frontend HMR reload (see docs/ARCHITECTURE.md's repo layout).
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
