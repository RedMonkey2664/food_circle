-- 0012 Row Level Security and column grants (SECURITY_PRIVACY.md §4)
--
-- Model: deny by default, then grant exactly what each table needs.
--   * anon gets nothing (anonymous visitors see nothing in Phase 0/1).
--   * authenticated gets SELECT everywhere (RLS filters rows) and only the column-level
--     writes listed below. Everything else is RPC-only (security definer functions).
--   * Future tables and functions get no automatic grants: each migration grants explicitly.
set search_path = public, extensions;

-- 1. Reset table privileges ---------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;

-- 2. Enable RLS on every table --------------------------------------------------------------
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- 3. Reference data -------------------------------------------------------------------------
create policy areas_select on public.areas for select to authenticated using (true);
create policy brands_select on public.brands for select to authenticated using (true);
create policy badges_select on public.badges for select to authenticated using (true);
-- places: inserts only via create_place RPC (Phase 5); updates/merges only via admin RPCs.
create policy places_select on public.places for select to authenticated using (true);

-- 4. Profiles -------------------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (not private.is_blocked_between(auth.uid(), id));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and private.is_active_user(auth.uid()));
-- Clients may only edit these columns. is_admin, banned_at, onboarded_at, created_at are
-- server-only (onboarding completion goes through an RPC in Phase 1).
grant update (username, display_name, bio, avatar_url, home_area_id, diet_prefs,
              is_private, default_visibility, leaderboards_opt_in)
  on public.profiles to authenticated;

-- 5. Social graph: read own rows, write only through RPCs ----------------------------------
create policy friendships_select on public.friendships for select to authenticated
  using (auth.uid() in (user_low, user_high));
create policy follows_select on public.follows for select to authenticated
  using (auth.uid() in (follower_id, following_id));
create policy blocks_select_own on public.blocks for select to authenticated
  using (blocker_id = auth.uid());

create policy mutes_select_own on public.mutes for select to authenticated
  using (muter_id = auth.uid());
create policy mutes_insert_own on public.mutes for insert to authenticated
  with check (muter_id = auth.uid() and private.is_active_user(auth.uid()));
create policy mutes_delete_own on public.mutes for delete to authenticated
  using (muter_id = auth.uid());
grant insert (muter_id, muted_id), delete on public.mutes to authenticated;

-- 6. Moderation -----------------------------------------------------------------------------
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and private.is_active_user(auth.uid()));
create policy reports_select_admin on public.reports for select to authenticated
  using (private.is_admin());
create policy reports_update_admin on public.reports for update to authenticated
  using (private.is_admin()) with check (private.is_admin());
grant insert (reporter_id, target_type, target_id, reason) on public.reports to authenticated;
grant update (status, reviewed_by) on public.reports to authenticated;

create policy audit_select_admin on public.admin_audit for select to authenticated
  using (private.is_admin());

create policy suggestions_insert on public.place_suggestions for insert to authenticated
  with check (user_id = auth.uid() and private.is_active_user(auth.uid()));
create policy suggestions_select on public.place_suggestions for select to authenticated
  using (user_id = auth.uid() or private.is_admin());
grant insert (place_id, user_id, field, value) on public.place_suggestions to authenticated;

-- 7. Visits ---------------------------------------------------------------------------------
create policy visits_select on public.visits for select to authenticated
  using (private.can_view_visit(auth.uid(), id, user_id, visibility));
create policy visits_insert_own on public.visits for insert to authenticated
  with check (user_id = auth.uid() and private.is_active_user(auth.uid()));
create policy visits_update_own on public.visits for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and private.is_active_user(auth.uid()));
create policy visits_delete_own on public.visits for delete to authenticated
  using (user_id = auth.uid());
-- Computed and privileged columns (flags, verified, logged_at) are never client-writable.
grant insert (user_id, place_id, visited_on, verdict, only_for_text, visibility) on public.visits to authenticated;
grant update (visited_on, verdict, only_for_text, visibility) on public.visits to authenticated;
grant delete on public.visits to authenticated;

-- Audience groups: the author can read which groups a visit is shared to; writes via RPC (Phase 3).
create policy vag_select_author on public.visit_audience_groups for select to authenticated
  using (exists (select 1 from public.visits v where v.id = visit_id and v.user_id = auth.uid()));

-- 8. Review layer: follows visit visibility ---------------------------------------------------
create policy reviews_select on public.reviews for select to authenticated using (
  exists (select 1 from public.visits v where v.id = visit_id
          and private.can_view_visit(auth.uid(), v.id, v.user_id, v.visibility)));
create policy reviews_write_own on public.reviews for all to authenticated
  using (exists (select 1 from public.visits v where v.id = visit_id and v.user_id = auth.uid()))
  with check (exists (select 1 from public.visits v where v.id = visit_id and v.user_id = auth.uid())
              and private.is_active_user(auth.uid()));
grant insert (visit_id, note, price_per_head, occasion_tags),
      update (note, price_per_head, occasion_tags), delete
  on public.reviews to authenticated;

create policy dishes_select on public.review_dishes for select to authenticated using (
  exists (select 1 from public.visits v where v.id = visit_id
          and private.can_view_visit(auth.uid(), v.id, v.user_id, v.visibility)));
create policy dishes_write_own on public.review_dishes for all to authenticated
  using (exists (select 1 from public.visits v where v.id = visit_id and v.user_id = auth.uid()))
  with check (exists (select 1 from public.visits v where v.id = visit_id and v.user_id = auth.uid())
              and private.is_active_user(auth.uid()));
grant insert (visit_id, name, name_normalized, verdict), update (name, name_normalized, verdict), delete
  on public.review_dishes to authenticated;

-- 9. Memory layer: stricter than the visit ------------------------------------------------------
-- A memory is visible to the author, or (memory.visibility = 'friends') to friends who can see the visit.
create or replace function private.can_view_memory(viewer uuid, p_visit uuid) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (
    select 1 from public.visits v
    left join public.memories m on m.visit_id = v.id
    where v.id = p_visit and (
      v.user_id = viewer
      or (m.visibility = 'friends'
          and private.are_friends(viewer, v.user_id)
          and private.can_view_visit(viewer, v.id, v.user_id, v.visibility))));
$$;
revoke all on function private.can_view_memory(uuid, uuid) from public;
grant execute on function private.can_view_memory(uuid, uuid) to authenticated, service_role;

create policy memories_select on public.memories for select to authenticated
  using (private.can_view_memory(auth.uid(), visit_id));
create policy memories_write_own on public.memories for all to authenticated
  using (exists (select 1 from public.visits v where v.id = visit_id and v.user_id = auth.uid()))
  with check (exists (select 1 from public.visits v where v.id = visit_id and v.user_id = auth.uid())
              and private.is_active_user(auth.uid()));
grant insert (visit_id, private_note, mood, occasion, visibility),
      update (private_note, mood, occasion, visibility), delete
  on public.memories to authenticated;

-- Photos: review photos follow the visit; memory photos follow the memory (threat 9).
create policy photos_select on public.visit_photos for select to authenticated using (
  case kind
    when 'review' then exists (select 1 from public.visits v where v.id = visit_id
                               and private.can_view_visit(auth.uid(), v.id, v.user_id, v.visibility))
    when 'memory' then private.can_view_memory(auth.uid(), visit_id)
    else false end);
create policy photos_write_own on public.visit_photos for all to authenticated
  using (exists (select 1 from public.visits v where v.id = visit_id and v.user_id = auth.uid()))
  with check (exists (select 1 from public.visits v where v.id = visit_id and v.user_id = auth.uid())
              and private.is_active_user(auth.uid()));
grant insert (visit_id, kind, storage_path, width, height, position), update (position), delete
  on public.visit_photos to authenticated;

-- Companions are part of the memory layer (DECISIONS.md): visible like the memory,
-- plus always to the tagged person themself.
create policy companions_select on public.visit_companions for select to authenticated
  using (user_id = auth.uid() or private.can_view_memory(auth.uid(), visit_id));
create policy companions_insert_author on public.visit_companions for insert to authenticated
  with check (exists (select 1 from public.visits v where v.id = visit_id and v.user_id = auth.uid())
              and private.are_friends(auth.uid(), user_id)
              and private.is_active_user(auth.uid()));
create policy companions_update_tagged on public.visit_companions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and status in ('added','dismissed'));
create policy companions_delete_author on public.visit_companions for delete to authenticated
  using (exists (select 1 from public.visits v where v.id = visit_id and v.user_id = auth.uid()));
grant insert (visit_id, user_id), update (status), delete on public.visit_companions to authenticated;

-- 10. Groups and invites (writes via RPC in Phase 1/3) -----------------------------------------
create policy groups_select_member on public.groups for select to authenticated
  using (owner_id = auth.uid() or private.is_group_member(id, auth.uid()));
create policy gm_select_same_group on public.group_members for select to authenticated
  using (private.is_group_member(group_id, auth.uid()));

create policy invites_select_own on public.invites for select to authenticated
  using (created_by = auth.uid());
create policy redemptions_select on public.invite_redemptions for select to authenticated
  using (user_id = auth.uid()
         or exists (select 1 from public.invites i where i.id = invite_id and i.created_by = auth.uid()));

-- 11. Scores, streaks, badges, matches (writes only by scoring functions) -----------------------
create policy scores_select_own on public.user_scores for select to authenticated
  using (user_id = auth.uid());
create policy streaks_select_own on public.user_streaks for select to authenticated
  using (user_id = auth.uid());
create policy user_badges_select on public.user_badges for select to authenticated
  using (not private.is_blocked_between(auth.uid(), user_id));
create policy taste_select on public.taste_matches for select to authenticated
  using (auth.uid() in (user_a, user_b));
