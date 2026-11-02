-- Deny-by-default for functions, properly this time.
--
-- 0012 used `alter default privileges IN SCHEMA public revoke execute ... from public`, but a
-- per-schema default can't remove PostgreSQL's GLOBAL default (EXECUTE to PUBLIC on every new
-- function). Result: every RPC added since was callable by `anon`. Each one still refused
-- without a signed-in user (no data leaked), but the grant layer must stand on its own.
-- Fix: revoke the global default for the migration role, sweep existing functions, then grant
-- authenticated explicitly. A pgTAP meta test now guards this.
set search_path = public, extensions;

alter default privileges revoke execute on functions from public;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;

-- Server-only maintenance function stays service-role only.
revoke execute on function public.admin_refresh_place_areas() from authenticated;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
