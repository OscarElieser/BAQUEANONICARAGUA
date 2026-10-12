-- 0003 · Catálogo turístico y Vitrina de Nuestra Gente

create table public.destination_categories (
  id        smallserial primary key,
  slug      text not null unique check (slug ~ '^[a-z0-9-]+$'),
  family    text not null check (family in ('nature','services','culture','community')),
  parent_id smallint references public.destination_categories(id),
  labels    jsonb not null default '{}'::jsonb   -- {"es":"Volcanes","en":"Volcanoes",...}
);

-- Destinos (lugares naturales, culturales, patrimoniales)
create table public.destinations (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name               text not null,
  department_id      smallint not null references public.departments(id),
  municipality_id    uuid references public.municipalities(id),
  summary            text,
  description_md     text,
  location           geometry(Point, 4326),
  location_precision public.location_precision not null default 'approximate',
  access_notes       text,
  safety_notes       text,
  environmental_notes text,
  accessibility      jsonb not null default '{}'::jsonb,   -- solo atributos comprobados
  source_id          uuid references public.data_sources(id),
  verification       public.verification_status not null default 'unverified',
  verified_at        timestamptz,
  editorial          public.editorial_status not null default 'draft',
  is_sensitive       boolean not null default false,       -- comunidad vulnerable / ecosistema frágil
  created_by         uuid references public.profiles(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  archived_at        timestamptz,
  -- un sitio sensible nunca puede publicarse con ubicación exacta
  constraint sensitive_not_exact check (not (is_sensitive and location_precision = 'exact'))
);
create index destinations_location_gix on public.destinations using gist (location);
create index destinations_dept_idx on public.destinations(department_id) where editorial = 'published';
create trigger destinations_touch before update on public.destinations
  for each row execute function app.touch_updated_at();

create table public.destination_category_links (
  destination_id uuid not null references public.destinations(id) on delete cascade,
  category_id    smallint not null references public.destination_categories(id),
  primary key (destination_id, category_id)
);

-- Negocios / emprendimientos
create type public.listing_tier as enum ('community_info','claimed','verified');

create table public.businesses (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid references public.organizations(id),  -- null = ficha comunitaria sin reclamar
  slug               text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name               text not null,
  department_id      smallint not null references public.departments(id),
  municipality_id    uuid references public.municipalities(id),
  destination_id     uuid references public.destinations(id),
  summary            text,
  description_md     text,
  location           geometry(Point, 4326),
  location_precision public.location_precision not null default 'approximate',
  listing_tier       public.listing_tier not null default 'community_info',
  verified_scope     text[] not null default '{}',  -- p. ej. {'identity','location','operating_permit'}
  verified_at        timestamptz,
  is_sponsored       boolean not null default false, -- nunca se mezcla con orgánico sin etiqueta
  source_id          uuid references public.data_sources(id),
  editorial          public.editorial_status not null default 'draft',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  archived_at        timestamptz,
  constraint claimed_needs_org check (listing_tier = 'community_info' or organization_id is not null),
  constraint verified_needs_scope check (listing_tier <> 'verified' or cardinality(verified_scope) > 0)
);
create index businesses_location_gix on public.businesses using gist (location);
create index businesses_org_idx on public.businesses(organization_id);
create trigger businesses_touch before update on public.businesses
  for each row execute function app.touch_updated_at();

create table public.business_categories (
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id smallint not null references public.destination_categories(id),
  primary key (business_id, category_id)
);

create type public.claim_state as enum ('submitted','in_review','needs_info','approved','rejected','appealed');

create table public.business_claims (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id),
  claimant_id     uuid not null references public.profiles(id),
  organization_id uuid references public.organizations(id),
  evidence_paths  text[] not null default '{}',
  state           public.claim_state not null default 'submitted',
  decision_reason text,
  reviewer_id     uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  decided_at      timestamptz
);
create unique index one_open_claim_per_user on public.business_claims(business_id, claimant_id)
  where state in ('submitted','in_review','needs_info','appealed');

-- Horarios: siempre con fecha de verificación
create table public.opening_hours (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid references public.businesses(id) on delete cascade,
  destination_id uuid references public.destinations(id) on delete cascade,
  weekday      smallint not null check (weekday between 1 and 7),  -- ISO 8601
  opens_at     time,
  closes_at    time,
  closed       boolean not null default false,
  verified_at  timestamptz not null,
  source_id    uuid references public.data_sources(id),
  constraint one_owner check ((business_id is null) <> (destination_id is null))
);

-- Tarifas observadas (nunca precio "suelto" sin fecha ni fuente)
create table public.price_observations (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid references public.businesses(id) on delete cascade,
  destination_id uuid references public.destinations(id) on delete cascade,
  label         text not null,                    -- "Entrada adulto nacional"
  amount        numeric(12,2) not null check (amount >= 0),
  currency      char(3) not null check (currency in ('NIO','USD')),
  unit          text,                              -- por persona, por noche…
  observed_at   date not null,
  reported_by   text not null check (reported_by in ('owner','editor','official_source')),
  source_id     uuid references public.data_sources(id),
  constraint one_owner check ((business_id is null) <> (destination_id is null))
);

-- Contactos públicos con autorización explícita
create table public.contacts (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  kind          text not null check (kind in ('phone','whatsapp','email','website','facebook','instagram','tiktok','other')),
  value         text not null,
  authorized_by uuid references public.profiles(id),
  authorized_at timestamptz,
  is_public     boolean not null default false,
  constraint public_needs_authorization check (not is_public or authorized_at is not null)
);

-- Medios con licencia/permiso
create table public.media_assets (
  id             uuid primary key default gen_random_uuid(),
  storage_path   text not null unique,
  kind           text not null check (kind in ('image','video','audio')),
  alt_text       jsonb not null default '{}'::jsonb,
  credit         text not null,
  license        text not null,               -- 'owner-granted', 'CC-BY-4.0', ...
  permission_ref text,                         -- referencia a permiso escrito si aplica
  uploaded_by    uuid references public.profiles(id),
  business_id    uuid references public.businesses(id) on delete cascade,
  destination_id uuid references public.destinations(id) on delete cascade,
  moderation     text not null default 'pending' check (moderation in ('pending','approved','rejected')),
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Vistas públicas: ubicación según precisión
-- ---------------------------------------------------------------------------
create or replace function app.public_point(p geometry, p_precision public.location_precision)
returns geometry
language sql
immutable
as $$
  select case p_precision
    when 'exact' then p
    -- ~1 km de redondeo (0.01°) para ubicaciones aproximadas
    when 'approximate' then ST_SnapToGrid(p, 0.01)
    else null
  end;
$$;

create view public.public_destinations as
  select d.id, d.slug, d.name, d.department_id, d.municipality_id, d.summary,
         d.description_md, app.public_point(d.location, d.location_precision) as location,
         d.location_precision, d.access_notes, d.safety_notes, d.environmental_notes,
         d.accessibility, d.source_id, d.verification, d.verified_at, d.updated_at
  from public.destinations d
  where d.editorial = 'published' and d.archived_at is null;

create view public.public_businesses as
  select b.id, b.slug, b.name, b.department_id, b.municipality_id, b.destination_id,
         b.summary, b.description_md,
         app.public_point(b.location, b.location_precision) as location,
         b.location_precision, b.listing_tier, b.verified_scope, b.verified_at,
         b.is_sponsored, b.updated_at
  from public.businesses b
  where b.editorial = 'published' and b.archived_at is null;

grant select on public.public_destinations, public.public_businesses to anon, authenticated;
grant execute on function app.public_point(geometry, public.location_precision) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.destination_categories     enable row level security;
alter table public.destinations               enable row level security;
alter table public.destination_category_links enable row level security;
alter table public.businesses                 enable row level security;
alter table public.business_categories        enable row level security;
alter table public.business_claims            enable row level security;
alter table public.opening_hours              enable row level security;
alter table public.price_observations         enable row level security;
alter table public.contacts                   enable row level security;
alter table public.media_assets               enable row level security;

create policy categories_public on public.destination_categories
  for select to anon, authenticated using (true);
create policy dcl_public on public.destination_category_links
  for select to anon, authenticated using (true);
create policy bc_public on public.business_categories
  for select to anon, authenticated using (true);

-- Tablas base de destinos y negocios: sin lectura anónima directa
-- (la ubicación exacta solo sale por las vistas públicas).
create policy destinations_staff on public.destinations
  for select to authenticated using (app.has_permission('content.edit'));

create policy businesses_owner_select on public.businesses
  for select to authenticated
  using (organization_id is not null and app.is_org_member(organization_id));
create policy businesses_owner_update on public.businesses
  for update to authenticated
  using (organization_id is not null
         and app.is_org_member(organization_id, array['owner','manager','editor']::public.membership_role[]))
  with check (organization_id is not null
         and app.is_org_member(organization_id, array['owner','manager','editor']::public.membership_role[]));
create policy businesses_staff on public.businesses
  for select to authenticated using (app.has_permission('businesses.review'));
-- Nota: el cambio de listing_tier, verified_scope, is_sponsored y editorial lo bloquea
-- el trigger app.guard_business_columns para no-staff.

create or replace function app.guard_business_columns()
returns trigger
language plpgsql
-- SIN security definer: necesitamos current_user = rol real de la petición.
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') and not app.has_permission('businesses.review') then
    if new.listing_tier   is distinct from old.listing_tier
    or new.verified_scope is distinct from old.verified_scope
    or new.verified_at    is distinct from old.verified_at
    or new.is_sponsored   is distinct from old.is_sponsored
    or new.editorial      is distinct from old.editorial
    or new.organization_id is distinct from old.organization_id then
      raise exception 'Campo protegido: requiere revisión del equipo' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger businesses_guard before update on public.businesses
  for each row execute function app.guard_business_columns();

create policy claims_own on public.business_claims
  for select to authenticated using (claimant_id = app.current_profile_id());
create policy claims_insert on public.business_claims
  for insert to authenticated
  with check (claimant_id = app.current_profile_id() and state = 'submitted');
create policy claims_staff on public.business_claims
  for select to authenticated using (app.has_permission('businesses.review'));

create policy hours_public on public.opening_hours
  for select to anon, authenticated using (
    exists (select 1 from public.businesses b where b.id = business_id and b.editorial = 'published')
    or exists (select 1 from public.destinations d where d.id = destination_id and d.editorial = 'published'));
create policy prices_public on public.price_observations
  for select to anon, authenticated using (
    exists (select 1 from public.businesses b where b.id = business_id and b.editorial = 'published')
    or exists (select 1 from public.destinations d where d.id = destination_id and d.editorial = 'published'));
create policy contacts_public on public.contacts
  for select to anon, authenticated using (
    is_public and exists (select 1 from public.businesses b where b.id = business_id and b.editorial = 'published'));
create policy contacts_owner on public.contacts
  for all to authenticated
  using (exists (select 1 from public.businesses b
                 where b.id = business_id and b.organization_id is not null
                   and app.is_org_member(b.organization_id, array['owner','manager']::public.membership_role[])))
  with check (exists (select 1 from public.businesses b
                 where b.id = business_id and b.organization_id is not null
                   and app.is_org_member(b.organization_id, array['owner','manager']::public.membership_role[])));
create policy media_public on public.media_assets
  for select to anon, authenticated using (moderation = 'approved');

-- Barrera de emisor en tablas con escritura de usuarios
do $$
declare t text;
begin
  foreach t in array array['businesses','business_claims','contacts','media_assets']
  loop
    execute format(
      'create policy trusted_issuer on public.%I as restrictive to authenticated using (app.is_trusted_jwt())', t);
  end loop;
end $$;
