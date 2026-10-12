-- 0006 · Red social turística (sección 14) y mensajería (sección 15)
-- Moderadores ven reportes y contenido público, nunca conversaciones privadas.

create type public.moderation_state as enum ('visible','pending','hidden','removed');

-- ---------------------------------------------------------------------------
-- Bloqueos y seguimiento
-- ---------------------------------------------------------------------------
create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create or replace function app.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_blocks
                 where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;
grant execute on function app.is_blocked_between(uuid, uuid) to authenticated, anon;

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows(followee_id);

-- ---------------------------------------------------------------------------
-- Publicaciones
-- ---------------------------------------------------------------------------
create table public.posts (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references public.profiles(id) on delete cascade,
  kind           text not null default 'experience'
                 check (kind in ('experience','story','blog','chronicle','gallery')),
  title          text check (char_length(title) <= 160),
  body_md        text not null check (char_length(body_md) between 1 and 20000),
  locale         text not null default 'es',
  department_id  smallint references public.departments(id),
  destination_id uuid references public.destinations(id),
  business_id    uuid references public.businesses(id),
  visibility     text not null default 'public' check (visibility in ('public','followers','private')),
  is_promotional boolean not null default false,   -- obligatorio marcar si promociona un negocio propio
  moderation     public.moderation_state not null default 'visible',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index posts_feed_idx on public.posts(created_at desc) where moderation = 'visible' and visibility = 'public';
create index posts_author_idx on public.posts(author_id, created_at desc);
create trigger posts_touch before update on public.posts
  for each row execute function app.touch_updated_at();

create table public.post_media (
  post_id        uuid not null references public.posts(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  position       smallint not null default 0,
  primary key (post_id, media_asset_id)
);

create or replace function app.can_view_post(p_post uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.posts p
    where p.id = p_post
      and (
        p.author_id = app.current_profile_id()
        or (
          p.moderation = 'visible'
          and not app.is_blocked_between(p.author_id, app.current_profile_id())
          and (p.visibility = 'public'
               or (p.visibility = 'followers' and exists (
                     select 1 from public.follows f
                     where f.follower_id = app.current_profile_id() and f.followee_id = p.author_id)))
        )
      )
  );
$$;
grant execute on function app.can_view_post(uuid) to authenticated, anon;

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  parent_id  uuid references public.comments(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 4000),
  moderation public.moderation_state not null default 'visible',
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments(post_id, created_at);

create table public.reactions (
  post_id    uuid not null references public.posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind       text not null default 'like' check (kind in ('like','love','useful','wow')),
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create table public.saved_posts (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, post_id)
);

-- ---------------------------------------------------------------------------
-- Opiniones: distinguen visita declarada, testimonio no verificable y promocional
-- ---------------------------------------------------------------------------
create table public.reviews (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references public.profiles(id) on delete cascade,
  business_id    uuid references public.businesses(id) on delete cascade,
  destination_id uuid references public.destinations(id) on delete cascade,
  rating         smallint not null check (rating between 1 and 5),
  body           text check (char_length(body) <= 4000),
  visited_on     date,
  evidence_kind  text not null default 'unverified'
                 check (evidence_kind in ('unverified','visit_declared','visit_confirmed_by_provider')),
  moderation     public.moderation_state not null default 'visible',
  created_at     timestamptz not null default now(),
  constraint one_target check (num_nonnulls(business_id, destination_id) = 1)
);
create unique index one_review_per_business on public.reviews(author_id, business_id) where business_id is not null;
create unique index one_review_per_destination on public.reviews(author_id, destination_id) where destination_id is not null;

-- Nadie puede opinar sobre un negocio del que es miembro (evita autorreseñas)
create or replace function app.guard_self_review()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.business_id is not null and exists (
    select 1 from public.businesses b
    join public.organization_memberships m on m.organization_id = b.organization_id
    where b.id = new.business_id and m.profile_id = new.author_id
  ) then
    raise exception 'No se permiten opiniones sobre un negocio propio' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger reviews_no_self before insert or update on public.reviews
  for each row execute function app.guard_self_review();

create table public.review_responses (
  review_id   uuid primary key references public.reviews(id) on delete cascade,
  author_id   uuid not null references public.profiles(id),
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Reportes de contenido (moderación)
-- ---------------------------------------------------------------------------
create table public.content_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  target_type text not null check (target_type in ('post','comment','review','profile','message','business')),
  target_id   uuid not null,
  reason      text not null check (reason in ('spam','harassment','hate','sexual_content','minor_safety',
                                              'misinformation','fake_review','violence','other')),
  details     text check (char_length(details) <= 2000),
  -- Para mensajes: el denunciante adjunta voluntariamente el extracto; los moderadores no leen la conversación
  message_excerpt text check (char_length(message_excerpt) <= 4000),
  state       text not null default 'open' check (state in ('open','in_review','actioned','dismissed','appealed')),
  resolved_by uuid references public.profiles(id),
  resolution  text,
  created_at  timestamptz not null default now()
);
create index content_reports_open_idx on public.content_reports(created_at) where state in ('open','in_review','appealed');

create table public.moderation_actions (
  id          bigint generated always as identity primary key,
  moderator_id uuid not null references public.profiles(id),
  report_id   uuid references public.content_reports(id),
  target_type text not null,
  target_id   uuid not null,
  action      text not null check (action in ('hide','remove','restore','warn','suspend','dismiss')),
  reason      text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Mensajería
-- ---------------------------------------------------------------------------
create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id),   -- consulta a un negocio
  created_by  uuid not null references public.profiles(id),
  created_at  timestamptz not null default now(),
  last_message_at timestamptz
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  last_read_at    timestamptz,
  muted           boolean not null default false,
  left_at         timestamptz,
  primary key (conversation_id, profile_id)
);
create index conv_members_profile_idx on public.conversation_members(profile_id);

create or replace function app.is_conversation_member(p_conv uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversation_members
                 where conversation_id = p_conv and profile_id = app.current_profile_id()
                   and left_at is null);
$$;
grant execute on function app.is_conversation_member(uuid) to authenticated;

-- Ningún miembro de la conversación bloqueó a otro
create or replace function app.conversation_has_block(p_conv uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_members a
    join public.conversation_members b on b.conversation_id = a.conversation_id and b.profile_id <> a.profile_id
    where a.conversation_id = p_conv and app.is_blocked_between(a.profile_id, b.profile_id)
  );
$$;
grant execute on function app.conversation_has_block(uuid) to authenticated;

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id),
  body            text check (char_length(body) between 1 and 8000),
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index messages_conv_idx on public.messages(conversation_id, created_at desc);

create table public.message_attachments (
  id           uuid primary key default gen_random_uuid(),
  message_id   uuid not null references public.messages(id) on delete cascade,
  storage_path text not null unique,          -- bucket privado
  mime_type    text not null check (mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  size_bytes   int not null check (size_bytes between 1 and 10485760),   -- 10 MB
  scan_status  text not null default 'pending' check (scan_status in ('pending','clean','rejected'))
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.user_blocks          enable row level security;
alter table public.follows              enable row level security;
alter table public.posts                enable row level security;
alter table public.post_media           enable row level security;
alter table public.comments             enable row level security;
alter table public.reactions            enable row level security;
alter table public.saved_posts          enable row level security;
alter table public.reviews              enable row level security;
alter table public.review_responses     enable row level security;
alter table public.content_reports      enable row level security;
alter table public.moderation_actions   enable row level security;
alter table public.conversations        enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages             enable row level security;
alter table public.message_attachments  enable row level security;

create policy blocks_own on public.user_blocks for all to authenticated
  using (blocker_id = app.current_profile_id()) with check (blocker_id = app.current_profile_id());

create policy follows_read on public.follows for select to anon, authenticated using (true);
create policy follows_own on public.follows for insert to authenticated
  with check (follower_id = app.current_profile_id()
              and not app.is_blocked_between(follower_id, followee_id));
create policy follows_delete on public.follows for delete to authenticated
  using (follower_id = app.current_profile_id());

create policy posts_public_anon on public.posts for select to anon
  using (visibility = 'public' and moderation = 'visible');
create policy posts_select on public.posts for select to authenticated using (app.can_view_post(id));
create policy posts_moderator on public.posts for select to authenticated
  using (app.has_permission('community.moderate') and visibility <> 'private');
create policy posts_insert on public.posts for insert to authenticated
  with check (author_id = app.current_profile_id() and moderation = 'visible');
create policy posts_update on public.posts for update to authenticated
  using (author_id = app.current_profile_id())
  with check (author_id = app.current_profile_id());
create policy posts_delete on public.posts for delete to authenticated
  using (author_id = app.current_profile_id());

create or replace function app.guard_post_moderation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated','anon') and new.moderation is distinct from old.moderation
     and not app.has_permission('community.moderate') then
    raise exception 'Solo moderación puede cambiar el estado de una publicación' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger posts_guard before update on public.posts
  for each row execute function app.guard_post_moderation();

create policy post_media_select on public.post_media for select to anon, authenticated
  using (app.can_view_post(post_id));
create policy post_media_write on public.post_media for all to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = app.current_profile_id()))
  with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = app.current_profile_id()));

create policy comments_select on public.comments for select to anon, authenticated
  using (moderation = 'visible' and app.can_view_post(post_id));
create policy comments_insert on public.comments for insert to authenticated
  with check (author_id = app.current_profile_id() and moderation = 'visible'
              and app.can_view_post(post_id)
              and not app.is_blocked_between(author_id, (select p.author_id from public.posts p where p.id = post_id)));
create policy comments_delete on public.comments for delete to authenticated
  using (author_id = app.current_profile_id());

create policy reactions_select on public.reactions for select to anon, authenticated using (app.can_view_post(post_id));
create policy reactions_own on public.reactions for all to authenticated
  using (profile_id = app.current_profile_id())
  with check (profile_id = app.current_profile_id() and app.can_view_post(post_id));

create policy saved_own on public.saved_posts for all to authenticated
  using (profile_id = app.current_profile_id()) with check (profile_id = app.current_profile_id());

create policy reviews_public on public.reviews for select to anon, authenticated using (moderation = 'visible');
create policy reviews_insert on public.reviews for insert to authenticated
  with check (author_id = app.current_profile_id() and moderation = 'visible'
              and evidence_kind in ('unverified','visit_declared'));
create policy reviews_update on public.reviews for update to authenticated
  using (author_id = app.current_profile_id()) with check (author_id = app.current_profile_id());

create policy responses_public on public.review_responses for select to anon, authenticated using (true);
create policy responses_owner on public.review_responses for insert to authenticated
  with check (author_id = app.current_profile_id() and exists (
    select 1 from public.reviews r join public.businesses b on b.id = r.business_id
    where r.id = review_id and b.organization_id is not null
      and app.is_org_member(b.organization_id, array['owner','manager']::public.membership_role[])));

create policy reports_insert on public.content_reports for insert to authenticated
  with check (reporter_id = app.current_profile_id() and state = 'open');
create policy reports_own on public.content_reports for select to authenticated
  using (reporter_id = app.current_profile_id());
create policy reports_moderator on public.content_reports for select to authenticated
  using (app.has_permission('community.moderate'));

create policy modactions_staff on public.moderation_actions for select to authenticated
  using (app.has_permission('community.moderate') or app.has_permission('audit.read'));

-- Mensajería: solo miembros. Sin política para moderadores, a propósito.
create policy conv_select on public.conversations for select to authenticated
  using (app.is_conversation_member(id));
create policy conv_members_select on public.conversation_members for select to authenticated
  using (app.is_conversation_member(conversation_id));
create policy conv_members_self_update on public.conversation_members for update to authenticated
  using (profile_id = app.current_profile_id()) with check (profile_id = app.current_profile_id());
-- Crear conversaciones: API (valida bloqueos, spam y límites), que inserta conversación + miembros.

create policy messages_select on public.messages for select to authenticated
  using (app.is_conversation_member(conversation_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = app.current_profile_id()
              and app.is_conversation_member(conversation_id)
              and not app.conversation_has_block(conversation_id)
              and deleted_at is null);
create policy messages_soft_delete on public.messages for update to authenticated
  using (sender_id = app.current_profile_id())
  with check (sender_id = app.current_profile_id());

create or replace function app.guard_message_edit()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- Solo se permite marcar como eliminado: el contenido no se reescribe
  if current_user in ('authenticated','anon') and (
       new.body is distinct from old.body or new.conversation_id is distinct from old.conversation_id
       or new.sender_id is distinct from old.sender_id or new.created_at is distinct from old.created_at) then
    raise exception 'Los mensajes no se editan; solo pueden eliminarse' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger messages_guard before update on public.messages
  for each row execute function app.guard_message_edit();

create policy attachments_select on public.message_attachments for select to authenticated
  using (exists (select 1 from public.messages m where m.id = message_id
                 and app.is_conversation_member(m.conversation_id)));

do $$
declare t text;
begin
  foreach t in array array['user_blocks','follows','posts','post_media','comments','reactions','saved_posts',
                           'reviews','review_responses','content_reports','moderation_actions',
                           'conversations','conversation_members','messages','message_attachments']
  loop
    execute format(
      'create policy trusted_issuer on public.%I as restrictive to authenticated using (app.is_trusted_jwt())', t);
  end loop;
end $$;

-- Realtime para mensajes (solo existe la publicación en Supabase)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
