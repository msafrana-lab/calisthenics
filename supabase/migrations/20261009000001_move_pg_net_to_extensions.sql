-- Move pg_net out of the public schema (Supabase security advisor: extension_in_public).
-- pg_net cannot be relocated with ALTER EXTENSION, so it is re-created in the
-- extensions schema. Its functions stay in the net schema, so the
-- 'sync-integrations' cron job (net.http_post) is unchanged. The request and
-- response log tables are emptied by the re-creation.
-- Applied on 2026-10-09 through the dashboard SQL editor.
drop extension if exists pg_net;
create extension pg_net with schema extensions;
