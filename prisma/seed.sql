-- Places for launch (NFR-14): Liberia active, cities and Monrovia areas.
-- Safe to run more than once. Run with: npx prisma db execute --file prisma/seed.sql

INSERT INTO "Country" ("id", "isoCode", "name", "phoneCode", "active")
VALUES ('country_lr', 'LR', 'Liberia', '+231', true)
ON CONFLICT ("isoCode") DO UPDATE SET "active" = true;

INSERT INTO "City" ("id", "countryId", "name", "area", "timeZone", "active") VALUES
  ('city_mon_sinkor',      'country_lr', 'Monrovia',     'Sinkor',           'Africa/Monrovia', true),
  ('city_mon_congotown',   'country_lr', 'Monrovia',     'Congo Town',       'Africa/Monrovia', true),
  ('city_mon_mambapoint',  'country_lr', 'Monrovia',     'Mamba Point',      'Africa/Monrovia', true),
  ('city_mon_central',     'country_lr', 'Monrovia',     'Central Monrovia', 'Africa/Monrovia', true),
  ('city_mon_oldroad',     'country_lr', 'Monrovia',     'Old Road',         'Africa/Monrovia', true),
  ('city_mon_bushrod',     'country_lr', 'Monrovia',     'Bushrod Island',   'Africa/Monrovia', true),
  ('city_paynesville',     'country_lr', 'Paynesville',  NULL,               'Africa/Monrovia', true),
  ('city_buchanan',        'country_lr', 'Buchanan',     NULL,               'Africa/Monrovia', true),
  ('city_ganta',           'country_lr', 'Ganta',        NULL,               'Africa/Monrovia', true),
  ('city_kakata',          'country_lr', 'Kakata',       NULL,               'Africa/Monrovia', true),
  ('city_gbarnga',         'country_lr', 'Gbarnga',      NULL,               'Africa/Monrovia', true),
  ('city_harbel',          'country_lr', 'Harbel',       NULL,               'Africa/Monrovia', true),
  ('city_harper',          'country_lr', 'Harper',       NULL,               'Africa/Monrovia', true),
  ('city_zwedru',          'country_lr', 'Zwedru',       NULL,               'Africa/Monrovia', true),
  ('city_voinjama',        'country_lr', 'Voinjama',     NULL,               'Africa/Monrovia', true),
  ('city_tubmanburg',      'country_lr', 'Tubmanburg',   NULL,               'Africa/Monrovia', true),
  ('city_robertsport',     'country_lr', 'Robertsport',  NULL,               'Africa/Monrovia', true),
  ('city_greenville',      'country_lr', 'Greenville',   NULL,               'Africa/Monrovia', true),
  ('city_sanniquellie',    'country_lr', 'Sanniquellie', NULL,               'Africa/Monrovia', true)
ON CONFLICT ("id") DO NOTHING;
