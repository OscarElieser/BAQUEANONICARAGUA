-- 0002 · Territorio y fuentes de datos

create type public.verification_status as enum ('unverified','community_reported','verified','outdated','disputed');
create type public.editorial_status as enum ('draft','in_review','published','hidden','archived');
create type public.location_precision as enum ('exact','approximate','restricted');

-- Fuentes: toda información publicable apunta a una fuente.
create table public.data_sources (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  publisher          text not null,                 -- organismo o autor
  url                text check (url ~* '^https?://'),
  published_at       date,
  accessed_at        date not null,
  license            text not null default 'unknown', -- p. ej. 'CC-BY-4.0', 'permiso-escrito', 'unknown'
  reuse_allowed      boolean not null default false,
  confidence         smallint not null default 2 check (confidence between 1 and 5),
  review_state       public.editorial_status not null default 'draft',
  responsible_editor uuid references public.profiles(id),
  available          boolean not null default true,
  notes              text,
  created_at         timestamptz not null default now()
);

create type public.territory_kind as enum ('department','autonomous_region');

create table public.departments (
  id           smallint primary key,
  iso_code     text not null unique check (iso_code ~ '^NI-[A-Z]{2}$'),
  slug         text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name         text not null unique,
  kind         public.territory_kind not null,
  capital_name text,                               -- se completa con fuente
  boundary     geometry(MultiPolygon, 4326),       -- se importa desde fuente con licencia
  source_id    uuid references public.data_sources(id),
  editorial    public.editorial_status not null default 'draft',
  updated_at   timestamptz not null default now()
);
create index departments_boundary_gix on public.departments using gist (boundary);

create table public.municipalities (
  id            uuid primary key default gen_random_uuid(),
  department_id smallint not null references public.departments(id),
  official_code text unique,                       -- código oficial si la fuente lo provee
  slug          text not null check (slug ~ '^[a-z0-9-]+$'),
  name          text not null,
  boundary      geometry(MultiPolygon, 4326),
  centroid      geometry(Point, 4326),
  source_id     uuid not null references public.data_sources(id),
  editorial     public.editorial_status not null default 'draft',
  updated_at    timestamptz not null default now(),
  unique (department_id, slug)
);
create index municipalities_boundary_gix on public.municipalities using gist (boundary);

create table public.localities (
  id              uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id),
  name            text not null,
  kind            text not null default 'community'
                  check (kind in ('city','town','community','comarca','island','other')),
  point           geometry(Point, 4326),
  precision       public.location_precision not null default 'approximate',
  source_id       uuid references public.data_sources(id),
  editorial       public.editorial_status not null default 'draft',
  updated_at      timestamptz not null default now()
);
create index localities_point_gix on public.localities using gist (point);

-- Contenido editorial por territorio y sección (historia, cultura, gastronomía…),
-- localizado. Permite editar desde Ops Center sin tocar páginas.
create table public.territory_sections (
  id             uuid primary key default gen_random_uuid(),
  department_id  smallint not null references public.departments(id),
  section        text not null check (section in (
                   'overview','geography','history','culture','gastronomy','peoples',
                   'nature','heritage','festivities','climate','transport','routes','community')),
  locale         text not null default 'es',
  title          text not null,
  body_md        text not null,
  machine_translated boolean not null default false,
  source_ids     uuid[] not null default '{}',
  editorial      public.editorial_status not null default 'draft',
  verified_at    timestamptz,
  updated_by     uuid references public.profiles(id),
  updated_at     timestamptz not null default now(),
  unique (department_id, section, locale)
);

alter table public.data_sources       enable row level security;
alter table public.departments        enable row level security;
alter table public.municipalities     enable row level security;
alter table public.localities         enable row level security;
alter table public.territory_sections enable row level security;

-- Lectura pública solo de lo publicado.
create policy sources_public on public.data_sources
  for select to anon, authenticated using (review_state = 'published');
create policy departments_public on public.departments
  for select to anon, authenticated using (editorial = 'published');
create policy municipalities_public on public.municipalities
  for select to anon, authenticated using (editorial = 'published');
create policy localities_public on public.localities
  for select to anon, authenticated
  using (editorial = 'published' and precision <> 'restricted');
create policy sections_public on public.territory_sections
  for select to anon, authenticated using (editorial = 'published');

-- Lectura editorial completa para personal con permiso.
create policy sources_staff on public.data_sources
  for select to authenticated using (app.has_permission('content.edit'));
create policy departments_staff on public.departments
  for select to authenticated using (app.has_permission('content.edit'));
create policy municipalities_staff on public.municipalities
  for select to authenticated using (app.has_permission('content.edit'));
create policy localities_staff on public.localities
  for select to authenticated using (app.has_permission('content.edit'));
create policy sections_staff on public.territory_sections
  for select to authenticated using (app.has_permission('content.edit'));
-- Escrituras: API con content.edit / content.publish y revisión en content_revisions.
