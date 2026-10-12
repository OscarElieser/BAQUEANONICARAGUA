-- Medición de navegación con consentimiento y sin datos personales.
-- Solo se registra si la persona aceptó la medición en el aviso de cookies.
-- No se guarda usuario, correo, IP ni parámetros de la dirección: solo la ruta, el idioma,
-- la plataforma, el sitio de procedencia y un código al azar que dura lo que la pestaña.

create schema if not exists analytics; -- Esquema propio, no expuesto por la Data API
revoke all on schema analytics from public, anon, authenticated; -- Nadie entra directamente

create table analytics.navigation_events (
  id            bigint generated always as identity primary key, -- Número interno del evento
  occurred_at   timestamptz not null default now(), -- Momento de la visita a la página
  visit_id      uuid not null, -- Código al azar de la pestaña (no identifica a la persona)
  path          text not null check (path ~ '^/[A-Za-z0-9/_-]{0,200}$'), -- Ruta limpia, sin parámetros
  locale        text not null check (locale in ('es','en','zh-Hans','ko','it','fr','pt','de','ru','ja')), -- Idioma de la página
  referrer_host text check (referrer_host ~ '^[a-z0-9.-]{1,253}$'), -- Solo el dominio de procedencia (o nada)
  platform      text not null check (platform in ('web','android')) -- Desde dónde se navegó
);
create index navigation_events_time_idx on analytics.navigation_events (occurred_at); -- Consultas por fecha y limpieza
create index navigation_events_visit_idx on analytics.navigation_events (visit_id, occurred_at); -- Límite por visita

alter table analytics.navigation_events enable row level security; -- Sin políticas: nadie la lee por la API
revoke all on analytics.navigation_events from public, anon, authenticated; -- Solo las funciones de abajo la tocan

-- Registra una página vista. Lo llaman la web y Android solo con consentimiento.
create or replace function public.track_navigation(
  p_visit uuid, -- Código al azar de la pestaña
  p_path text, -- Ruta visitada
  p_locale text, -- Idioma
  p_referrer_host text default null, -- Dominio de procedencia (opcional)
  p_platform text default 'web' -- Plataforma
)
returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_visit is null or p_path is null or p_path !~ '^/[A-Za-z0-9/_-]{0,200}$' then -- Ruta con caracteres no permitidos o vacía
    raise exception 'Ruta no válida' using errcode = '22023'; -- Error de parámetro
  end if;
  if (select count(*) from analytics.navigation_events -- Cuenta las páginas de esta visita en el último día
      where visit_id = p_visit and occurred_at > now() - interval '1 day') >= 500 then
    raise exception 'Demasiados eventos para esta visita' using errcode = '54000'; -- Evita que alguien llene la tabla
  end if;
  insert into analytics.navigation_events (visit_id, path, locale, referrer_host, platform) -- Guarda el evento
  values (p_visit, p_path, p_locale, nullif(lower(p_referrer_host), ''), p_platform); -- Dominio en minúsculas o nada
end;
$$;
revoke execute on function public.track_navigation(uuid, text, text, text, text) from public; -- Quita el permiso por defecto
grant execute on function public.track_navigation(uuid, text, text, text, text) to anon, authenticated; -- Cualquiera puede registrar con consentimiento

-- Permiso para ver el resumen de navegación en el Ops Center
insert into public.permissions (key, description) values
  ('analytics.read', 'Ver el resumen anónimo de navegación'); -- Nuevo permiso
insert into public.role_permissions (role_key, permission_key) values
  ('superadmin', 'analytics.read'), -- Superadmin
  ('admin', 'analytics.read'), -- Administración
  ('auditor', 'analytics.read'); -- Auditoría (solo lectura)

-- Resumen para el Ops Center. Oculta lo que tenga menos de 5 visitas para que nadie pueda aislar a una persona.
create or replace function public.ops_navigation_summary(p_days int default 30)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_since timestamptz; -- Inicio del periodo consultado
begin
  perform app.require('analytics.read'); -- Comprueba el permiso
  if p_days is null or p_days < 1 or p_days > 90 then -- Periodo fuera de rango (solo se guardan 90 días)
    raise exception 'El periodo debe estar entre 1 y 90 días' using errcode = '22023'; -- Error de parámetro
  end if;
  v_since := now() - make_interval(days => p_days); -- Fecha de inicio
  return jsonb_build_object(
    'days', p_days, -- Periodo consultado
    'min_visits_shown', 5, -- Umbral de anonimato
    'page_views', (select count(*) from analytics.navigation_events where occurred_at >= v_since), -- Páginas vistas
    'visits', (select count(distinct visit_id) from analytics.navigation_events where occurred_at >= v_since), -- Visitas distintas
    'top_paths', coalesce((select jsonb_agg(t order by t.views desc) from ( -- Rutas más vistas
      select path, count(*) as views, count(distinct visit_id) as visits -- Vistas y visitas por ruta
      from analytics.navigation_events where occurred_at >= v_since
      group by path having count(distinct visit_id) >= 5 -- Solo rutas con al menos 5 visitas
      order by views desc limit 20) t), '[]'::jsonb), -- Las 20 principales
    'by_locale', coalesce((select jsonb_object_agg(locale, visits) from ( -- Visitas por idioma
      select locale, count(distinct visit_id) as visits
      from analytics.navigation_events where occurred_at >= v_since
      group by locale having count(distinct visit_id) >= 5) l), '{}'::jsonb), -- Con umbral de anonimato
    'by_platform', coalesce((select jsonb_object_agg(platform, visits) from ( -- Visitas por plataforma
      select platform, count(distinct visit_id) as visits
      from analytics.navigation_events where occurred_at >= v_since
      group by platform having count(distinct visit_id) >= 5) p), '{}'::jsonb), -- Con umbral de anonimato
    'top_referrers', coalesce((select jsonb_agg(r order by r.visits desc) from ( -- Sitios de procedencia
      select referrer_host as host, count(distinct visit_id) as visits
      from analytics.navigation_events where occurred_at >= v_since and referrer_host is not null
      group by referrer_host having count(distinct visit_id) >= 5 -- Con umbral de anonimato
      order by visits desc limit 10) r), '[]'::jsonb) -- Los 10 principales
  );
end;
$$;
revoke execute on function public.ops_navigation_summary(int) from public, anon; -- Nunca para visitantes
grant execute on function public.ops_navigation_summary(int) to authenticated; -- El permiso se comprueba dentro

-- Limpieza: los eventos se borran a los 90 días (lo dice el aviso de cookies).
create or replace function analytics.purge_navigation_events()
returns bigint
language sql volatile security definer set search_path = '' as $$
  with borrados as ( -- Eventos vencidos
    delete from analytics.navigation_events where occurred_at < now() - interval '90 days' returning 1
  )
  select count(*) from borrados; -- Devuelve cuántos se borraron
$$;
revoke execute on function analytics.purge_navigation_events() from public, anon, authenticated; -- Solo el sistema la ejecuta

-- Si la base tiene pg_cron (Supabase lo ofrece), la limpieza se programa cada día a las 3:15 UTC.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then -- Solo si la extensión está activa
    perform cron.schedule('purgar-navegacion', '15 3 * * *', 'select analytics.purge_navigation_events()'); -- Tarea diaria
  end if;
end $$;
