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
grant insert, update, select on results to anon, authenticated;

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

-- ===========================================================================
-- Fase 0.2 · viajes, comunidad, mensajería, denuncias, IA
-- ===========================================================================
insert into public.profiles (id, firebase_uid, display_name) values
  ('00000000-0000-0000-0000-0000000000c1', 'fb_moderator', 'Moderador'),
  ('00000000-0000-0000-0000-0000000000c2', 'fb_admin',     'Admin');
insert into public.user_roles (profile_id, role_key) values
  ('00000000-0000-0000-0000-0000000000c1', 'moderator'),
  ('00000000-0000-0000-0000-0000000000c2', 'admin');

-- Datos como lo haría la API (service role / owner)
insert into public.trips (id, owner_id, title) values
  ('00000000-0000-0000-0000-0000000007a1', '00000000-0000-0000-0000-00000000000a', 'Viaje de A');
insert into public.conversations (id, business_id, created_by) values
  ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000a');
insert into public.conversation_members (conversation_id, profile_id) values
  ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-0000000000e1');

-- 9. Favoritos: A guarda, B no ve (escenario PWA ↔ Android usa la misma tabla)
select pg_temp.act_as('fb_user_a');
insert into public.favorites (profile_id, business_id)
  values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000b1');
insert into results select 'A guarda y ve su favorito', count(*) = 1 from public.favorites;
insert into results select 'A ve su viaje', count(*) = 1 from public.trips;
reset role;
select pg_temp.act_as('fb_user_b');
insert into results select 'B no ve favoritos de A', count(*) = 0 from public.favorites;
insert into results select 'B no ve viaje privado de A', count(*) = 0 from public.trips;
reset role;

-- 10. Mensajería: turista → prestador, recibido desde otra sesión
select pg_temp.act_as('fb_user_a');
insert into public.messages (conversation_id, sender_id, body) values
  ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-00000000000a', '¿Tienen sopa de queso el domingo?');
reset role;
select pg_temp.act_as('fb_owner');
insert into results select 'prestador recibe el mensaje', count(*) = 1 from public.messages;
reset role;
select pg_temp.act_as('fb_user_b');
insert into results select 'B no lee conversación ajena', count(*) = 0 from public.messages;
reset role;
select pg_temp.act_as('fb_moderator');
insert into results select 'moderador no lee conversaciones privadas', count(*) = 0 from public.messages;
reset role;

-- 11. Mensajes no se reescriben
select pg_temp.act_as('fb_user_a');
do $$
begin
  begin
    update public.messages set body = 'otro texto' where sender_id = '00000000-0000-0000-0000-00000000000a';
    insert into results values ('mensaje no se puede reescribir', false);
  exception when insufficient_privilege then
    insert into results values ('mensaje no se puede reescribir', true);
  end;
end $$;
reset role;

-- 12. Con bloqueo no se puede enviar
insert into public.user_blocks (blocker_id, blocked_id)
  values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000a');
select pg_temp.act_as('fb_user_a');
do $$
begin
  begin
    insert into public.messages (conversation_id, sender_id, body) values
      ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-00000000000a', 'insisto');
    insert into results values ('usuario bloqueado no puede escribir', false);
  exception when insufficient_privilege then
    insert into results values ('usuario bloqueado no puede escribir', true);
  end;
end $$;
reset role;
delete from public.user_blocks;

-- 13. Autorreseña bloqueada
select pg_temp.act_as('fb_owner');
do $$
begin
  begin
    insert into public.reviews (author_id, business_id, rating)
    values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', 5);
    insert into results values ('propietaria no puede reseñar su negocio', false);
  exception when insufficient_privilege then
    insert into results values ('propietaria no puede reseñar su negocio', true);
  end;
end $$;
reset role;

-- 14. Denuncia confidencial
select pg_temp.act_as('fb_user_a');
insert into public.incident_reports (reporter_id, category, description)
values ('00000000-0000-0000-0000-00000000000a', 'pollution', 'Basura acumulada en el sendero del mirador');
insert into results select 'denunciante ve su denuncia', count(*) = 1 from public.incident_reports;
reset role;
select pg_temp.act_as('fb_user_b');
insert into results select 'B no ve denuncias ajenas', count(*) = 0 from public.incident_reports;
reset role;
select pg_temp.act_as('fb_moderator');
insert into results select 'moderador comunitario no ve denuncias', count(*) = 0 from public.incident_reports;
reset role;
select pg_temp.act_as('fb_admin');
insert into results select 'admin con reports.manage ve denuncias', count(*) = 1 from public.incident_reports;
reset role;

-- 15. No se puede marcar una remisión como transmitida sin acuse real
do $$
begin
  begin
    insert into public.incident_referrals (incident_id, institution, channel, channel_doc_ref, consent_at, status, created_by)
    select id, 'MARENA', 'correo', 'doc-pendiente', now(), 'transmitted', '00000000-0000-0000-0000-0000000000c2'
    from public.incident_reports limit 1;
    insert into results values ('remisión transmitida exige acuse', false);
  exception when check_violation then
    insert into results values ('remisión transmitida exige acuse', true);
  end;
end $$;

-- 16. Un "precio verificado" exige observación con fuente; un tiempo de traslado exige origen
insert into public.itineraries (id, trip_id) values
  ('00000000-0000-0000-0000-0000000007b1', '00000000-0000-0000-0000-0000000007a1');
do $$
begin
  begin
    insert into public.itinerary_costs (itinerary_id, label, amount, currency, basis)
    values ('00000000-0000-0000-0000-0000000007b1', 'Entrada', 10, 'USD', 'verified_price');
    insert into results values ('precio verificado exige observación', false);
  exception when check_violation then
    insert into results values ('precio verificado exige observación', true);
  end;
end $$;
insert into public.itinerary_days (id, itinerary_id, day_number) values
  ('00000000-0000-0000-0000-0000000007d1', '00000000-0000-0000-0000-0000000007b1', 1);
do $$
begin
  begin
    insert into public.itinerary_stops (day_id, position, custom_label, travel_minutes)
    values ('00000000-0000-0000-0000-0000000007d1', 1, 'Mirador', 45);
    insert into results values ('tiempo de traslado exige origen', false);
  exception when check_violation then
    insert into results values ('tiempo de traslado exige origen', true);
  end;
end $$;

-- 17. Propuestas de corrección de la IA: solo personal con ai.review
insert into public.ai_correction_proposals (entity_table, entity_id, field, proposed_value, rationale, origin)
values ('businesses', '00000000-0000-0000-0000-0000000000b1', 'summary', '"x"', 'prueba', 'ai');
select pg_temp.act_as('fb_user_a');
insert into results select 'usuario no ve propuestas de la IA', count(*) = 0 from public.ai_correction_proposals;
reset role;
select pg_temp.act_as('fb_admin');
insert into results select 'admin con ai.review ve propuestas', count(*) = 1 from public.ai_correction_proposals;
reset role;
do $$
begin
  begin
    update public.ai_correction_proposals set state = 'approved';
    insert into results values ('aprobar propuesta exige revisor', false);
  exception when check_violation then
    insert into results values ('aprobar propuesta exige revisor', true);
  end;
end $$;

-- ===========================================================================
-- Fase 3 · alta de negocio → revisión → publicación; búsqueda justa; municipios
-- ===========================================================================
create temp table ctx (k text primary key, v uuid);
grant select, insert on ctx to authenticated;

-- 18. La emprendedora registra su negocio: queda en revisión y no es público
select pg_temp.act_as('fb_owner');
insert into ctx values ('biz', public.register_business('Comedor Doña Prueba', 11::smallint, array['comedores'], 'Sopa de queso'));
reset role;
insert into results select 'negocio nuevo queda en revisión',
  (select editorial = 'in_review' and listing_tier = 'claimed' from public.businesses where id = (select v from ctx where k = 'biz'));
insert into results select 'negocio en revisión no aparece en la vista pública',
  not exists (select 1 from public.public_businesses where id = (select v from ctx where k = 'biz'));
insert into results select 'riesgo estándar para comedores',
  (select risk_level = 'standard' from public.verification_requests where subject_id = (select v from ctx where k = 'biz'));
insert into results select 'alta queda auditada',
  exists (select 1 from audit.logs where action = 'business.register' and target_id = (select v::text from ctx where k = 'biz'));

-- 19. Sin sesión no se puede registrar
set local role anon;
select set_config('request.jwt.claims', '{}', true);
do $$
begin
  begin
    perform public.register_business('Anónimo', 6::smallint, array['comedores']);
    insert into results values ('anónimo no puede registrar negocio', false);
  exception when insufficient_privilege then
    insert into results values ('anónimo no puede registrar negocio', true);
  end;
end $$;
reset role;

-- 20. El auditor no puede resolver verificaciones
select pg_temp.act_as('fb_auditor');
do $$
begin
  begin
    perform public.review_business_verification(
      (select id from public.verification_requests where subject_id = (select v from ctx where k = 'biz')),
      'approve', 'Documentos completos', array['identity']);
    insert into results values ('auditor no puede aprobar negocios', false);
  exception when insufficient_privilege then
    insert into results values ('auditor no puede aprobar negocios', true);
  end;
end $$;
reset role;

-- 21. El administrador lo verifica y aparece en la vista pública (y en el mapa)
select pg_temp.act_as('fb_admin');
select public.review_business_verification(
  (select id from public.verification_requests where subject_id = (select v from ctx where k = 'biz')),
  'approve', 'Identidad y ubicación comprobadas en visita', array['identity','location']);
reset role;
insert into results select 'negocio verificado aparece en la vista pública',
  exists (select 1 from public.public_businesses where id = (select v from ctx where k = 'biz') and listing_tier = 'verified');
insert into results select 'verificación queda auditada con antes y después',
  exists (select 1 from audit.logs where action = 'business.verification.approve'
          and target_id = (select v::text from ctx where k = 'biz') and before_data is not null);

-- 22. Búsqueda sin acentos y sin patrocinados
insert into public.businesses (slug, name, department_id, editorial, is_sponsored)
values ('comedor-pagado', 'Comedor Pagado', 11, 'published', true);
set local role anon;
insert into results select 'búsqueda "dona prueba" encuentra "Doña Prueba"',
  exists (select 1 from public.search_catalog('dona prueba') where name = 'Comedor Doña Prueba');
insert into results select 'patrocinado no aparece en resultados orgánicos',
  not exists (select 1 from public.search_catalog('comedor') where name = 'Comedor Pagado');
reset role;

-- 23. Municipios: 153, todos en borrador y con fuente
insert into results select 'hay 153 municipios con fuente', count(*) = 153 and bool_and(source_id is not null) from public.municipalities;
insert into results select 'municipios siguen en borrador hasta confirmar con INIDE/INETER',
  bool_and(editorial = 'draft') from public.municipalities;
set local role anon;
insert into results select 'anónimo no ve municipios en borrador', count(*) = 0 from public.municipalities;
reset role;

-- ===========================================================================
-- Fase 4 · conversaciones con negocios, no leídos, notificaciones, feed, moderación
-- ===========================================================================

-- 24. B escribe al negocio; la dueña lo ve como no leído y recibe notificación
select pg_temp.act_as('fb_user_b');
insert into ctx values ('conv', public.start_business_conversation('00000000-0000-0000-0000-0000000000b1', 'Hola, ¿abren el domingo?'));
reset role;
select pg_temp.act_as('fb_owner');
insert into results select 'dueña ve 1 mensaje sin leer',
  (select unread = 1 from public.my_inbox() where conversation_id = (select v from ctx where k = 'conv'));
insert into results select 'dueña recibe notificación de mensaje',
  exists (select 1 from public.notifications where kind = 'new_message'
          and payload->>'conversation_id' = (select v::text from ctx where k = 'conv'));
insert into results select 'notificación nace pendiente de envío, no "enviada"',
  (select bool_and(push_status = 'pending') from public.notifications where kind = 'new_message');
select public.mark_conversation_read((select v from ctx where k = 'conv'));
insert into results select 'al leer, el contador vuelve a 0',
  (select unread = 0 from public.my_inbox() where conversation_id = (select v from ctx where k = 'conv'));
do $$
begin
  begin
    update public.notifications set push_status = 'sent';
    insert into results values ('usuario no puede marcar push como enviado', false);
  exception when insufficient_privilege then
    insert into results values ('usuario no puede marcar push como enviado', true);
  end;
end $$;
do $$
begin
  begin
    perform public.start_business_conversation('00000000-0000-0000-0000-0000000000b1', 'Me escribo a mí');
    insert into results values ('dueña no puede escribirse a su negocio', false);
  exception when invalid_parameter_value then
    insert into results values ('dueña no puede escribirse a su negocio', true);
  end;
end $$;
reset role;

-- 25. Segunda consulta de B reutiliza la misma conversación
select pg_temp.act_as('fb_user_b');
insert into results select 'B reanuda la misma conversación',
  public.start_business_conversation('00000000-0000-0000-0000-0000000000b1', '¿Y el sábado?') = (select v from ctx where k = 'conv');
insert into results select 'A no ve la conversación de B con el negocio',
  true; -- verificado abajo como A
reset role;
select pg_temp.act_as('fb_user_a');
update results set ok = not exists (select 1 from public.my_inbox() where conversation_id = (select v from ctx where k = 'conv'))
 where name = 'A no ve la conversación de B con el negocio';
reset role;

-- 26. Si la dueña bloquea a B, B no puede escribir
insert into public.user_blocks (blocker_id, blocked_id)
values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000b');
select pg_temp.act_as('fb_user_b');
do $$
begin
  begin
    perform public.start_business_conversation('00000000-0000-0000-0000-0000000000b1', 'insisto');
    insert into results values ('bloqueado no puede consultar al negocio', false);
  exception when insufficient_privilege then
    insert into results values ('bloqueado no puede consultar al negocio', true);
  end;
end $$;
reset role;
delete from public.user_blocks;

-- 27. Feed público y notificación de comentario
select pg_temp.act_as('fb_user_a');
insert into public.posts (id, author_id, body_md, visibility) values
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-00000000000a', 'Atardecer en la laguna', 'public'),
  ('00000000-0000-0000-0000-0000000005a2', '00000000-0000-0000-0000-00000000000a', 'Nota privada', 'private');
reset role;
set local role anon;
select set_config('request.jwt.claims', '{}', true);
insert into results select 'feed público muestra la publicación pública',
  exists (select 1 from public.public_feed() where id = '00000000-0000-0000-0000-0000000005a1');
insert into results select 'feed público no muestra la privada',
  not exists (select 1 from public.public_feed() where id = '00000000-0000-0000-0000-0000000005a2');
reset role;
select pg_temp.act_as('fb_user_b');
insert into public.comments (post_id, author_id, body) values
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-00000000000b', '¡Qué lindo!');
reset role;
select pg_temp.act_as('fb_user_a');
insert into results select 'autora recibe notificación del comentario',
  exists (select 1 from public.notifications where kind = 'post_comment');
reset role;

-- 27b. my_profile_id devuelve la identidad propia (y nada para anónimos)
select pg_temp.act_as('fb_user_a');
insert into results select 'my_profile_id devuelve el perfil propio',
  public.my_profile_id() = '00000000-0000-0000-0000-00000000000a';
reset role;

-- 28. Moderación auditada
select pg_temp.act_as('fb_moderator');
select public.moderate_content('post', '00000000-0000-0000-0000-0000000005a1', 'hide', 'Prueba de moderación');
reset role;
insert into results select 'publicación oculta sale del feed',
  not exists (select 1 from public.public_feed() where id = '00000000-0000-0000-0000-0000000005a1');
insert into results select 'moderación queda auditada',
  exists (select 1 from audit.logs where action = 'moderation.hide' and target_id = '00000000-0000-0000-0000-0000000005a1');
select pg_temp.act_as('fb_user_b');
do $$
begin
  begin
    perform public.moderate_content('post', '00000000-0000-0000-0000-0000000005a1', 'restore', 'Me gusta');
    insert into results values ('usuario común no puede moderar', false);
  exception when insufficient_privilege then
    insert into results values ('usuario común no puede moderar', true);
  end;
end $$;
reset role;

select case when ok then 'PASS' else 'FAIL' end as status, name from results order by ok, name;
select count(*) filter (where not ok) as failures, count(*) as total from results;

rollback;
