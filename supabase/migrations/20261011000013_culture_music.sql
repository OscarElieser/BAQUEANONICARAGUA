-- 0013 · Biblioteca cultural e histórica (sección 16) y biblioteca musical (sección 17)
-- Reglas: derechos de autor, conocimientos tradicionales con consentimiento comunitario,
-- revisión editorial reforzada en temas sensibles, música solo con licencia o reproductor oficial.

create table public.media_licenses (
  id              uuid primary key default gen_random_uuid(),
  license         text not null,                 -- 'CC-BY-4.0', 'permiso-escrito', 'dominio-publico'…
  holder          text not null,                 -- titular de derechos
  permission_ref  text,                          -- referencia al documento de permiso
  allows_hosting  boolean not null default false, -- puede alojarse en nuestro Storage
  allows_commercial boolean not null default false,
  expires_on      date,
  notes           text,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  constraint written_permission_needs_ref check (license <> 'permiso-escrito' or permission_ref is not null)
);

create type public.heritage_kind as enum
  ('site','building','craft','dance','music','cuisine','costume','language','oral_tradition','festivity','literature','visual_art','other');

create table public.heritage_items (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title              text not null,
  kind               public.heritage_kind not null,
  tangible           boolean not null,
  department_id      smallint references public.departments(id),
  summary            text,
  body_md            text,
  locale             text not null default 'es',
  unesco_recognized  boolean not null default false,
  -- Conocimiento tradicional o relato de una comunidad: requiere consentimiento documentado
  community_knowledge boolean not null default false,
  community_consent_ref text,
  sensitive_topic    boolean not null default false,  -- tema histórico sensible o con interpretaciones
  second_reviewer    uuid references public.profiles(id),
  source_ids         uuid[] not null default '{}',
  editorial          public.editorial_status not null default 'draft',
  verified_at        timestamptz,
  updated_at         timestamptz not null default now(),
  constraint community_needs_consent check (not community_knowledge or community_consent_ref is not null),
  constraint published_needs_source check (editorial <> 'published' or cardinality(source_ids) > 0),
  constraint sensitive_needs_second_review check (not (sensitive_topic and editorial = 'published') or second_reviewer is not null)
);
create trigger heritage_touch before update on public.heritage_items for each row execute function app.touch_updated_at();

create type public.history_era as enum ('prehispanic','colonial','republican','contemporary');

create table public.historical_events (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  era            public.history_era not null,
  start_year     int not null check (start_year between -10000 and 2100),
  end_year       int check (end_year is null or end_year >= start_year),
  date_precision text not null default 'year' check (date_precision in ('day','month','year','decade','century','approximate')),
  department_id  smallint references public.departments(id),
  summary        text,
  body_md        text,
  locale         text not null default 'es',
  contested      boolean not null default false,      -- hay interpretaciones distintas: se presentan
  perspectives_md text,                                -- obligatorio si contested al publicar
  second_reviewer uuid references public.profiles(id),
  source_ids     uuid[] not null default '{}',
  editorial      public.editorial_status not null default 'draft',
  constraint published_needs_source check (editorial <> 'published' or cardinality(source_ids) > 0),
  constraint contested_needs_perspectives check (not (contested and editorial = 'published') or (perspectives_md is not null and second_reviewer is not null))
);
create index historical_events_timeline on public.historical_events(start_year) where editorial = 'published';

create table public.artists (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name            text not null,
  kind            text not null check (kind in ('person','group','ensemble')),
  genres          text[] not null default '{}',     -- 'son nica', 'marimba', 'palo de mayo'…
  instruments     text[] not null default '{}',
  department_id   smallint references public.departments(id),
  bio_md          text,
  living          boolean,
  managed_by      uuid references public.organizations(id), -- el artista o su representante reclama la ficha
  source_ids      uuid[] not null default '{}',
  editorial       public.editorial_status not null default 'draft',
  updated_at      timestamptz not null default now(),
  constraint published_needs_source check (editorial <> 'published' or cardinality(source_ids) > 0)
);
create trigger artists_touch before update on public.artists for each row execute function app.touch_updated_at();

create table public.artist_contacts (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references public.artists(id) on delete cascade,
  kind          text not null check (kind in ('website','email','phone','instagram','facebook','youtube','spotify','bandcamp','other')),
  value         text not null,
  authorized_at timestamptz,                         -- publicado solo con autorización
  constraint must_be_authorized check (authorized_at is not null)
);

create table public.music_works (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references public.artists(id) on delete cascade,
  title         text not null,
  year          int check (year between 1500 and 2100),
  genre         text,
  -- Reproductor oficial de terceros (sin alojar audio)
  embed_url     text,
  -- Audio alojado en nuestro Storage: solo con licencia que lo permita
  hosted_path   text,
  license_id    uuid references public.media_licenses(id),
  editorial     public.editorial_status not null default 'draft',
  created_at    timestamptz not null default now(),
  constraint has_playable_or_none check (not (embed_url is not null and hosted_path is not null)),
  constraint embed_from_official_players check (
    embed_url is null or embed_url ~ '^https://(www\.)?(youtube\.com/embed/|youtube-nocookie\.com/embed/|open\.spotify\.com/embed/|w\.soundcloud\.com/player/|bandcamp\.com/EmbeddedPlayer/|archive\.org/embed/)'),
  constraint hosted_needs_license check (hosted_path is null or license_id is not null)
);

-- Un audio alojado exige que la licencia permita alojar y no esté vencida
create or replace function app.guard_hosted_music()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.hosted_path is not null and not exists (
    select 1 from public.media_licenses l
    where l.id = new.license_id and l.allows_hosting and (l.expires_on is null or l.expires_on >= current_date)) then
    raise exception 'La licencia no permite alojar este audio' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger music_hosting_guard before insert or update on public.music_works
  for each row execute function app.guard_hosted_music();

create table public.community_stories (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  body_md          text not null,
  community_name   text not null,
  department_id    smallint references public.departments(id),
  teller_name      text,                           -- puede ser anónimo si así se pidió
  teller_consent_at timestamptz not null,          -- consentimiento de quien relata
  community_consent_ref text,                      -- consentimiento colectivo cuando aplica
  locale           text not null default 'es',
  submitted_by     uuid references public.profiles(id),
  editorial        public.editorial_status not null default 'draft',
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.media_licenses     enable row level security;
alter table public.heritage_items     enable row level security;
alter table public.historical_events  enable row level security;
alter table public.artists            enable row level security;
alter table public.artist_contacts    enable row level security;
alter table public.music_works        enable row level security;
alter table public.community_stories  enable row level security;

create policy heritage_public on public.heritage_items for select to anon, authenticated using (editorial = 'published');
create policy history_public  on public.historical_events for select to anon, authenticated using (editorial = 'published');
create policy artists_public  on public.artists for select to anon, authenticated using (editorial = 'published');
create policy artist_contacts_public on public.artist_contacts for select to anon, authenticated
  using (exists (select 1 from public.artists a where a.id = artist_id and a.editorial = 'published'));
create policy music_public on public.music_works for select to anon, authenticated
  using (editorial = 'published' and exists (select 1 from public.artists a where a.id = artist_id and a.editorial = 'published'));
create policy stories_public on public.community_stories for select to anon, authenticated using (editorial = 'published');
create policy stories_own on public.community_stories for select to authenticated using (submitted_by = app.current_profile_id());
create policy stories_submit on public.community_stories for insert to authenticated
  with check (submitted_by = app.current_profile_id() and editorial = 'draft');

-- Equipo editorial
do $$
declare t text;
begin
  foreach t in array array['media_licenses','heritage_items','historical_events','artists','artist_contacts','music_works','community_stories'] loop
    execute format('create policy %I on public.%I for select to authenticated using (app.has_permission(''content.edit''))', t || '_staff', t);
    execute format('create policy trusted_issuer on public.%I as restrictive to authenticated using (app.is_trusted_jwt())', t);
  end loop;
end $$;

-- Línea de tiempo pública
create or replace function public.history_timeline(p_department smallint default null, p_era public.history_era default null)
returns table (id uuid, title text, era public.history_era, start_year int, end_year int, date_precision text,
               summary text, contested boolean, department_id smallint)
language sql stable security definer set search_path = '' as $$
  select e.id, e.title, e.era, e.start_year, e.end_year, e.date_precision, e.summary, e.contested, e.department_id
  from public.historical_events e
  where e.editorial = 'published'
    and (p_department is null or e.department_id = p_department)
    and (p_era is null or e.era = p_era)
  order by e.start_year, e.end_year nulls first;
$$;
grant execute on function public.history_timeline(smallint, public.history_era) to anon, authenticated;
