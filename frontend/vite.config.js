import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
// The old /api dev proxy to the Spring Boot backend (localhost:8081) has
// been removed — the app talks to Supabase directly via @supabase/supabase-js
// (see src/lib/supabaseClient.js), using VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    // Keep HMR working when the page is opened over the LAN IP on a phone.
    hmr: { host: "localhost" },
  },
});
