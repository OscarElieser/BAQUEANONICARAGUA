-- Avisos push en web y Android con Firebase Cloud Messaging (FCM).
-- 1. push_register: cada navegador o teléfono guarda su token con la sesión de la persona. Si ese token era de otra
--    cuenta en el mismo dispositivo, pasa a la cuenta nueva. Máximo 10 dispositivos por persona.
-- 2. La función de Supabase "enviar-avisos" toma los avisos pendientes con push_claim, los envía con la cuenta de
--    servicio (solo en el servidor) y anota el resultado real con push_report: enviado, fallido u omitido.
--    Los tokens que Firebase dice que ya no existen se borran.
-- 3. Cada minuto, pg_cron revisa si hay avisos pendientes y solo entonces despierta a "enviar-avisos".
--    La dirección de la función solo se guarda en producción (cuando el proyecto de Firebase es el oficial).

create extension if not exists pg_net with schema extensions; -- Peticiones HTTP desde la base (para despertar a la función)
create extension if not exists pg_cron; -- Tareas programadas dentro de la base

alter table public.notifications add column if not exists push_attempts smallint not null default 0; -- Cuántas veces se intentó enviar
alter table public.notifications add column if not exists push_locked_until timestamptz; -- Reservado por un envío en curso hasta esta hora
create index if not exists notifications_push_pending_idx on public.notifications (id) where push_status = 'pending'; -- Encuentra rápido los pendientes

create or replace function app.guard_notification_update() -- Reemplaza la protección: también cubre las columnas nuevas
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated','anon') and ( -- Solo aplica a clientes (web y Android)
     new.kind is distinct from old.kind or new.payload is distinct from old.payload -- No pueden cambiar el tipo ni el contenido
     or new.push_status is distinct from old.push_status or new.email_status is distinct from old.email_status -- Ni el estado de entrega
     or new.push_attempts is distinct from old.push_attempts or new.push_locked_until is distinct from old.push_locked_until -- Ni los datos del envío
     or new.profile_id is distinct from old.profile_id) then -- Ni a quién va dirigido
    raise exception 'Solo puedes marcar notificaciones como leídas' using errcode = '42501'; -- Solo pueden marcar como leída
  end if;
  return new; -- Cambio permitido
end;
$$;

create or replace function public.push_register(p_token text, p_platform text)
returns void -- No devuelve nada: o queda guardado o da error claro
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_me uuid := app.current_profile_id(); -- Persona con sesión
  v_token text := btrim(coalesce(p_token, '')); -- Token sin espacios
begin
  if v_me is null or not app.is_trusted_jwt() then -- Sin sesión válida de nuestro proyecto de Firebase
    raise exception 'Inicia sesión para activar los avisos' using errcode = '42501'; -- Rechazo claro
  end if;
  if p_platform is null or p_platform not in ('web', 'android') then -- Solo navegador o Android
    raise exception 'Plataforma no válida' using errcode = '22023'; -- Dato inválido
  end if;
  if char_length(v_token) < 20 or char_length(v_token) > 4096 then -- Los tokens de FCM tienen ese tamaño
    raise exception 'Token no válido' using errcode = '22023'; -- Dato inválido
  end if;
  delete from public.push_tokens where token = v_token and profile_id <> v_me; -- Si era de otra cuenta en este dispositivo, deja de recibir sus avisos
  insert into public.push_tokens (profile_id, token, platform) -- Guarda el dispositivo
  values (v_me, v_token, p_platform) -- De la persona con sesión
  on conflict (token) do update set last_seen_at = now(), platform = excluded.platform; -- Si ya estaba, solo se renueva
  delete from public.push_tokens -- Deja solo los 10 dispositivos usados más recientemente
   where profile_id = v_me -- De esta persona
     and id not in (select id from public.push_tokens where profile_id = v_me order by last_seen_at desc limit 10); -- Los demás se borran
end;
$$;
revoke execute on function public.push_register(text, text) from public, anon; -- Sin sesión no se registra nada
grant execute on function public.push_register(text, text) to authenticated; -- Web y Android con sesión

create or replace function app.push_skip_unsendable()
returns void -- Marca como omitidos los avisos que no se pueden o no tiene sentido enviar
language sql volatile security definer set search_path = '' as $$
  update public.notifications n -- Avisos pendientes
     set push_status = 'skipped', push_locked_until = null -- Omitidos (no se intentaron)
   where n.push_status = 'pending' -- Solo los que esperan
     and (n.created_at < now() - interval '1 day' -- De hace más de un día: ya no sirven como aviso
          or not exists (select 1 from public.push_tokens t where t.profile_id = n.profile_id)); -- O la persona no tiene ningún dispositivo
$$;
revoke execute on function app.push_skip_unsendable() from public, anon, authenticated; -- Solo uso interno

create or replace function public.push_claim(p_limit int default 50)
returns jsonb -- Lista de avisos reservados para enviar, con idioma y dispositivos
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_out jsonb; -- Resultado
begin
  perform app.push_skip_unsendable(); -- Primero descarta los que no se pueden enviar
  with elegidos as ( -- Pendientes libres, del más viejo al más nuevo
    select n.id from public.notifications n
     where n.push_status = 'pending' and (n.push_locked_until is null or n.push_locked_until < now()) -- No reservados por otro envío
     order by n.id -- Primero los más viejos
     limit least(greatest(coalesce(p_limit, 50), 1), 200) -- Entre 1 y 200 por vuelta
     for update skip locked -- Si otro envío los tiene, se saltan
  ), reservados as ( -- Se reservan por 2 minutos y se cuenta el intento
    update public.notifications n
       set push_locked_until = now() + interval '2 minutes', push_attempts = n.push_attempts + 1 -- Reserva y suma el intento
      from elegidos e where n.id = e.id -- Solo los elegidos
    returning n.id, n.profile_id, n.kind, n.push_attempts -- Datos que hacen falta para enviar
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', r.id, -- Aviso
           'kind', r.kind, -- Tipo (mensaje, comentario, denuncia…)
           'attempts', r.push_attempts, -- Intento número
           'locale', p.preferred_locale, -- Idioma de la persona
           'tokens', (select coalesce(jsonb_agg(t.token order by t.last_seen_at desc), '[]'::jsonb) from public.push_tokens t where t.profile_id = r.profile_id) -- Sus dispositivos
         ) order by r.id), '[]'::jsonb) -- Lista vacía si no hay nada
    into v_out
    from reservados r join public.profiles p on p.id = r.profile_id; -- Con el idioma del perfil
  return v_out; -- Avisos listos para enviar
end;
$$;
revoke execute on function public.push_claim(int) from public, anon, authenticated; -- Ningún cliente puede tomar avisos
grant execute on function public.push_claim(int) to service_role; -- Solo la función del servidor

create or replace function public.push_report(p_id bigint, p_status text, p_invalid_tokens text[] default '{}')
returns void -- Anota el resultado real del envío de un aviso
language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_status is null or p_status not in ('sent', 'failed', 'skipped', 'retry') then -- Solo resultados conocidos
    raise exception 'Resultado no válido' using errcode = '22023'; -- Dato inválido
  end if;
  delete from public.push_tokens where token = any(coalesce(p_invalid_tokens, '{}')); -- Tokens que Firebase dice que ya no existen
  if p_status = 'retry' then -- Falla pasajera de Firebase o de la red
    update public.notifications
       set push_status = case when push_attempts >= 3 then 'failed' else 'pending' end, -- Tres intentos y se da por fallido
           push_locked_until = case when push_attempts >= 3 then null else now() + make_interval(mins => push_attempts) end -- Espera un poco más en cada intento
     where id = p_id and push_status = 'pending'; -- Solo si sigue pendiente
  else
    update public.notifications set push_status = p_status, push_locked_until = null -- Resultado final
     where id = p_id and push_status = 'pending'; -- Solo si sigue pendiente
  end if;
end;
$$;
revoke execute on function public.push_report(bigint, text, text[]) from public, anon, authenticated; -- Ningún cliente puede anotar envíos
grant execute on function public.push_report(bigint, text, text[]) to service_role; -- Solo la función del servidor

insert into app.settings (key, value) -- Dirección de la función que envía los avisos
select 'avisos_url', 'https://nupjhqrvxjrngtpslfjq.supabase.co/functions/v1/enviar-avisos' -- Proyecto oficial de Supabase
 where exists (select 1 from app.settings where key = 'firebase_project_id' and value = 'baqueanonicaragua-95755') -- Solo en producción (en CI los ajustes llegan después)
on conflict (key) do nothing; -- Si ya existe, se deja como está

create or replace function app.avisos_disparar()
returns void -- La llama pg_cron cada minuto
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_url text := (select value from app.settings where key = 'avisos_url'); -- Dirección de "enviar-avisos" (solo existe en producción)
begin
  if v_url is null then -- Fuera de producción no se llama a nada
    return; -- Termina
  end if;
  perform app.push_skip_unsendable(); -- Descarta los que no se pueden enviar sin despertar a la función
  if not exists (select 1 from public.notifications where push_status = 'pending' and (push_locked_until is null or push_locked_until < now())) then -- Nada que enviar
    return; -- No gasta llamadas
  end if;
  perform net.http_post(url := v_url, body := '{}'::jsonb, headers := '{"Content-Type": "application/json"}'::jsonb, timeout_milliseconds := 20000); -- Despierta a la función (no lleva datos: ella los toma de la base)
end;
$$;
revoke execute on function app.avisos_disparar() from public, anon, authenticated; -- Solo la tarea programada

select cron.schedule('enviar-avisos', '* * * * *', 'select app.avisos_disparar()'); -- Cada minuto (si ya existe con ese nombre, se actualiza)

-- El panel del Ops Center suma los avisos (solo cifras: nunca tokens ni contenido)
create or replace function public.ops_dashboard_metrics() -- Reemplaza la versión de metricas_viajeros: suma los avisos push de web y Android
returns jsonb -- Indicadores del panel
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.is_staff() then -- Solo el equipo
    raise exception 'Solo para el equipo' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'generated_at', now(), -- Cuándo se calcularon
    'users_active', (select count(*) from public.profiles where status = 'active'), -- Cuentas activas
    'users_suspended', (select count(*) from public.profiles where status = 'suspended'), -- Cuentas suspendidas
    'businesses_published', (select count(*) from public.businesses where editorial = 'published'), -- Negocios visibles
    'businesses_in_review', (select count(*) from public.businesses where editorial = 'in_review'), -- Negocios en revisión
    'verifications_pending', (select count(*) from public.verification_requests where state in ('submitted','in_review','needs_info','appealed')), -- Verificaciones por revisar
    'claims_pending', (select count(*) from public.business_claims where state in ('submitted','in_review','needs_info','appealed')), -- Reclamaciones por revisar
    'reports_open', (select count(*) from public.content_reports where state in ('open','in_review','appealed')), -- Reportes abiertos
    'incidents_open', (select count(*) from public.incident_reports where state <> 'closed'), -- Denuncias abiertas
    'incidents_urgent_open', (select count(*) from public.incident_reports where state <> 'closed' and is_urgent), -- Denuncias urgentes
    'posts_7d', (select count(*) from public.posts where created_at > now() - interval '7 days'), -- Publicaciones de la semana
    'conversations_new_7d', (select count(*) from public.conversations where created_at > now() - interval '7 days'), -- Conversaciones nuevas con negocios
    'ai_corrections_pending', (select count(*) from public.ai_correction_proposals where state = 'pending'), -- Propuestas de la IA por revisar
    'destinations_published', (select count(*) from public.destinations where editorial = 'published'), -- Destinos visibles
    'territories_published', (select count(*) from public.departments where editorial = 'published'), -- Territorios visibles
    'chronicles_7d', (select count(*) from public.posts where kind = 'chronicle' and created_at > now() - interval '7 days'), -- Crónicas de la semana
    'trips_total', (select count(*) from public.trips), -- Viajes guardados (web y Android)
    'favorites_total', (select count(*) from public.favorites), -- Lugares guardados (web y Android)
    'baqui_messages_24h', (select count(*) from public.ai_messages where role = 'user' and created_at > now() - interval '24 hours'), -- Mensajes a BAQÜI en 24 horas
    'baqui_conversations_7d', (select count(*) from public.ai_conversations where created_at > now() - interval '7 days'), -- Conversaciones nuevas con BAQÜI
    'push_devices_web', (select count(*) from public.push_tokens where platform = 'web'), -- Navegadores con avisos activados
    'push_devices_android', (select count(*) from public.push_tokens where platform = 'android'), -- Teléfonos Android con avisos activados
    'push_sent_24h', (select count(*) from public.notifications where push_status = 'sent' and created_at > now() - interval '24 hours'), -- Avisos de las últimas 24 horas que llegaron
    'push_failed_24h', (select count(*) from public.notifications where push_status = 'failed' and created_at > now() - interval '24 hours') -- Avisos de las últimas 24 horas que fallaron
  );
end;
$$;
revoke execute on function public.ops_dashboard_metrics() from public, anon; -- Nadie sin sesión
grant execute on function public.ops_dashboard_metrics() to authenticated; -- Cada llamada comprueba que sea del equipo
