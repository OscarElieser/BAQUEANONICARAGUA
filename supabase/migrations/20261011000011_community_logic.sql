-- 0011 · Lógica de comunidad, mensajería y notificaciones (secciones 14, 15 y 22)

-- ---------------------------------------------------------------------------
-- Notificaciones (entrega push/correo la hace un worker; aquí solo el registro real)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id          bigint generated always as identity primary key,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('new_message','comment_reply','post_comment','reaction',
                                            'new_follower','verification_update','incident_update',
                                            'trip_update','system')),
  payload     jsonb not null default '{}'::jsonb,
  read_at     timestamptz,
  -- estado REAL de entrega por canal: nunca "entregado" si falló
  push_status  text not null default 'pending' check (push_status in ('pending','sent','failed','skipped')),
  email_status text not null default 'skipped' check (email_status in ('pending','sent','failed','skipped')),
  created_at  timestamptz not null default now()
);
create index notifications_inbox_idx on public.notifications(profile_id, created_at desc);

create table public.notification_preferences (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind       text not null,
  push       boolean not null default true,
  email      boolean not null default false,
  primary key (profile_id, kind)
);

create table public.push_tokens (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  token       text not null unique,
  platform    text not null check (platform in ('android','web')),
  created_at  timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_tokens enable row level security;

create policy notif_own_select on public.notifications for select to authenticated
  using (profile_id = app.current_profile_id());
create policy notif_own_read on public.notifications for update to authenticated
  using (profile_id = app.current_profile_id()) with check (profile_id = app.current_profile_id());
create policy notif_prefs_own on public.notification_preferences for all to authenticated
  using (profile_id = app.current_profile_id()) with check (profile_id = app.current_profile_id());
create policy push_tokens_own on public.push_tokens for all to authenticated
  using (profile_id = app.current_profile_id()) with check (profile_id = app.current_profile_id());
do $$
declare t text;
begin
  foreach t in array array['notifications','notification_preferences','push_tokens'] loop
    execute format('create policy trusted_issuer on public.%I as restrictive to authenticated using (app.is_trusted_jwt())', t);
  end loop;
end $$;

-- Al marcar leída solo puede cambiar read_at
create or replace function app.guard_notification_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated','anon') and (
     new.kind is distinct from old.kind or new.payload is distinct from old.payload
     or new.push_status is distinct from old.push_status or new.email_status is distinct from old.email_status
     or new.profile_id is distinct from old.profile_id) then
    raise exception 'Solo puedes marcar notificaciones como leídas' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger notifications_guard before update on public.notifications
  for each row execute function app.guard_notification_update();

create or replace function app.notify(p_profile uuid, p_kind text, p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_push boolean; v_email boolean;
begin
  select push, email into v_push, v_email from public.notification_preferences
   where profile_id = p_profile and kind = p_kind;
  insert into public.notifications (profile_id, kind, payload, push_status, email_status)
  values (p_profile, p_kind, p_payload,
          case when coalesce(v_push, true) then 'pending' else 'skipped' end,
          case when coalesce(v_email, false) then 'pending' else 'skipped' end);
end;
$$;

-- ---------------------------------------------------------------------------
-- Mensajería
-- ---------------------------------------------------------------------------

-- Anti-spam: máx. 20 mensajes por minuto por remitente
create or replace function app.guard_message_rate()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.messages
      where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Estás enviando mensajes muy rápido. Espera un momento.' using errcode = '54000';
  end if;
  return new;
end;
$$;
create trigger messages_rate before insert on public.messages
  for each row execute function app.guard_message_rate();

-- Tras cada mensaje: actualiza la conversación y notifica a los demás miembros
create or replace function app.after_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare m record;
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  for m in select profile_id from public.conversation_members
           where conversation_id = new.conversation_id and profile_id <> new.sender_id
             and left_at is null and not muted
  loop
    perform app.notify(m.profile_id, 'new_message',
      jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id));
  end loop;
  return null;
end;
$$;
create trigger messages_after after insert on public.messages
  for each row execute function app.after_message();

-- Iniciar (o reanudar) una consulta con un negocio
create or replace function public.start_business_conversation(p_business uuid, p_message text)
returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_me uuid := app.current_profile_id();
  v_org uuid;
  v_conv uuid;
  r record;
begin
  if v_me is null then
    raise exception 'Inicia sesión para escribir al negocio' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_message, ''))) < 2 then
    raise exception 'Escribe tu mensaje' using errcode = '22023';
  end if;
  select organization_id into v_org from public.businesses
   where id = p_business and editorial = 'published' and organization_id is not null;
  if v_org is null then
    raise exception 'Este negocio aún no recibe mensajes por la plataforma' using errcode = 'P0002';
  end if;
  if app.is_org_member(v_org) then
    raise exception 'No puedes escribirte a tu propio negocio' using errcode = '22023';
  end if;
  if exists (select 1 from public.organization_memberships m
             where m.organization_id = v_org and m.role in ('owner','manager')
               and app.is_blocked_between(m.profile_id, v_me)) then
    raise exception 'No es posible iniciar esta conversación' using errcode = '42501';
  end if;

  -- Reanuda la conversación existente con este negocio
  select c.id into v_conv from public.conversations c
   join public.conversation_members cm on cm.conversation_id = c.id
   where c.business_id = p_business and cm.profile_id = v_me and cm.left_at is null
   limit 1;

  if v_conv is null then
    if (select count(*) from public.conversations where created_by = v_me and created_at > now() - interval '1 day') >= 10 then
      raise exception 'Alcanzaste el límite de 10 conversaciones nuevas por día' using errcode = '54000';
    end if;
    insert into public.conversations (business_id, created_by) values (p_business, v_me) returning id into v_conv;
    insert into public.conversation_members (conversation_id, profile_id, last_read_at) values (v_conv, v_me, now());
    for r in select profile_id from public.organization_memberships
             where organization_id = v_org and role in ('owner','manager') loop
      insert into public.conversation_members (conversation_id, profile_id) values (v_conv, r.profile_id)
      on conflict do nothing;
    end loop;
  end if;

  insert into public.messages (conversation_id, sender_id, body) values (v_conv, v_me, trim(p_message));
  update public.conversation_members set last_read_at = now() where conversation_id = v_conv and profile_id = v_me;
  return v_conv;
end;
$$;
revoke execute on function public.start_business_conversation(uuid, text) from public, anon;
grant execute on function public.start_business_conversation(uuid, text) to authenticated;

-- Bandeja de entrada con contador de no leídos
create or replace function public.my_inbox()
returns table (conversation_id uuid, business_id uuid, business_name text, last_message_at timestamptz,
               last_message text, unread int)
language sql stable security definer set search_path = '' as $$
  select c.id, c.business_id, b.name, c.last_message_at,
         (select left(m.body, 140) from public.messages m
           where m.conversation_id = c.id and m.deleted_at is null order by m.created_at desc limit 1),
         (select count(*)::int from public.messages m
           where m.conversation_id = c.id and m.sender_id <> me.profile_id and m.deleted_at is null
             and (me.last_read_at is null or m.created_at > me.last_read_at))
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  left join public.businesses b on b.id = c.business_id
  where me.profile_id = app.current_profile_id() and me.left_at is null
  order by c.last_message_at desc nulls last;
$$;
revoke execute on function public.my_inbox() from public, anon;
grant execute on function public.my_inbox() to authenticated;

create or replace function public.mark_conversation_read(p_conversation uuid)
returns void language sql volatile security definer set search_path = '' as $$
  update public.conversation_members set last_read_at = now()
   where conversation_id = p_conversation and profile_id = app.current_profile_id();
$$;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Comunidad
-- ---------------------------------------------------------------------------

-- Notificar comentarios al autor de la publicación (y respuestas al autor del comentario)
create or replace function app.after_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_post_author uuid; v_parent_author uuid;
begin
  select author_id into v_post_author from public.posts where id = new.post_id;
  if v_post_author is not null and v_post_author <> new.author_id then
    perform app.notify(v_post_author, 'post_comment', jsonb_build_object('post_id', new.post_id, 'comment_id', new.id));
  end if;
  if new.parent_id is not null then
    select author_id into v_parent_author from public.comments where id = new.parent_id;
    if v_parent_author is not null and v_parent_author not in (new.author_id, coalesce(v_post_author, new.author_id)) then
      perform app.notify(v_parent_author, 'comment_reply', jsonb_build_object('post_id', new.post_id, 'comment_id', new.id));
    end if;
  end if;
  return null;
end;
$$;
create trigger comments_after after insert on public.comments
  for each row execute function app.after_comment();

-- Anti-spam de publicaciones: máx. 10 por hora
create or replace function app.guard_post_rate()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.posts where author_id = new.author_id and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Has publicado mucho en poco tiempo. Intenta más tarde.' using errcode = '54000';
  end if;
  return new;
end;
$$;
create trigger posts_rate before insert on public.posts
  for each row execute function app.guard_post_rate();

-- Feed público: solo publicaciones públicas y visibles, en orden cronológico
-- (sin algoritmo de interacción: lo reciente primero, de forma transparente)
create or replace function public.public_feed(p_before timestamptz default null, p_limit int default 20,
                                              p_department smallint default null)
returns table (id uuid, kind text, title text, body_md text, created_at timestamptz,
               author_id uuid, author_name text, author_username text,
               department_id smallint, destination_id uuid, business_id uuid, is_promotional boolean,
               reactions int, comments int)
language sql stable security definer set search_path = '' as $$
  select p.id, p.kind, p.title, p.body_md, p.created_at,
         p.author_id, pr.display_name, pr.username,
         p.department_id, p.destination_id, p.business_id, p.is_promotional,
         (select count(*)::int from public.reactions r where r.post_id = p.id),
         (select count(*)::int from public.comments c where c.post_id = p.id and c.moderation = 'visible')
  from public.posts p
  join public.profiles pr on pr.id = p.author_id and pr.status = 'active'
  where p.visibility = 'public' and p.moderation = 'visible'
    and (p_before is null or p.created_at < p_before)
    and (p_department is null or p.department_id = p_department)
    and (app.current_profile_id() is null or not app.is_blocked_between(p.author_id, app.current_profile_id()))
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
grant execute on function public.public_feed(timestamptz, int, smallint) to anon, authenticated;

-- Moderación: acción auditada con permiso community.moderate
create or replace function public.moderate_content(p_target_type text, p_target uuid, p_action text,
                                                   p_reason text, p_report uuid default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v_mod uuid := app.current_profile_id(); v_state public.moderation_state;
begin
  if not app.has_permission('community.moderate') then
    raise exception 'Permisos insuficientes' using errcode = '42501';
  end if;
  if p_action not in ('hide','remove','restore') or p_target_type not in ('post','comment','review') then
    raise exception 'Acción no válida' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Indica el motivo' using errcode = '22023';
  end if;
  v_state := case p_action when 'hide' then 'hidden' when 'remove' then 'removed' else 'visible' end;
  if p_target_type = 'post' then update public.posts set moderation = v_state where id = p_target;
  elsif p_target_type = 'comment' then update public.comments set moderation = v_state where id = p_target;
  else update public.reviews set moderation = v_state where id = p_target; end if;
  if not found then raise exception 'Contenido no encontrado' using errcode = 'P0002'; end if;

  insert into public.moderation_actions (moderator_id, report_id, target_type, target_id, action, reason)
  values (v_mod, p_report, p_target_type, p_target, p_action, trim(p_reason));
  if p_report is not null then
    update public.content_reports set state = 'actioned', resolved_by = v_mod, resolution = trim(p_reason)
     where id = p_report;
  end if;
  insert into audit.logs (actor_id, actor_kind, action, target_table, target_id, after_data)
  values (v_mod, 'user', 'moderation.' || p_action, p_target_type || 's', p_target::text,
          jsonb_build_object('reason', trim(p_reason), 'report_id', p_report));
end;
$$;
revoke execute on function public.moderate_content(text, uuid, text, text, uuid) from public, anon;
grant execute on function public.moderate_content(text, uuid, text, text, uuid) to authenticated;

-- Id de perfil del usuario actual (para que los clientes rellenen author_id / sender_id;
-- RLS sigue comprobando que coincida).
create or replace function public.my_profile_id()
returns uuid language sql stable as $$ select app.current_profile_id() $$;
revoke execute on function public.my_profile_id() from public, anon;
grant execute on function public.my_profile_id() to authenticated;

-- Realtime para notificaciones (solo existe la publicación en Supabase)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
