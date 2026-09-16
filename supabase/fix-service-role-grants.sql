-- One-time fix: some projects are provisioned without the default table
-- privileges for the service_role (used by seed-demo.mjs and server-side
-- admin code). This restores the standard Supabase defaults.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Also make sure future tables (from new migrations) get them automatically:
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
