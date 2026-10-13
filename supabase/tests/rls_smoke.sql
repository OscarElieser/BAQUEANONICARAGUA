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

update public.departments set editorial = 'draft' where id <> 6;  -- La migración 0017 publica los 17: para esta prueba se dejan en borrador todos menos Granada
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

-- ===========================================================================
-- Fase 6 · flujo de denuncias, cultura y música
-- ===========================================================================

-- 29. Denuncia urgente: recibida, con orientación a canales oficiales
select pg_temp.act_as('fb_user_b');
insert into ctx select 'inc', (r->>'id')::uuid
from (select public.submit_incident('trail_risk', 'Puente colgante del sendero con tablas rotas', null, null, null, 6::smallint, true) as r) s;
reset role;
insert into results select 'denuncia queda recibida con evento visible',
  exists (select 1 from public.incident_events where incident_id = (select v from ctx where k = 'inc') and to_state = 'received');

select pg_temp.act_as('fb_user_b');
insert into results select 'denuncia urgente orienta a 118/115/128',
  (public.submit_incident('safety', 'Persona herida en el mirador, necesita ayuda', null, null, null, null, true)->>'urgent_guidance') like '%118%';
reset role;

-- 30. Transiciones: válidas e inválidas
select pg_temp.act_as('fb_admin');
select public.update_incident_state((select v from ctx where k = 'inc'), 'in_review', 'Caso asignado al equipo');
do $$
begin
  begin
    perform public.update_incident_state((select v from ctx where k = 'inc'), 'received', 'volver atrás');
    insert into results values ('no se puede volver a "recibida"', false);
  exception when object_not_in_prerequisite_state then
    insert into results values ('no se puede volver a "recibida"', true);
  end;
  begin
    perform public.update_incident_state((select v from ctx where k = 'inc'), 'referred', 'Derivada a MARENA');
    insert into results values ('no se marca derivada sin remisión transmitida', false);
  exception when object_not_in_prerequisite_state then
    insert into results values ('no se marca derivada sin remisión transmitida', true);
  end;
end $$;
select public.update_incident_state((select v from ctx where k = 'inc'), 'needs_info', 'Nota interna: verificar con guardaparques', false);
reset role;

-- 31. El denunciante no ve notas internas y responde cuando se le pide
select pg_temp.act_as('fb_user_b');
insert into results select 'denunciante no ve notas internas',
  not exists (select 1 from public.incident_events where incident_id = (select v from ctx where k = 'inc') and note like 'Nota interna%');
select public.reply_incident((select v from ctx where k = 'inc'), 'El puente está a 200 m de la entrada norte');
insert into results select 'al responder vuelve a revisión',
  (select state = 'in_review' from public.incident_reports where id = (select v from ctx where k = 'inc'));
reset role;

-- 32. Remisión real: preparar con consentimiento, transmitir con acuse, luego derivar
select pg_temp.act_as('fb_admin');
insert into ctx values ('ref', public.prepare_incident_referral((select v from ctx where k = 'inc'), 'MARENA', 'correo oficial', 'doc-canal-001', now()));
select public.record_referral_transmission((select v from ctx where k = 'ref'), true, 'ACUSE-2026-0001');
select public.update_incident_state((select v from ctx where k = 'inc'), 'referred', 'Remitida a la institución competente');
reset role;
insert into results select 'derivada solo tras transmisión con acuse',
  (select state = 'referred' from public.incident_reports where id = (select v from ctx where k = 'inc'));
insert into results select 'denunciante recibe notificación del avance',
  exists (select 1 from public.notifications n join public.profiles p on p.id = n.profile_id
          where p.firebase_uid = 'fb_user_b' and n.kind = 'incident_update');

-- 33. El moderador comunitario no puede gestionar denuncias
select pg_temp.act_as('fb_moderator');
do $$
begin
  begin
    perform public.update_incident_state((select v from ctx where k = 'inc'), 'resolved', 'cerrar');
    insert into results values ('moderador no gestiona denuncias', false);
  exception when insufficient_privilege then
    insert into results values ('moderador no gestiona denuncias', true);
  end;
end $$;
reset role;

-- 34. Música: solo reproductores oficiales o audio con licencia que lo permita
insert into public.artists (id, slug, name, kind, editorial) values
  ('00000000-0000-0000-0000-00000000a71a', 'artista-prueba', 'Artista de prueba', 'group', 'draft');
do $$
begin
  begin
    insert into public.music_works (artist_id, title, embed_url)
    values ('00000000-0000-0000-0000-00000000a71a', 'Tema', 'https://sitio-pirata.example/tema.mp3');
    insert into results values ('embed solo de reproductores oficiales', false);
  exception when check_violation then
    insert into results values ('embed solo de reproductores oficiales', true);
  end;
  begin
    insert into public.music_works (artist_id, title, hosted_path)
    values ('00000000-0000-0000-0000-00000000a71a', 'Tema', 'audio/tema.mp3');
    insert into results values ('audio alojado exige licencia', false);
  exception when check_violation then
    insert into results values ('audio alojado exige licencia', true);
  end;
end $$;
insert into public.media_licenses (id, license, holder, permission_ref, allows_hosting) values
  ('00000000-0000-0000-0000-0000000011c1', 'permiso-escrito', 'Agrupación de prueba', 'carta-2026-01', false);
do $$
begin
  begin
    insert into public.music_works (artist_id, title, hosted_path, license_id)
    values ('00000000-0000-0000-0000-00000000a71a', 'Tema', 'audio/tema.mp3', '00000000-0000-0000-0000-0000000011c1');
    insert into results values ('licencia sin permiso de alojar se rechaza', false);
  exception when check_violation then
    insert into results values ('licencia sin permiso de alojar se rechaza', true);
  end;
end $$;
insert into public.music_works (artist_id, title, embed_url)
values ('00000000-0000-0000-0000-00000000a71a', 'Tema oficial', 'https://www.youtube-nocookie.com/embed/abc123');
insert into results values ('reproductor oficial se acepta', true);

-- 35. Patrimonio comunitario y temas sensibles
do $$
begin
  begin
    insert into public.heritage_items (slug, title, kind, tangible, community_knowledge)
    values ('saber-tradicional', 'Saber tradicional', 'oral_tradition', false, true);
    insert into results values ('conocimiento comunitario exige consentimiento', false);
  exception when check_violation then
    insert into results values ('conocimiento comunitario exige consentimiento', true);
  end;
  begin
    insert into public.historical_events (title, era, start_year, contested, source_ids, editorial)
    values ('Hecho discutido', 'republican', 1900, true, array['00000000-0000-0000-0000-0000000005c0']::uuid[], 'published');
    insert into results values ('hecho controvertido exige perspectivas y segunda revisión', false);
  exception when check_violation then
    insert into results values ('hecho controvertido exige perspectivas y segunda revisión', true);
  end;
end $$;
set local role anon;
select set_config('request.jwt.claims', '{}', true);
insert into results select 'anónimo no ve artistas en borrador', count(*) = 0 from public.artists;
reset role;

-- ===========================================================================
-- Ops Center · administración
-- ===========================================================================
insert into public.profiles (id, firebase_uid, display_name) values
  ('00000000-0000-0000-0000-0000000000f5', 'fb_super', 'Superadmin'),
  ('00000000-0000-0000-0000-0000000000d1', 'fb_editor', 'Editora');
insert into public.user_roles (profile_id, role_key) values
  ('00000000-0000-0000-0000-0000000000f5', 'superadmin'),
  ('00000000-0000-0000-0000-0000000000d1', 'editor');

-- 36. Editor genérico: crear, campo no permitido, publicar exige fuente, archivar
select pg_temp.act_as('fb_editor');
insert into ctx values ('dest', public.admin_save_content('destinations', null,
  '{"slug":"mirador-prueba","name":"Mirador de prueba","department_id":6,"summary":"Vista al lago"}'::jsonb));
reset role;
insert into results select 'editor crea destino en borrador',
  (select editorial = 'draft' from public.destinations where id = (select v from ctx where k = 'dest'));
insert into results select 'creación deja revisión e historial',
  exists (select 1 from public.content_revisions where entity_id = (select v from ctx where k = 'dest'))
  and exists (select 1 from audit.logs where action = 'destinations.create');

select pg_temp.act_as('fb_editor');
do $$
begin
  begin
    perform public.admin_save_content('destinations', (select v from ctx where k = 'dest'), '{"editorial":"published"}'::jsonb);
    insert into results values ('editor no puede saltarse la lista blanca', false);
  exception when invalid_parameter_value then
    insert into results values ('editor no puede saltarse la lista blanca', true);
  end;
  begin
    perform public.admin_set_editorial('destinations', (select v from ctx where k = 'dest'), 'published');
    insert into results values ('editor sin content.publish no publica', false);
  exception when insufficient_privilege then
    insert into results values ('editor sin content.publish no publica', true);
  end;
end $$;
select public.admin_save_content('destinations', (select v from ctx where k = 'dest'), '{"summary":"Vista al lago y al volcán"}'::jsonb, true, 'Listo para revisar');
reset role;
insert into results select 'editar y enviar a revisión',
  (select editorial = 'in_review' and summary = 'Vista al lago y al volcán' from public.destinations where id = (select v from ctx where k = 'dest'));

select pg_temp.act_as('fb_admin');
do $$
begin
  begin
    perform public.admin_set_editorial('destinations', (select v from ctx where k = 'dest'), 'published');
    insert into results values ('publicar sin fuente se rechaza', false);
  exception when check_violation then
    insert into results values ('publicar sin fuente se rechaza', true);
  end;
end $$;
reset role;
select pg_temp.act_as('fb_editor');
select public.admin_save_content('destinations', (select v from ctx where k = 'dest'), '{"source_id":"00000000-0000-0000-0000-0000000005c0"}'::jsonb);
reset role;
select pg_temp.act_as('fb_admin');
select public.admin_set_editorial('destinations', (select v from ctx where k = 'dest'), 'published');
reset role;
insert into results select 'admin publica con fuente y aparece en la vista pública',
  exists (select 1 from public.public_destinations where id = (select v from ctx where k = 'dest'));

-- 37. Eliminar: publicado no se borra (se archiva); borrador nuevo sí
select pg_temp.act_as('fb_admin');
do $$
begin
  begin
    perform public.admin_set_editorial('destinations', (select v from ctx where k = 'dest'), 'draft');
    perform public.admin_delete_draft('destinations', (select v from ctx where k = 'dest'));
    insert into results values ('lo que estuvo publicado no se puede borrar', false);
  exception when object_not_in_prerequisite_state then
    insert into results values ('lo que estuvo publicado no se puede borrar', true);
  end;
end $$;
select public.admin_set_editorial('destinations', (select v from ctx where k = 'dest'), 'archived', 'Cerrado por la reserva');
insert into ctx values ('dest2', public.admin_save_content('destinations', null, '{"slug":"borrador-x","name":"Borrador X","department_id":6}'::jsonb));
select public.admin_delete_draft('destinations', (select v from ctx where k = 'dest2'));
reset role;
insert into results select 'archivar marca archived_at y sale de lo público',
  (select archived_at is not null from public.destinations where id = (select v from ctx where k = 'dest'))
  and not exists (select 1 from public.public_destinations where id = (select v from ctx where k = 'dest'));
insert into results select 'borrador nunca publicado se elimina',
  not exists (select 1 from public.destinations where id = (select v from ctx where k = 'dest2'));

-- 38. Suspender negocio (ocultar) exige businesses.review y motivo
select pg_temp.act_as('fb_admin');
select public.admin_set_editorial('businesses', '00000000-0000-0000-0000-0000000000b1', 'hidden', 'Quejas verificadas de clientes');
reset role;
insert into results select 'negocio suspendido sale de la vista pública',
  not exists (select 1 from public.public_businesses where id = '00000000-0000-0000-0000-0000000000b1');

-- 39. Usuarios: suspender, no a sí mismo, superadmin protegido, anonimizar
select pg_temp.act_as('fb_admin');
select public.admin_set_user_status('00000000-0000-0000-0000-00000000000b', 'suspended', 'Spam reiterado en comentarios');
do $$
begin
  begin
    perform public.admin_set_user_status('00000000-0000-0000-0000-0000000000c2', 'suspended', 'Prueba propia');
    insert into results values ('nadie se suspende a sí mismo', false);
  exception when insufficient_privilege then
    insert into results values ('nadie se suspende a sí mismo', true);
  end;
  begin
    perform public.admin_set_user_status('00000000-0000-0000-0000-0000000000f5', 'suspended', 'Intento de admin');
    insert into results values ('admin no puede suspender al superadmin', false);
  exception when insufficient_privilege then
    insert into results values ('admin no puede suspender al superadmin', true);
  end;
end $$;
reset role;
insert into results select 'usuario suspendido pierde identidad en RLS',
  (select status = 'suspended' from public.profiles where id = '00000000-0000-0000-0000-00000000000b');
select pg_temp.act_as('fb_user_b');
insert into results select 'cuenta suspendida no obtiene perfil', app.current_profile_id() is null;
reset role;

select pg_temp.act_as('fb_admin');
select public.admin_set_user_status('00000000-0000-0000-0000-00000000000a', 'deleted', 'Solicitud de eliminación del titular');
reset role;
insert into results select 'eliminar cuenta anonimiza datos personales',
  (select status = 'deleted' and display_name is null and firebase_uid like 'deleted:%' from public.profiles where id = '00000000-0000-0000-0000-00000000000a');
insert into results select 'la auditoría de la cuenta eliminada se conserva',
  exists (select 1 from audit.logs where target_id = '00000000-0000-0000-0000-00000000000a' and action = 'user.deleted');

-- 40. Roles: el auditor no gestiona; solo superadmin otorga superadmin; no se quita el último
select pg_temp.act_as('fb_auditor');
do $$
begin
  begin
    perform public.admin_grant_role('00000000-0000-0000-0000-0000000000d1', 'moderator');
    insert into results values ('auditor no puede asignar roles', false);
  exception when insufficient_privilege then
    insert into results values ('auditor no puede asignar roles', true);
  end;
end $$;
reset role;
select pg_temp.act_as('fb_super');
select public.admin_grant_role('00000000-0000-0000-0000-0000000000d1', 'moderator');
do $$
begin
  begin
    perform public.admin_revoke_role('00000000-0000-0000-0000-0000000000f5', 'superadmin');
    insert into results values ('no se quita el último superadmin', false);
  exception when object_not_in_prerequisite_state then
    insert into results values ('no se quita el último superadmin', true);
  end;
end $$;
select public.admin_revoke_role('00000000-0000-0000-0000-0000000000d1', 'moderator');
reset role;
insert into results select 'asignar y quitar rol quedan auditados',
  (select count(*) = 2 from audit.logs where action in ('role.grant','role.revoke') and target_id = '00000000-0000-0000-0000-0000000000d1');

-- 41. Reclamación de ficha comunitaria
insert into public.businesses (id, slug, name, department_id, editorial) values
  ('00000000-0000-0000-0000-0000000000b2', 'ficha-comunitaria', 'Ficha comunitaria', 6, 'published');
insert into public.business_claims (id, business_id, claimant_id) values
  ('00000000-0000-0000-0000-00000000c1a1', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000d1');
select pg_temp.act_as('fb_admin');
select public.admin_review_claim('00000000-0000-0000-0000-00000000c1a1', 'approve', 'Documentos de propiedad comprobados');
reset role;
insert into results select 'reclamación aprobada asigna dueña y pasa a reclamado',
  (select listing_tier = 'claimed' and organization_id is not null from public.businesses where id = '00000000-0000-0000-0000-0000000000b2')
  and exists (select 1 from public.organization_memberships m join public.businesses b on b.organization_id = m.organization_id
              where b.id = '00000000-0000-0000-0000-0000000000b2' and m.profile_id = '00000000-0000-0000-0000-0000000000d1' and m.role = 'owner');

-- 42. Propuesta de IA aprobada se aplica con revisión de origen IA; campo no editable se rechaza
insert into public.ai_correction_proposals (id, entity_table, entity_id, field, proposed_value, rationale, origin) values
  ('00000000-0000-0000-0000-00000000a1a1', 'businesses', '00000000-0000-0000-0000-0000000000b2', 'summary', '"Abre de martes a domingo"', 'Según la dueña', 'ai'),
  ('00000000-0000-0000-0000-00000000a1a2', 'businesses', '00000000-0000-0000-0000-0000000000b2', 'listing_tier', '"verified"', 'intento', 'ai');
select pg_temp.act_as('fb_admin');
select public.admin_review_ai_correction('00000000-0000-0000-0000-00000000a1a1', 'approve', 'Confirmado por teléfono');
do $$
begin
  begin
    perform public.admin_review_ai_correction('00000000-0000-0000-0000-00000000a1a2', 'approve', 'Intento de subir nivel');
    insert into results values ('IA no puede cambiar campos protegidos', false);
  exception when invalid_parameter_value then
    insert into results values ('IA no puede cambiar campos protegidos', true);
  end;
end $$;
reset role;
insert into results select 'corrección aprobada se aplica y queda versionada',
  (select summary = 'Abre de martes a domingo' from public.businesses where id = '00000000-0000-0000-0000-0000000000b2')
  and exists (select 1 from public.content_revisions where entity_id = '00000000-0000-0000-0000-0000000000b2' and origin = 'ai_proposal_approved');

-- 43. Ajustes con lista blanca y métricas del panel solo para el equipo
select pg_temp.act_as('fb_super');
select public.admin_set_setting('support_email', 'soporte@ejemplo.ni');
do $$
begin
  begin
    perform public.admin_set_setting('service_role_key', 'x');
    insert into results values ('ajuste fuera de lista blanca se rechaza', false);
  exception when invalid_parameter_value then
    insert into results values ('ajuste fuera de lista blanca se rechaza', true);
  end;
end $$;
insert into results select 'panel devuelve métricas reales', (public.ops_dashboard_metrics()->>'destinations_published') is not null;
insert into results select 'panel suma viajes, favoritos y BAQÜI de web y Android (0019)', (public.ops_dashboard_metrics() ?& array['trips_total','favorites_total','baqui_messages_24h','chronicles_7d','territories_published']); -- Indicadores nuevos presentes
reset role;
select pg_temp.act_as('fb_owner');
do $$
begin
  begin
    perform public.ops_dashboard_metrics();
    insert into results values ('emprendedora no ve el panel del equipo', false);
  exception when insufficient_privilege then
    insert into results values ('emprendedora no ve el panel del equipo', true);
  end;
end $$;
reset role;

-- 44. Medición de navegación: anónima, validada, sin lectura directa y resumen con umbral de anonimato
set local role anon; -- Visitante sin sesión
select public.track_navigation('00000000-0000-0000-0000-0000000a0001', '/es/territorios/granada', 'es', 'Google.com', 'web'); -- Registra una página
do $$
begin
  begin
    perform public.track_navigation('00000000-0000-0000-0000-0000000a0001', '/es/buscar?q=correo@ejemplo.ni', 'es'); -- Ruta con parámetros
    insert into results values ('navegación rechaza rutas con parámetros', false); -- No debió aceptarla
  exception when invalid_parameter_value then
    insert into results values ('navegación rechaza rutas con parámetros', true); -- Rechazada como se espera
  end;
  begin
    perform count(*) from analytics.navigation_events; -- Intenta leer la tabla directamente
    insert into results values ('visitante no lee eventos de navegación', false); -- No debió poder
  exception when insufficient_privilege then
    insert into results values ('visitante no lee eventos de navegación', true); -- Bloqueado
  end;
end $$;
reset role;
insert into analytics.navigation_events (visit_id, path, locale, platform) -- Cuatro visitas más a la misma ruta (total 5)
select gen_random_uuid(), '/es/territorios/granada', 'es', 'web' from generate_series(1, 4);
insert into analytics.navigation_events (visit_id, path, locale, platform) -- Una ruta con una sola visita
values (gen_random_uuid(), '/es/territorios/rara', 'es', 'web');
insert into results select 'evento guarda el dominio en minúsculas y sin usuario', -- Comprueba lo guardado
  exists (select 1 from analytics.navigation_events where referrer_host = 'google.com');
select pg_temp.act_as('fb_auditor'); -- Auditora con permiso de lectura
insert into results select 'resumen muestra rutas con 5 visitas o más', -- La ruta frecuente aparece
  (public.ops_navigation_summary(30)->'top_paths') @> '[{"path":"/es/territorios/granada"}]'::jsonb;
insert into results select 'resumen oculta rutas con menos de 5 visitas', -- La ruta rara no aparece
  not ((public.ops_navigation_summary(30)->'top_paths') @> '[{"path":"/es/territorios/rara"}]'::jsonb);
reset role;
select pg_temp.act_as('fb_user_a'); -- Usuaria sin permiso
do $$
begin
  begin
    perform public.ops_navigation_summary(30); -- Intenta ver el resumen
    insert into results values ('usuaria sin permiso no ve el resumen de navegación', false); -- No debió poder
  exception when insufficient_privilege then
    insert into results values ('usuaria sin permiso no ve el resumen de navegación', true); -- Bloqueada
  end;
end $$;
reset role;

insert into results select 'funciones con search_path fijo (asesor de seguridad 0011)', -- Ninguna de las ocho queda sin search_path
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace -- Funciones y su esquema
    where (n.nspname, p.proname) in (('app','touch_updated_at'),('app','current_firebase_uid'),('app','public_point'),('app','slugify'),('app','risk_for_categories'),('app','incident_transition_allowed'),('audit','block_mutation'),('public','my_profile_id')) -- Las señaladas
      and not coalesce(p.proconfig::text like '%search_path=%', false) -- Sin search_path fijo
  );

-- BAQÜI (migración 0018)
insert into public.profiles (id, firebase_uid, display_name) values ('00000000-0000-0000-0000-0000000bb001', 'fb_baqui', 'Viajera BAQÜI'); -- Cuenta activa propia para estas pruebas
select pg_temp.act_as('fb_baqui'); -- Viajera con sesión
insert into results select 'BAQÜI abre un turno con sesión y devuelve territorios publicados', -- Turno normal
  jsonb_array_length((public.baqui_start('Quiero ir a Granada', 'es'))->'territories') >= 1;
insert into results select 'BAQÜI guarda el mensaje de la persona', -- Queda en su historial
  exists (select 1 from public.ai_messages where role = 'user' and content->>'text' = 'Quiero ir a Granada');
do $$
begin
  begin
    perform public.baqui_reply((select id from public.ai_conversations limit 1), 'respuesta falsa', 'x', 1, 1); -- Un cliente intenta escribir una respuesta
    insert into results values ('un cliente no puede escribir respuestas de BAQÜI', false); -- No debió poder
  exception when insufficient_privilege then
    insert into results values ('un cliente no puede escribir respuestas de BAQÜI', true); -- Bloqueado
  end;
end $$;
reset role;
set local role anon; -- Sin sesión
select set_config('request.jwt.claims', '{}', true);
do $$
begin
  begin
    perform public.baqui_start('hola'); -- Intenta usar el asistente sin sesión
    insert into results values ('sin sesión no se puede usar BAQÜI', false); -- No debió poder
  exception when insufficient_privilege then
    insert into results values ('sin sesión no se puede usar BAQÜI', true); -- Bloqueado
  end;
end $$;
reset role;
select pg_temp.act_as('fb_baqui'); -- Vuelve la viajera
do $$
begin
  for i in 1..39 loop perform public.baqui_start('mensaje ' || i); end loop; -- Llega a 40 mensajes en el día
  begin
    perform public.baqui_start('uno más'); -- El 41
    insert into results values ('BAQÜI limita a 40 mensajes por día', false); -- No debió pasar
  exception when sqlstate '54000' then
    insert into results values ('BAQÜI limita a 40 mensajes por día', true); -- Límite aplicado
  end;
end $$;
reset role;

insert into results select 'los 17 territorios tienen cabecera y fuente (migración 0017)', -- Datos oficiales completos
  (select count(*) from public.departments where capital_name is not null and source_id = '00000000-0000-0000-0000-00000000a018') = 17;
insert into results select 'la publicación de territorios quedó en la auditoría', -- Un registro por territorio
  (select count(distinct target_id) from audit.logs where action = 'territory.publish') = 17;

-- Superadministrador inicial (migración superadmin_inicial)
insert into results select 'la marca del superadmin inicial guarda solo una huella SHA-256', -- El correo real no aparece en claro
  exists (select 1 from app.settings where key = 'superadmin_inicial_sha256' and value ~ '^[0-9a-f]{64}$');
update app.settings set value = encode(sha256(convert_to('dueno.prueba@example.com', 'UTF8')), 'hex') -- En la prueba se usa un correo inventado
 where key = 'superadmin_inicial_sha256'; -- Así el correo real del dueño no se escribe en el repositorio
insert into public.profiles (id, firebase_uid, display_name) values ('00000000-0000-0000-0000-0000000d0e01', 'fb_dueno', 'Dueño de prueba'); -- Cuenta del dueño simulado
grant insert, select on results to service_role; -- La función del servidor también anota resultados
select pg_temp.act_as('fb_dueno'); -- El dueño con sesión, desde la web o Android
do $$
begin
  begin
    perform public.session_bootstrap_superadmin('fb_dueno', 'dueno.prueba@example.com', true); -- Intenta darse el rol desde el cliente
    insert into results values ('un cliente no puede llamar al arranque de superadmin', false); -- No debió poder
  exception when insufficient_privilege then
    insert into results values ('un cliente no puede llamar al arranque de superadmin', true); -- Bloqueado
  end;
end $$;
reset role;
set local role anon; -- Sin sesión
select set_config('request.jwt.claims', '{}', true); -- Sin datos de sesión
do $$
begin
  begin
    perform public.session_bootstrap_superadmin('fb_dueno', 'dueno.prueba@example.com', true); -- Intenta darse el rol sin sesión
    insert into results values ('sin sesión no se puede llamar al arranque de superadmin', false); -- No debió poder
  exception when insufficient_privilege then
    insert into results values ('sin sesión no se puede llamar al arranque de superadmin', true); -- Bloqueado
  end;
end $$;
reset role;
set local role service_role; -- Como la función del servidor "preparar-sesion"
select set_config('request.jwt.claims', '{"role":"service_role"}', true); -- Datos de sesión del servidor
insert into results select 'si ya hay superadmin el arranque no hace nada', -- Ya existe el superadmin de las pruebas del Ops Center
  public.session_bootstrap_superadmin('fb_dueno', 'dueno.prueba@example.com', true) = false;
reset role;
delete from public.user_roles where role_key = 'superadmin'; -- Simula una base nueva, sin ningún superadministrador
set local role service_role; -- Vuelve a actuar como el servidor
select set_config('request.jwt.claims', '{"role":"service_role"}', true); -- Datos de sesión del servidor
insert into results select 'correo sin verificar no recibe superadmin', -- Firebase no confirmó el correo
  public.session_bootstrap_superadmin('fb_dueno', 'dueno.prueba@example.com', false) = false;
insert into results select 'otro correo no recibe superadmin', -- Otra persona inicia sesión
  public.session_bootstrap_superadmin('fb_dueno', 'otra.persona@example.com', true) = false;
insert into results select 'cuenta sin perfil no recibe superadmin', -- Correo correcto pero sin perfil activo
  public.session_bootstrap_superadmin('fb_no_existe', 'dueno.prueba@example.com', true) = false;
insert into results select 'el correo del dueño recibe superadmin aunque traiga mayúsculas y espacios', -- Caso real
  public.session_bootstrap_superadmin('fb_dueno', '  Dueno.Prueba@Example.com ', true) = true;
insert into results select 'el arranque de superadmin sirve una sola vez', -- Segunda llamada
  public.session_bootstrap_superadmin('fb_dueno', 'dueno.prueba@example.com', true) = false;
reset role;
insert into results select 'el dueño quedó como superadmin', -- Rol otorgado
  exists (select 1 from public.user_roles where profile_id = '00000000-0000-0000-0000-0000000d0e01' and role_key = 'superadmin');
insert into results select 'el arranque de superadmin quedó en la auditoría', -- Un registro del sistema
  (select count(*) from audit.logs where action = 'role.bootstrap' and actor_kind = 'system' and target_id = '00000000-0000-0000-0000-0000000d0e01') = 1;
insert into results select 'la marca del superadmin inicial se borró al usarse', -- No queda nada que reutilizar
  not exists (select 1 from app.settings where key = 'superadmin_inicial_sha256');

select case when ok then 'PASS' else 'FAIL' end as status, name from results order by ok, name;
select count(*) filter (where not ok) as failures, count(*) as total from results;

rollback;
