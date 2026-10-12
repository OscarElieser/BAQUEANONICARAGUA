-- Pruebas de humo de RLS. Ejecutar sobre una base local recién migrada (nunca en producción):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_smoke.sql
-- Todo ocurre dentro de una transacción que se revierte al final.
-- Simula peticiones de la Data API fijando `role` y `request.jwt.claims`, igual que Supabase.

begin;

-- En Supabase estos privilegios existen por defecto; se repiten por si la base es local.
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;

update app.settings set value = 'nica-test' where key = 'firebase_project_id';

insert into public.profiles (id, firebase_uid, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'fb_user_a',   'Usuaria A'),
  ('00000000-0000-0000-0000-00000000000b', 'fb_user_b',   'Usuario B'),
  ('00000000-0000-0000-0000-0000000000ad', 'fb_auditor',  'Auditora'),
  ('00000000-0000-0000-0000-0000000000e1', 'fb_owner',    'Emprendedora');

insert into public.user_roles (profile_id, role_key) values
  ('00000000-0000-0000-0000-0000000000ad', 'auditor'),
  ('00000000-0000-0000-0000-0000000000e1', 'entrepreneur');

insert into public.data_sources (id, title, publisher, accessed_at, review_state)
values ('00000000-0000-0000-0000-0000000005c0', 'Fuente de prueba', 'Equipo QA', current_date, 'published');

insert into public.organizations (id, kind, name, created_by)
values ('00000000-0000-0000-0000-0000000000f1', 'business', 'Comedor de prueba',
        '00000000-0000-0000-0000-0000000000e1');
insert into public.organization_memberships (organization_id, profile_id, role)
values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 'owner');

update public.departments set editorial = 'published' where id = 6;  -- solo Granada publicada

insert into public.businesses (id, organization_id, slug, name, department_id, listing_tier, editorial)
values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1',
        'comedor-prueba', 'Comedor de prueba', 6, 'claimed', 'published');

create temp table results (name text, ok boolean);
grant insert on results to anon, authenticated;

-- Utilidad para actuar como un usuario Firebase
create or replace function pg_temp.act_as(p_uid text, p_project text default 'nica-test')
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated',
    'iss', 'https://securetoken.google.com/' || p_project, 'aud', p_project)::text, true);
  execute 'set local role authenticated';
end $$;

-- 1. Anónimo: solo territorios publicados
set local role anon;
select set_config('request.jwt.claims', '{}', true);
insert into results select 'anon ve solo departamentos publicados', count(*) = 1 from public.departments;
insert into results select 'anon no lee tabla base de negocios', count(*) = 0 from public.businesses;
insert into results select 'anon ve negocio en vista pública', count(*) = 1 from public.public_businesses;
reset role;

-- 2. Usuario A no ve el perfil de B
select pg_temp.act_as('fb_user_a');
insert into results select 'A ve solo su propio perfil',
  count(*) = 1 and bool_and(firebase_uid = 'fb_user_a') from public.profiles;
reset role;

-- 3. Token de otro proyecto Firebase: sin identidad
select pg_temp.act_as('fb_user_a', 'proyecto-ajeno');
insert into results select 'JWT de proyecto ajeno no obtiene perfil', app.current_profile_id() is null;
insert into results select 'JWT de proyecto ajeno no lee perfiles', count(*) = 0 from public.profiles;
reset role;

-- 4. Auditor: lee auditoría, no edita contenido
select pg_temp.act_as('fb_auditor');
insert into results select 'auditor tiene audit.read', app.has_permission('audit.read');
insert into results select 'auditor no tiene content.publish', not app.has_permission('content.publish');
insert into results select 'auditor no tiene roles.manage', not app.has_permission('roles.manage');
reset role;

-- 5. Emprendedora edita su negocio pero no puede autoverificarse
select pg_temp.act_as('fb_owner');
update public.businesses set summary = 'Sopa de queso los domingos' where id = '00000000-0000-0000-0000-0000000000b1';
insert into results select 'propietaria edita descripción',
  (select summary from public.businesses where id = '00000000-0000-0000-0000-0000000000b1') = 'Sopa de queso los domingos';
do $$
begin
  begin
    update public.businesses set listing_tier = 'verified', verified_scope = '{identity}'
    where id = '00000000-0000-0000-0000-0000000000b1';
    insert into results values ('propietaria no puede autoverificarse', false);
  exception when insufficient_privilege then
    insert into results values ('propietaria no puede autoverificarse', true);
  end;
end $$;
reset role;

-- 6. Usuario B no puede editar negocio ajeno (0 filas afectadas)
select pg_temp.act_as('fb_user_b');
with u as (update public.businesses set summary = 'hack' where id = '00000000-0000-0000-0000-0000000000b1' returning 1)
insert into results select 'B no edita negocio ajeno', count(*) = 0 from u;
reset role;

-- 7. audit.logs es inmutable
insert into audit.logs (actor_kind, action) values ('system', 'test.event');
do $$
begin
  begin
    update audit.logs set action = 'tampered';
    insert into results values ('audit.logs no admite update', false);
  exception when others then
    insert into results values ('audit.logs no admite update', true);
  end;
end $$;

-- 8. Un sitio sensible no puede tener ubicación exacta
do $$
begin
  begin
    insert into public.destinations (slug, name, department_id, is_sensitive, location_precision)
    values ('sitio-sensible', 'Sitio sensible', 6, true, 'exact');
    insert into results values ('sitio sensible rechaza precisión exacta', false);
  exception when check_violation then
    insert into results values ('sitio sensible rechaza precisión exacta', true);
  end;
end $$;

select case when ok then 'PASS' else 'FAIL' end as status, name from results order by ok, name;
select count(*) filter (where not ok) as failures, count(*) as total from results;

rollback;
