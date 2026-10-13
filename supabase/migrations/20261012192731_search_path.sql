-- Copia de 20261012000016_search_path.sql: en producción esta misma migración quedó registrada dos veces (también con la versión 20261012192731).
-- El archivo existe para que el historial del repositorio y el de producción coincidan. Repetirla no cambia nada (solo fija search_path).

-- Endurecimiento pedido por el asesor de seguridad de Supabase (lint 0011 "function_search_path_mutable"):
-- cada función fija su search_path para que nadie pueda colar un objeto con el mismo nombre en otro esquema
-- y hacer que la función lo use. No cambia lo que hace ninguna función.

alter function app.touch_updated_at() set search_path = pg_catalog, public, app, pg_temp; -- Marca de última edición
alter function app.current_firebase_uid() set search_path = pg_catalog, public, app, pg_temp; -- UID de Firebase del token
alter function app.public_point(extensions.geometry, public.location_precision) set search_path = pg_catalog, public, extensions, app, pg_temp; -- Redondeo de ubicación (usa PostGIS en extensions)
alter function app.slugify(text) set search_path = pg_catalog, public, extensions, app, pg_temp; -- Direcciones legibles (puede usar unaccent en extensions)
alter function app.risk_for_categories(text[]) set search_path = pg_catalog, public, app, pg_temp; -- Riesgo según categorías
alter function app.incident_transition_allowed(public.incident_state, public.incident_state) set search_path = pg_catalog, public, app, pg_temp; -- Cambios de estado válidos de una denuncia
alter function audit.block_mutation() set search_path = pg_catalog, public, audit, pg_temp; -- El historial no se edita ni se borra
alter function public.my_profile_id() set search_path = pg_catalog, public, app, pg_temp; -- Perfil de quien tiene la sesión
