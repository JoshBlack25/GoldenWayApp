import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
// The old /api dev proxy to the Spring Boot backend (localhost:8081) has
// been removed — the app talks to Supabase directly via @supabase/supabase-js
// (see src/lib/supabaseClient.js), using VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // MapLibre is ~800 kB on its own; it now loads only on map screens.
    chunkSizeWarningLimit: 1100,
  },
  server: {
    host: true,
    hmr: { host: "localhost" },
  },
});
