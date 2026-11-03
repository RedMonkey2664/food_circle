-- Nightly taste-match refresh (P2-03), scheduled inside Postgres with pg_cron.
-- Replaces a Vercel Cron route: no HTTP endpoint and no shared secret to manage.
-- 21:30 UTC = 03:00 IST, the quietest hour. Jobs run as the migration owner (postgres).
create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid) from cron.job where jobname = 'refresh-taste-matches';

select cron.schedule(
  'refresh-taste-matches',
  '30 21 * * *',
  $$select public.refresh_all_taste_matches()$$
);
