-- 0010 · Puntos para el mapa público (lat/lng ya difuminados según la precisión declarada)

create or replace function public.map_points(p_department smallint default null)
returns table (
  kind text, id uuid, slug text, name text,
  lat double precision, lng double precision,
  location_precision public.location_precision,
  listing_tier public.listing_tier
)
language sql stable security definer set search_path = '' as $$
  select 'destination', d.id, d.slug, d.name,
         extensions.ST_Y(d.location), extensions.ST_X(d.location), d.location_precision, null::public.listing_tier
  from public.public_destinations d
  where d.location is not null and (p_department is null or d.department_id = p_department)
  union all
  select 'business', b.id, b.slug, b.name,
         extensions.ST_Y(b.location), extensions.ST_X(b.location), b.location_precision, b.listing_tier
  from public.public_businesses b
  where b.location is not null and not b.is_sponsored and (p_department is null or b.department_id = p_department)
  limit 2000;
$$;
grant execute on function public.map_points(smallint) to anon, authenticated;
