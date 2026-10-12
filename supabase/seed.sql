-- Seed de desarrollo.
-- Solo incluye los 17 territorios de primer nivel (15 departamentos + 2 regiones autónomas)
-- con sus códigos ISO 3166-2:NI. Quedan en estado 'draft' hasta que un editor cite la
-- fuente oficial vigente (INETER / INIDE) y los publique.
-- Los municipios NO se siembran aquí: deben importarse desde fuente oficial citada
-- (principio 3: no inventar datos).

insert into app.settings (key, value) values
  ('firebase_project_id', 'REEMPLAZAR-por-project-id-de-firebase')
on conflict (key) do nothing;

insert into public.departments (id, iso_code, slug, name, kind) values
  ( 1, 'NI-BO', 'boaco',          'Boaco',          'department'),
  ( 2, 'NI-CA', 'carazo',         'Carazo',         'department'),
  ( 3, 'NI-CI', 'chinandega',     'Chinandega',     'department'),
  ( 4, 'NI-CO', 'chontales',      'Chontales',      'department'),
  ( 5, 'NI-ES', 'esteli',         'Estelí',         'department'),
  ( 6, 'NI-GR', 'granada',        'Granada',        'department'),
  ( 7, 'NI-JI', 'jinotega',       'Jinotega',       'department'),
  ( 8, 'NI-LE', 'leon',           'León',           'department'),
  ( 9, 'NI-MD', 'madriz',         'Madriz',         'department'),
  (10, 'NI-MN', 'managua',        'Managua',        'department'),
  (11, 'NI-MS', 'masaya',         'Masaya',         'department'),
  (12, 'NI-MT', 'matagalpa',      'Matagalpa',      'department'),
  (13, 'NI-NS', 'nueva-segovia',  'Nueva Segovia',  'department'),
  (14, 'NI-SJ', 'rio-san-juan',   'Río San Juan',   'department'),
  (15, 'NI-RI', 'rivas',          'Rivas',          'department'),
  (16, 'NI-AN', 'costa-caribe-norte', 'Región Autónoma de la Costa Caribe Norte', 'autonomous_region'),
  (17, 'NI-AS', 'costa-caribe-sur',   'Región Autónoma de la Costa Caribe Sur',   'autonomous_region')
on conflict (id) do nothing;

-- Categorías base (sección 6). Etiquetas en español e inglés; el resto de idiomas
-- se completa desde Ops Center > Traducciones.
insert into public.destination_categories (slug, family, labels) values
  ('volcanes',          'nature',    '{"es":"Volcanes","en":"Volcanoes"}'),
  ('reservas-naturales','nature',    '{"es":"Reservas naturales","en":"Nature reserves"}'),
  ('playas',            'nature',    '{"es":"Playas","en":"Beaches"}'),
  ('lagunas-y-lagos',   'nature',    '{"es":"Lagunas y lagos","en":"Lagoons and lakes"}'),
  ('rios',              'nature',    '{"es":"Ríos","en":"Rivers"}'),
  ('cascadas',          'nature',    '{"es":"Cascadas","en":"Waterfalls"}'),
  ('islas',             'nature',    '{"es":"Islas y archipiélagos","en":"Islands"}'),
  ('senderos',          'nature',    '{"es":"Senderos","en":"Trails"}'),
  ('miradores',         'nature',    '{"es":"Miradores","en":"Viewpoints"}'),
  ('cuevas',            'nature',    '{"es":"Cuevas","en":"Caves"}'),
  ('alojamiento',       'services',  '{"es":"Alojamiento","en":"Lodging"}'),
  ('ecoalojamiento',    'services',  '{"es":"Ecoalojamientos","en":"Eco-lodges"}'),
  ('hospedaje-familiar','services',  '{"es":"Hospedaje familiar","en":"Family homestay"}'),
  ('restaurantes',      'services',  '{"es":"Restaurantes","en":"Restaurants"}'),
  ('comedores',         'services',  '{"es":"Comedores tradicionales","en":"Traditional eateries"}'),
  ('cafeterias',        'services',  '{"es":"Cafeterías","en":"Cafés"}'),
  ('mercados',          'services',  '{"es":"Mercados","en":"Markets"}'),
  ('operadores',        'services',  '{"es":"Operadores turísticos","en":"Tour operators"}'),
  ('museos',            'culture',   '{"es":"Museos","en":"Museums"}'),
  ('arqueologia',       'culture',   '{"es":"Sitios arqueológicos","en":"Archaeological sites"}'),
  ('patrimonio',        'culture',   '{"es":"Patrimonio arquitectónico","en":"Architectural heritage"}'),
  ('artesanias',        'culture',   '{"es":"Artesanías","en":"Crafts"}'),
  ('fiestas',           'culture',   '{"es":"Fiestas y celebraciones","en":"Festivities"}'),
  ('cafe',              'community', '{"es":"Ruta del café","en":"Coffee experiences"}'),
  ('cacao',             'community', '{"es":"Cacao","en":"Cacao experiences"}'),
  ('turismo-rural',     'community', '{"es":"Turismo rural comunitario","en":"Rural community tourism"}'),
  ('pesca-artesanal',   'community', '{"es":"Pesca artesanal","en":"Artisanal fishing"}'),
  ('talleres',          'community', '{"es":"Talleres de artesanos","en":"Artisan workshops"}')
on conflict (slug) do nothing;
