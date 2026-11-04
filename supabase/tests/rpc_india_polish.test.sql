-- Phase 7: station badges, recap, share cards, push subscriptions, analytics privacy, Hinglish.
begin;
\ir _helpers.psql

select plan(17);

select tests.create_user('rider') as me \gset
select tests.create_user('other') as other \gset
update profiles set onboarded_at = now();

-- Hinglish folding
select is(hinglish_fold('wada pao and chay'), 'vada pav and chai', 'Hinglish spellings fold to one form');
select is(hinglish_fold('biriyani kabab'), 'biryani kebab', 'more folds');

-- Places near ten stations unlock "Next Station: Snacks"
delete from visits; delete from places;
insert into places (name, geom, source, status)
select 'Stall near ' || s.name, s.geom, 'osm', 'confirmed' from (select * from stations order by name limit 10) s;
insert into visits (user_id, place_id, verdict, visibility, visited_on)
select :'me', p.id, 'go', 'friends', ((now() at time zone 'Asia/Kolkata')::date - row_number() over (order by p.name)::int)
from places p;
select tests.authenticate_as(:'me');
select ok((select earned_at is not null from get_achievements(:'me') where slug = 'local-train-foodie'),
  'food near ten different stations: Next Station: Snacks');

-- Year recap
select is(((get_year_recap(extract(year from now() at time zone 'Asia/Kolkata')::int))->>'places')::int
          + ((get_year_recap(extract(year from now() at time zone 'Asia/Kolkata')::int - 1))->>'places')::int,
  10, 'recap counts this year''s places (visits can straddle New Year)');
select tests.authenticate_as(:'other');
select is(((get_year_recap(extract(year from now() at time zone 'Asia/Kolkata')::int))->>'places')::int, 0,
  'a recap only ever shows your own visits');

-- Share cards
select tests.authenticate_as(:'me');
select create_share_card('recap') as tok \gset
select ok(:'tok' ~ '^[A-Za-z0-9_-]{22,}$', 'share token is long and random');
reset role;
select ok((select not (snapshot ? 'first') and not (snapshot ? 'favourite') and snapshot ? 'display_name'
           from share_cards where token = :'tok'), 'public recap snapshot has no named places');
select tests.authenticate_as(:'me');
select throws_ok($$ select create_share_card('badge', 'skip-lord') $$, 'P0001', 'forbidden',
  'cannot share a badge you have not earned');
select lives_ok($$ select create_share_card('badge', 'local-train-foodie') $$, 'share an earned badge');
select tests.authenticate_as(:'other');
select is((select count(*)::int from share_cards), 0, 'nobody else can list your share cards');
select throws_ok(format('select revoke_share_card(%L)', :'tok'), 'P0001', 'not_found', 'nor revoke them');
select tests.authenticate_as(:'me');
select lives_ok(format('select revoke_share_card(%L)', :'tok'), 'you can revoke your link');

-- Push subscriptions
select lives_ok(format($$insert into push_subscriptions (endpoint, user_id, p256dh, auth)
  values ('https://push.example/abc', %L, 'k', 'a')$$, :'me'), 'save your own push subscription');
select throws_ok(format($$insert into push_subscriptions (endpoint, user_id, p256dh, auth)
  values ('https://push.example/xyz', %L, 'k', 'a')$$, :'other'), '42501', null,
  'cannot subscribe someone else');
select tests.authenticate_as(:'other');
select is((select count(*)::int from push_subscriptions), 0, 'cannot see other people''s subscriptions');

-- Analytics privacy
select is((select count(*)::int from app_events), 0, 'users cannot read analytics');
select throws_ok($$ insert into app_events (name) values ('hacked') $$, '42501', null,
  'users cannot write analytics directly');

select * from finish();
rollback;
