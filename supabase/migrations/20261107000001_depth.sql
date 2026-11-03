-- Phase 4: depth one tap away (PHASES.md P4-01..P4-07). Reviews, dish verdicts and review
-- photos already exist with RLS that follows the visit (0005, 0012). This adds the photo
-- bucket, guard triggers, an atomic save, batch reads for verdict cards and top dishes.
set search_path = public, extensions;

-- ---------------------------------------------------------------------------------------
-- Storage: private bucket, WebP only, <= 400 KB per object (client targets < 300 KB).
-- Path: {user_id}/{visit_id}/{uuid}.webp (SECURITY_PRIVACY.md section 5).
-- ---------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-photos', 'review-photos', false, 400000, array['image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = 400000, allowed_mime_types = array['image/webp'];

-- Upload only into your own folder, for a visit you own.
create policy review_photos_insert_own on storage.objects for insert to authenticated
with check (
  bucket_id = 'review-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (select 1 from public.visits v
               where v.id::text = (storage.foldername(name))[2] and v.user_id = auth.uid())
);

create policy review_photos_delete_own on storage.objects for delete to authenticated
using (bucket_id = 'review-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Read (signed URLs are created with the viewer's session): only objects referenced by a
-- visit_photos row the viewer may see. visit_photos RLS applies inside this subquery.
create policy review_photos_select_visible on storage.objects for select to authenticated
using (
  bucket_id = 'review-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.visit_photos p where p.storage_path = name)
  )
);

-- ---------------------------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------------------------

-- Photos: path must sit in the author's folder for this visit; at most 6 per visit.
create or replace function private.visit_photos_guard() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare author uuid;
begin
  select user_id into author from public.visits where id = new.visit_id;
  if new.storage_path !~ ('^' || author::text || '/' || new.visit_id::text || '/[0-9a-f-]{36}\.webp$') then
    raise exception 'invalid_input' using errcode = 'P0001', detail = 'storage_path';
  end if;
  if (select count(*) from public.visit_photos where visit_id = new.visit_id) >= 6 then
    raise exception 'invalid_input' using errcode = 'P0001', detail = 'too_many_photos';
  end if;
  return new;
end $$;

create trigger visit_photos_guard before insert on public.visit_photos
  for each row execute function private.visit_photos_guard();

-- Dishes: normalized name is always computed here; at most 10 per visit.
create or replace function private.review_dishes_before_write() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  new.name := btrim(regexp_replace(new.name, '\s+', ' ', 'g'));
  new.name_normalized := public.normalize_name(new.name);
  if tg_op = 'INSERT' and (select count(*) from public.review_dishes where visit_id = new.visit_id) >= 10 then
    raise exception 'invalid_input' using errcode = 'P0001', detail = 'too_many_dishes';
  end if;
  return new;
end $$;

create trigger review_dishes_before_write before insert or update of name on public.review_dishes
  for each row execute function private.review_dishes_before_write();

alter table public.reviews add constraint reviews_occasions_known check (
  occasion_tags <@ array['family_dinner','date','group_of_10','late_night','post_exam','pure_veg_family']);

-- ---------------------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------------------

-- Save the review layer in one transaction (P4-01, P4-02, P4-06). Security invoker: the
-- normal RLS policies and column grants decide; only the visit's author can write.
-- p_dishes: [{"name": "Bun maska", "verdict": "go"}, ...] replaces the visit's dishes.
create or replace function public.save_review(
  p_visit uuid, p_note text default null, p_price int default null,
  p_occasions text[] default '{}', p_dishes jsonb default '[]')
returns void
language plpgsql security invoker set search_path = public, extensions as $$
begin
  if not exists (select 1 from public.visits where id = p_visit and user_id = auth.uid()) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if jsonb_typeof(coalesce(p_dishes, '[]')) <> 'array' or jsonb_array_length(coalesce(p_dishes, '[]')) > 10 then
    raise exception 'invalid_input' using errcode = 'P0001', detail = 'dishes';
  end if;

  insert into public.reviews (visit_id, note, price_per_head, occasion_tags)
  values (p_visit, nullif(btrim(p_note), ''), p_price, coalesce(p_occasions, '{}'))
  on conflict (visit_id) do update
    set note = excluded.note, price_per_head = excluded.price_per_head,
        occasion_tags = excluded.occasion_tags;

  delete from public.review_dishes where visit_id = p_visit;
  insert into public.review_dishes (visit_id, name, name_normalized, verdict)
  select p_visit, d->>'name', '', (d->>'verdict')::verdict
  from jsonb_array_elements(coalesce(p_dishes, '[]')) d
  where nullif(btrim(d->>'name'), '') is not null;
end $$;

-- Details for a batch of visits (verdict cards expand on tap, P4-04). Security invoker:
-- RLS on reviews / review_dishes / visit_photos returns only what the viewer may see.
create or replace function public.get_visit_details(p_visits uuid[])
returns table (visit_id uuid, note text, price_per_head int, occasion_tags text[],
               dishes jsonb, photo_paths text[])
language sql stable security invoker set search_path = public, extensions as $$
  with ids as (select distinct unnest(p_visits[1:100]) as id)
  select ids.id,
         r.note, r.price_per_head, coalesce(r.occasion_tags, '{}'),
         coalesce((select jsonb_agg(jsonb_build_object('name', d.name, 'verdict', d.verdict) order by d.created_at)
                     from public.review_dishes d where d.visit_id = ids.id), '[]'::jsonb),
         coalesce((select array_agg(p.storage_path order by p.position, p.created_at)
                     from public.visit_photos p where p.visit_id = ids.id and p.kind = 'review'), '{}')
  from ids
  left join public.reviews r on r.visit_id = ids.id
  where r.visit_id is not null
     or exists (select 1 from public.review_dishes d where d.visit_id = ids.id)
     or exists (select 1 from public.visit_photos p where p.visit_id = ids.id and p.kind = 'review');
$$;

-- Top dishes per tier on a place page (P4-05). Uses each author's latest visible visit, the
-- same rows as the tier summary, so tiers are never blended.
create or replace function public.get_place_top_dishes(p_place uuid)
returns table (tier smallint, name text, go_count int, skip_count int)
language sql stable security definer set search_path = public, extensions as $$
  with d as (
    select t.tier, dd.name_normalized, dd.name, dd.verdict
    from private.latest_visible_verdicts(p_place, auth.uid()) t
    join public.review_dishes dd on dd.visit_id = t.visit_id
    where auth.uid() is not null
  ), agg as (
    select d.tier, d.name_normalized,
           (array_agg(d.name order by d.name))[1] as name,
           count(*) filter (where d.verdict = 'go')::int as go_count,
           count(*) filter (where d.verdict = 'skip')::int as skip_count
    from d group by d.tier, d.name_normalized
  ), ranked as (
    select a.*, row_number() over (partition by a.tier order by a.go_count desc, a.skip_count, a.name) as rn
    from agg a
  )
  select r.tier, r.name, r.go_count, r.skip_count from ranked r where r.rn <= 5
  order by r.tier, r.rn;
$$;

grant execute on function public.save_review(uuid, text, int, text[], jsonb),
  public.get_visit_details(uuid[]), public.get_place_top_dishes(uuid) to authenticated;
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
