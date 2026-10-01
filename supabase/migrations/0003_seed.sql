-- =====================================================================
-- GoldenWay — demo seed data (ported verbatim from the Spring Boot
-- src/main/resources/data.sql). Prices are in cents.
-- =====================================================================

insert into public.routes (code, name, origin, destination, go_easy_eligible, active) values
  ('KHA-CPT',    'Khayelitsha → City',      'Khayelitsha',     'City Bowl',   true,  true),
  ('MP-CPT',     'Mitchells Plain → City',  'Mitchells Plain', 'City Bowl',   true,  true),
  ('BELL-CPT',   'Bellville → City',        'Bellville',       'City Bowl',   true,  true),
  ('WYN-OBS',    'Wynberg → Observatory',   'Wynberg',         'Observatory', true,  true),
  ('CPT-BLK',    'City → Blackheath',       'City Bowl',       'Blackheath',  true,  true),
  ('WOOD-ATL',   'Woodstock → Atlantis',    'Woodstock',       'Atlantis',    false, true),
  ('PAARL-BELL', 'Paarl → Bellville',       'Paarl',           'Bellville',   false, true)
on conflict (code) do nothing;

insert into public.fare_products (code, family, journeys, valid_days, transfers_allowed, active) values
  ('GOEASY-5',         'GO_EASY',    5,  14, 1, true),
  ('GOEASY-10',        'GO_EASY',    10, 30, 1, true),
  ('GOEASY-48',        'GO_EASY',    48, 90, 1, true),
  ('WEEKLY-KHA-CPT',   'WEEKLY',     0,  7,  0, true),
  ('MONTHLY-KHA-CPT',  'MONTHLY',    0,  30, 0, true),
  ('WEEKLY-MP-CPT',    'WEEKLY',     0,  7,  0, true),
  ('MONTHLY-MP-CPT',   'MONTHLY',    0,  30, 0, true),
  ('WEEKLY-BELL-CPT',  'WEEKLY',     0,  7,  0, true),
  ('MONTHLY-BELL-CPT', 'MONTHLY',    0,  30, 0, true),
  ('WEEKLY-WYN-OBS',   'WEEKLY',     0,  7,  0, true),
  ('MONTHLY-WYN-OBS',  'MONTHLY',    0,  30, 0, true),
  ('WEEKLY-CPT-BLK',   'WEEKLY',     0,  7,  0, true),
  ('MONTHLY-CPT-BLK',  'MONTHLY',    0,  30, 0, true),
  ('FLEXI-CAPE-FLAT',  'FLEXI_ZONE', 0,  7,  1, true),
  ('FLEXI-SOUTH',      'FLEXI_ZONE', 0,  7,  1, true)
on conflict (code) do nothing;

insert into public.fare_table_entries (route_code, zone_code, product_code, price_cents, effective_from, effective_to) values
  -- Go Easy
  ('KHA-CPT',  null, 'GOEASY-5',  13000,  '2026-07-01', null),
  ('KHA-CPT',  null, 'GOEASY-10', 23500,  '2026-07-01', null),
  ('KHA-CPT',  null, 'GOEASY-48', 105000, '2026-07-01', null),
  ('MP-CPT',   null, 'GOEASY-5',  13000,  '2026-07-01', null),
  ('MP-CPT',   null, 'GOEASY-10', 23500,  '2026-07-01', null),
  ('MP-CPT',   null, 'GOEASY-48', 105000, '2026-07-01', null),
  ('BELL-CPT', null, 'GOEASY-5',  11250,  '2026-07-01', null),
  ('BELL-CPT', null, 'GOEASY-10', 20500,  '2026-07-01', null),
  ('BELL-CPT', null, 'GOEASY-48', 88000,  '2026-07-01', null),
  ('WYN-OBS',  null, 'GOEASY-5',  1150,   '2026-07-01', null),
  ('WYN-OBS',  null, 'GOEASY-10', 2050,   '2026-07-01', null),
  ('WYN-OBS',  null, 'GOEASY-48', 8800,   '2026-07-01', null),
  ('CPT-BLK',  null, 'GOEASY-5',  7800,   '2026-07-01', null),
  ('CPT-BLK',  null, 'GOEASY-10', 14200,  '2026-07-01', null),
  ('CPT-BLK',  null, 'GOEASY-48', 64000,  '2026-07-01', null),

  -- Cash comparison (synthetic "product", never sold)
  ('KHA-CPT',  null, 'CASH-PEAK', 21000, '2026-07-01', null),
  ('MP-CPT',   null, 'CASH-PEAK', 20500, '2026-07-01', null),
  ('BELL-CPT', null, 'CASH-PEAK', 18500, '2026-07-01', null),
  ('WYN-OBS',  null, 'CASH-PEAK', 1850,  '2026-07-01', null),
  ('CPT-BLK',  null, 'CASH-PEAK', 12500, '2026-07-01', null),

  -- Weekly / monthly
  ('KHA-CPT',  null, 'WEEKLY-KHA-CPT',   42000,  '2026-07-01', null),
  ('KHA-CPT',  null, 'MONTHLY-KHA-CPT',  165000, '2026-07-01', null),
  ('MP-CPT',   null, 'WEEKLY-MP-CPT',    41000,  '2026-07-01', null),
  ('MP-CPT',   null, 'MONTHLY-MP-CPT',   162000, '2026-07-01', null),
  ('BELL-CPT', null, 'WEEKLY-BELL-CPT',  37000,  '2026-07-01', null),
  ('BELL-CPT', null, 'MONTHLY-BELL-CPT', 145000, '2026-07-01', null),
  ('WYN-OBS',  null, 'WEEKLY-WYN-OBS',   3800,   '2026-07-01', null),
  ('WYN-OBS',  null, 'MONTHLY-WYN-OBS',  14800,  '2026-07-01', null),
  ('CPT-BLK',  null, 'WEEKLY-CPT-BLK',   25000,  '2026-07-01', null),
  ('CPT-BLK',  null, 'MONTHLY-CPT-BLK',  98000,  '2026-07-01', null);

insert into public.stops (name, zone, latitude, longitude) values
  ('City Bowl',       'Cape Town',        -33.9249, 18.4241),
  ('Khayelitsha',     'Khayelitsha',      -33.9869, 18.6716),
  ('Mitchells Plain',  'Mitchells Plain', -34.0523, 18.6124),
  ('Bellville',       'Northern Suburbs', -33.9055, 18.6281),
  ('Wynberg',         'Southern Suburbs', -33.9955, 18.4687),
  ('Observatory',     'Cape Town',        -33.9396, 18.4676),
  ('Blackheath',      'Northern Suburbs', -33.8836, 18.8822),
  ('Woodstock',       'Cape Town',        -33.9256, 18.4527),
  ('Atlantis',        'West Coast',       -33.5667, 18.4833),
  ('Paarl',           'Winelands',        -33.7242, 18.9565);

-- A sample live service alert so the Home screen banner has something to show.
insert into public.service_alerts (title, body, severity, route_code, effective_from, effective_to) values
  ('Welcome to GoldenWay', 'GoldenWay is now live. Tap your Gold Card to ride — The Bus For Us.', 'INFO', null, now(), null);
