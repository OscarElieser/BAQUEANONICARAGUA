-- 0005 · Viajes, itinerarios y favoritos (secciones 8, 10 y escenario Android↔PWA)
-- Principio: ningún tiempo de traslado ni costo sin origen declarado.

create type public.trip_visibility as enum ('private','link','public');
create type public.trip_member_role as enum ('owner','editor','viewer');

create table public.trips (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 120),
  starts_on     date,
  ends_on       date,
  travelers     smallint check (travelers between 1 and 60),
  budget_amount numeric(12,2) check (budget_amount >= 0),
  budget_currency char(3) check (budget_currency in ('NIO','USD')),
  pace          text check (pace in ('relaxed','moderate','intense')),
  interests     text[] not null default '{}',
  visibility    public.trip_visibility not null default 'private',
  share_token   text unique,                         -- para visibilidad 'link' y QR
  created_via   text not null default 'manual' check (created_via in ('manual','assistant')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint dates_ordered check (ends_on is null or starts_on is null or ends_on >= starts_on),
  constraint budget_has_currency check ((budget_amount is null) = (budget_currency is null)),
  constraint link_needs_token check (visibility <> 'link' or share_token is not null)
);
create index trips_owner_idx on public.trips(owner_id, updated_at desc);
create trigger trips_touch before update on public.trips
  for each row execute function app.touch_updated_at();

create table public.trip_members (
  trip_id    uuid not null references public.trips(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role       public.trip_member_role not null default 'viewer',
  added_at   timestamptz not null default now(),
  primary key (trip_id, profile_id)
);
create index trip_members_profile_idx on public.trip_members(profile_id);

-- Funciones de acceso (security definer: evitan recursión de RLS entre trips y trip_members)
create or replace function app.can_view_trip(p_trip uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.trips t
    where t.id = p_trip
      and (t.owner_id = app.current_profile_id()
           or t.visibility = 'public'
           or exists (select 1 from public.trip_members m
                      where m.trip_id = t.id and m.profile_id = app.current_profile_id()))
  );
$$;

create or replace function app.can_edit_trip(p_trip uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.trips t
    where t.id = p_trip
      and (t.owner_id = app.current_profile_id()
           or exists (select 1 from public.trip_members m
                      where m.trip_id = t.id and m.profile_id = app.current_profile_id()
                        and m.role in ('owner','editor')))
  );
$$;
grant execute on function app.can_view_trip(uuid), app.can_edit_trip(uuid) to authenticated, anon;

-- Itinerario versionado: cada recálculo crea una versión nueva (auditable)
create table public.itineraries (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  version     int not null default 1,
  is_current  boolean not null default true,
  generated_by text not null default 'user' check (generated_by in ('user','assistant')),
  feasibility jsonb not null default '{}'::jsonb,   -- advertencias de inviabilidad detectadas
  change_summary text,
  created_at  timestamptz not null default now(),
  unique (trip_id, version)
);
create unique index one_current_itinerary on public.itineraries(trip_id) where is_current;

create table public.itinerary_days (
  id            uuid primary key default gen_random_uuid(),
  itinerary_id  uuid not null references public.itineraries(id) on delete cascade,
  day_number    smallint not null check (day_number between 1 and 60),
  date          date,
  title         text,
  notes         text,
  unique (itinerary_id, day_number)
);

create table public.itinerary_stops (
  id               uuid primary key default gen_random_uuid(),
  day_id           uuid not null references public.itinerary_days(id) on delete cascade,
  position         smallint not null,
  destination_id   uuid references public.destinations(id),
  business_id      uuid references public.businesses(id),
  custom_label     text,                             -- parada libre del usuario
  planned_start    time,
  planned_end      time,
  transport_mode   text check (transport_mode in ('walk','car','bus','boat','taxi','bike','plane','other')),
  travel_minutes   int check (travel_minutes >= 0),
  travel_km        numeric(8,2) check (travel_km >= 0),
  -- Origen del tiempo de traslado: obligatorio si hay tiempo
  travel_source    text check (travel_source in ('routing_provider','verified_data','user_entered')),
  travel_computed_at timestamptz,
  notes            text,
  unique (day_id, position),
  constraint stop_has_target check (num_nonnulls(destination_id, business_id, custom_label) = 1),
  constraint travel_needs_source check (travel_minutes is null or travel_source is not null)
);

create type public.cost_basis as enum ('verified_price','owner_reported','estimate','quote_needed');

create table public.itinerary_costs (
  id               uuid primary key default gen_random_uuid(),
  itinerary_id     uuid not null references public.itineraries(id) on delete cascade,
  stop_id          uuid references public.itinerary_stops(id) on delete cascade,
  label            text not null,
  amount           numeric(12,2) check (amount >= 0),
  currency         char(3) check (currency in ('NIO','USD')),
  per              text check (per in ('person','group','night','vehicle')),
  basis            public.cost_basis not null,
  price_observation_id uuid references public.price_observations(id),
  estimate_method  text,                              -- obligatorio si basis = estimate
  -- Un "precio verificado" debe apuntar a una observación con fecha y fuente
  constraint verified_needs_observation check (basis <> 'verified_price' or price_observation_id is not null),
  constraint estimate_needs_method check (basis <> 'estimate' or estimate_method is not null),
  constraint quote_has_no_amount check (basis <> 'quote_needed' or amount is null),
  constraint amount_has_currency check ((amount is null) = (currency is null))
);

-- Favoritos (escenario: mismos favoritos en PWA y Android)
create table public.favorites (
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  destination_id uuid references public.destinations(id) on delete cascade,
  business_id    uuid references public.businesses(id) on delete cascade,
  created_at     timestamptz not null default now(),
  constraint one_target check (num_nonnulls(destination_id, business_id) = 1)
);
create unique index favorites_dest_uq on public.favorites(profile_id, destination_id) where destination_id is not null;
create unique index favorites_biz_uq on public.favorites(profile_id, business_id) where business_id is not null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.trips           enable row level security;
alter table public.trip_members    enable row level security;
alter table public.itineraries     enable row level security;
alter table public.itinerary_days  enable row level security;
alter table public.itinerary_stops enable row level security;
alter table public.itinerary_costs enable row level security;
alter table public.favorites       enable row level security;

create policy trips_select on public.trips for select to authenticated
  using (app.can_view_trip(id));
create policy trips_public_anon on public.trips for select to anon
  using (visibility = 'public');
create policy trips_insert on public.trips for insert to authenticated
  with check (owner_id = app.current_profile_id());
create policy trips_update on public.trips for update to authenticated
  using (app.can_edit_trip(id)) with check (app.can_edit_trip(id));
create policy trips_delete on public.trips for delete to authenticated
  using (owner_id = app.current_profile_id());
-- Acceso por enlace (share_token) se resuelve en la API, que valida el token.

create policy members_select on public.trip_members for select to authenticated
  using (app.can_view_trip(trip_id));
create policy members_manage on public.trip_members for all to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = app.current_profile_id()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = app.current_profile_id()));

create policy itin_select on public.itineraries for select to authenticated using (app.can_view_trip(trip_id));
create policy itin_write  on public.itineraries for all to authenticated
  using (app.can_edit_trip(trip_id)) with check (app.can_edit_trip(trip_id));

create policy days_select on public.itinerary_days for select to authenticated
  using (exists (select 1 from public.itineraries i where i.id = itinerary_id and app.can_view_trip(i.trip_id)));
create policy days_write on public.itinerary_days for all to authenticated
  using (exists (select 1 from public.itineraries i where i.id = itinerary_id and app.can_edit_trip(i.trip_id)))
  with check (exists (select 1 from public.itineraries i where i.id = itinerary_id and app.can_edit_trip(i.trip_id)));

create policy stops_select on public.itinerary_stops for select to authenticated
  using (exists (select 1 from public.itinerary_days d join public.itineraries i on i.id = d.itinerary_id
                 where d.id = day_id and app.can_view_trip(i.trip_id)));
create policy stops_write on public.itinerary_stops for all to authenticated
  using (exists (select 1 from public.itinerary_days d join public.itineraries i on i.id = d.itinerary_id
                 where d.id = day_id and app.can_edit_trip(i.trip_id)))
  with check (exists (select 1 from public.itinerary_days d join public.itineraries i on i.id = d.itinerary_id
                 where d.id = day_id and app.can_edit_trip(i.trip_id)));

create policy costs_select on public.itinerary_costs for select to authenticated
  using (exists (select 1 from public.itineraries i where i.id = itinerary_id and app.can_view_trip(i.trip_id)));
create policy costs_write on public.itinerary_costs for all to authenticated
  using (exists (select 1 from public.itineraries i where i.id = itinerary_id and app.can_edit_trip(i.trip_id)))
  with check (exists (select 1 from public.itineraries i where i.id = itinerary_id and app.can_edit_trip(i.trip_id)));

create policy fav_own on public.favorites for all to authenticated
  using (profile_id = app.current_profile_id())
  with check (profile_id = app.current_profile_id());

do $$
declare t text;
begin
  foreach t in array array['trips','trip_members','itineraries','itinerary_days',
                           'itinerary_stops','itinerary_costs','favorites']
  loop
    execute format(
      'create policy trusted_issuer on public.%I as restrictive to authenticated using (app.is_trusted_jwt())', t);
  end loop;
end $$;
