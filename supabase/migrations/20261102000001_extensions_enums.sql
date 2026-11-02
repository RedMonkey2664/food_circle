-- 0001 extensions and enums (DATABASE.md §1)
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists citext with schema extensions;

create type public.verdict          as enum ('go','skip','only_for');
create type public.visibility       as enum ('private','friends','followers','public');
create type public.place_type       as enum ('restaurant','cafe','street_stall','bakery','sweet_shop','bar','other');
create type public.place_status     as enum ('unverified','confirmed','merged','closed');
create type public.request_status   as enum ('pending','accepted');
create type public.group_role       as enum ('owner','member');
create type public.invite_kind      as enum ('friend','group');
create type public.report_target    as enum ('user','visit','place');
create type public.report_status    as enum ('open','reviewed','actioned','dismissed');
create type public.score_period     as enum ('week','month','all');
create type public.companion_status as enum ('tagged','added','dismissed');
