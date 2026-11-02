-- 0011 badge rows (SCORING_BADGES.md §6). Reference data, safe for production.
-- Evaluation arrives in Phase 6; Phase 7 badges are inserted inactive until then.
insert into public.badges (slug, name, description, category, rule, is_active) values
  ('bandra-native', 'Bandra Native', 'Explored 20 places across Bandra.', 'exploration',
   '{"type":"unique_places_in_areas","area_slugs":["bandra-west","bandra-east"],"threshold":20}', true),
  ('suburb-surveyor', 'Suburb Surveyor', 'Ate in 5 different suburbs.', 'exploration',
   '{"type":"unique_areas","kind":"suburb","threshold":5}', true),
  ('thela-hunter', 'Thela Hunter', 'Logged 10 different street stalls.', 'culture',
   '{"type":"unique_places_of_type","place_type":"street_stall","threshold":10}', true),
  ('first-finder', 'First Finder', 'First in your circle to find 3 places your friends went to later.', 'behaviour',
   '{"type":"first_among_friends","threshold":3}', true),
  ('honest-critic', 'Honest Critic', 'Gives both Go and Skip: at least 5 of each.', 'behaviour',
   '{"type":"skip_and_go_balance","min_skip":5,"min_go":5}', true),
  ('south-bombay-soul', 'South Bombay Soul', 'Explored 15 places in South Mumbai.', 'exploration',
   '{"type":"unique_places_in_region","region_slug":"south-mumbai","threshold":15}', false),
  ('vada-pav-veteran', 'Vada Pav Veteran', 'Tried vada pav at 10 different places.', 'culture',
   '{"type":"unique_places_with_cuisine","cuisine_tag":"vada_pav","threshold":10}', false),
  ('irani-chai-regular', 'Irani Chai Regular', 'Visited 5 different Irani cafes.', 'culture',
   '{"type":"unique_places_with_cuisine","cuisine_tag":"irani_cafe","threshold":5}', false),
  ('thali-master', 'Thali Master', 'Visited 5 different thali places.', 'culture',
   '{"type":"unique_places_with_cuisine","cuisine_tag":"gujarati_thali","threshold":5}', false),
  ('trusted-taster', 'Trusted Taster', '5 friends went somewhere after your Go.', 'behaviour',
   '{"type":"friends_acted_on_go","window_days":30,"threshold":5}', false),
  ('family-table', 'Family Table', '5 visits with your Family group.', 'culture',
   '{"type":"family_visits","threshold":5}', false),
  ('local-train-foodie', 'Local Train Foodie', 'Ate near 10 different railway stations.', 'exploration',
   '{"type":"near_stations","threshold":10}', false)
on conflict (slug) do nothing;
