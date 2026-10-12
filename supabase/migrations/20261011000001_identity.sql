-- 0001 · Extensiones, esquemas auxiliares e identidad
-- Identidad: Firebase Auth (Third-Party Auth). El `sub` de Firebase NO es UUID:
-- nunca usar auth.uid() en políticas; usar app.current_firebase_uid().

-- En Supabase las extensiones viven en el esquema `extensions` (incluido en search_path).
create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis  with schema extensions;  -- verificar disponibilidad en el proyecto
create extension if not exists vector   with schema extensions;  -- pgvector, usado desde la Fase 5

create schema if not exists app;
create schema if not exists audit;

revoke all on schema app from public;
grant usage on schema app to authenticated, anon, service_role;
revoke all on schema audit from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------
create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Comprobación de emisor: rechaza JWT de proyectos Firebase ajenos.
-- Reemplazar los valores en `app.settings` por entorno (ver seed/settings.sql).
create table app.settings (
  key   text primary key,
  value text not null
);
revoke all on app.settings from public, anon, authenticated;

create or replace function app.is_trusted_jwt()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() ->> 'iss') = 'https://securetoken.google.com/' ||
      (select value from app.settings where key = 'firebase_project_id')
    and (auth.jwt() ->> 'aud') =
      (select value from app.settings where key = 'firebase_project_id'),
    false
  );
$$;

create or replace function app.current_firebase_uid()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'sub', '');
$$;

-- ---------------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------------
create type public.profile_status as enum ('active', 'suspended', 'deleted');

create table public.profiles (
  id                uuid primary key default gen_random_uuid(),
  firebase_uid      text not null unique,
  display_name      text check (char_length(display_name) between 1 and 80),
  username          text unique check (username ~ '^[a-z0-9_]{3,30}$'),
  avatar_path       text,
  bio               text check (char_length(bio) <= 500),
  preferred_locale  text not null default 'es'
                    check (preferred_locale in ('es','en','zh-Hans','ko','it','fr','pt','de','ru','ja')),
  status            public.profile_status not null default 'active',
  email_verified    boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function app.touch_updated_at();

create or replace function app.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.profiles p
  where p.firebase_uid = app.current_firebase_uid()
    and p.status = 'active'
    and app.is_trusted_jwt();
$$;

-- ---------------------------------------------------------------------------
-- Roles y permisos (por recurso y acción)
-- ---------------------------------------------------------------------------
create table public.roles (
  key         text primary key check (key ~ '^[a-z_]+$'),
  name        text not null,
  description text,
  is_staff    boolean not null default false
);

create table public.permissions (
  key         text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),  -- recurso.accion
  description text not null
);

create table public.role_permissions (
  role_key       text not null references public.roles(key) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (role_key, permission_key)
);

create table public.user_roles (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_key   text not null references public.roles(key),
  granted_by uuid references public.profiles(id),
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (profile_id, role_key)
);
create index user_roles_role_idx on public.user_roles(role_key);

create or replace function app.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_key = ur.role_key
    where ur.profile_id = app.current_profile_id()
      and rp.permission_key = p_permission
      and (ur.expires_at is null or ur.expires_at > now())
  );
$$;

-- ---------------------------------------------------------------------------
-- Organizaciones y membresías (negocios, cooperativas, comunidades)
-- ---------------------------------------------------------------------------
create type public.org_kind as enum ('business','cooperative','community','institution','artist_collective','other');
create type public.membership_role as enum ('owner','manager','editor');

create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  kind        public.org_kind not null,
  name        text not null check (char_length(name) between 2 and 160),
  created_by  uuid not null references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger organizations_touch before update on public.organizations
  for each row execute function app.touch_updated_at();

create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  role            public.membership_role not null,
  verified_at     timestamptz,
  created_at      timestamptz not null default now(),
  primary key (organization_id, profile_id)
);
create index org_members_profile_idx on public.organization_memberships(profile_id);

create or replace function app.is_org_member(p_org uuid, p_roles public.membership_role[] default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id = p_org
      and m.profile_id = app.current_profile_id()
      and (p_roles is null or m.role = any(p_roles))
  );
$$;

-- ---------------------------------------------------------------------------
-- Solicitudes de verificación (negocio, guía, artista, organización)
-- ---------------------------------------------------------------------------
create type public.verification_subject as enum ('business','guide','artist','organization');
create type public.verification_state as enum ('submitted','in_review','needs_info','approved','rejected','appealed','withdrawn');

create table public.verification_requests (
  id              uuid primary key default gen_random_uuid(),
  subject_type    public.verification_subject not null,
  subject_id      uuid not null,
  requested_by    uuid not null references public.profiles(id),
  state           public.verification_state not null default 'submitted',
  risk_level      text not null default 'standard' check (risk_level in ('low','standard','high')),
  evidence_paths  text[] not null default '{}',   -- bucket privado
  reviewer_id     uuid references public.profiles(id),
  reviewer_notes  text,                           -- interno, no visible al solicitante vía RLS de columna en la API
  decision_reason text,                           -- visible al solicitante
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index verification_state_idx on public.verification_requests(state, created_at);
create trigger verification_touch before update on public.verification_requests
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles                 enable row level security;
alter table public.roles                    enable row level security;
alter table public.permissions              enable row level security;
alter table public.role_permissions         enable row level security;
alter table public.user_roles               enable row level security;
alter table public.organizations            enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.verification_requests    enable row level security;

-- Barrera restrictiva común: solo JWT del proyecto Firebase propio.
do $$
declare t text;
begin
  foreach t in array array['profiles','user_roles','organizations',
                           'organization_memberships','verification_requests']
  loop
    execute format(
      'create policy trusted_issuer on public.%I as restrictive to authenticated using (app.is_trusted_jwt())', t);
  end loop;
end $$;

-- Perfiles: lectura pública de campos no sensibles se hace por la vista public_profiles.
create policy profiles_self_select on public.profiles
  for select to authenticated using (id = app.current_profile_id());
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = app.current_profile_id())
  with check (id = app.current_profile_id());
create policy profiles_staff_select on public.profiles
  for select to authenticated using (app.has_permission('users.read'));
-- Alta de perfil: solo la API (service_role) mediante /v1/me/bootstrap.

-- Catálogo de roles y permisos: lectura para usuarios autenticados.
create policy roles_read on public.roles for select to authenticated using (true);
create policy permissions_read on public.permissions for select to authenticated using (true);
create policy role_permissions_read on public.role_permissions for select to authenticated using (true);

create policy user_roles_self on public.user_roles
  for select to authenticated using (profile_id = app.current_profile_id());
create policy user_roles_staff on public.user_roles
  for select to authenticated using (app.has_permission('roles.read'));
-- Asignar/quitar roles: solo API con permiso roles.manage + registro en audit.logs.

create policy orgs_member_select on public.organizations
  for select to authenticated using (app.is_org_member(id));
create policy orgs_member_update on public.organizations
  for update to authenticated
  using (app.is_org_member(id, array['owner','manager']::public.membership_role[]))
  with check (app.is_org_member(id, array['owner','manager']::public.membership_role[]));
create policy orgs_staff_select on public.organizations
  for select to authenticated using (app.has_permission('organizations.read'));

create policy memberships_select on public.organization_memberships
  for select to authenticated
  using (profile_id = app.current_profile_id() or app.is_org_member(organization_id)
         or app.has_permission('organizations.read'));

create policy verification_own_select on public.verification_requests
  for select to authenticated using (requested_by = app.current_profile_id());
create policy verification_own_insert on public.verification_requests
  for insert to authenticated
  with check (requested_by = app.current_profile_id() and state = 'submitted');
create policy verification_staff_select on public.verification_requests
  for select to authenticated using (app.has_permission('verifications.review'));

-- Vista pública mínima de perfiles
create view public.public_profiles
with (security_invoker = false) as
  select id, display_name, username, avatar_path, bio
  from public.profiles
  where status = 'active';
grant select on public.public_profiles to anon, authenticated;

revoke execute on all functions in schema app from public;
grant execute on function app.current_firebase_uid(), app.current_profile_id(),
  app.has_permission(text), app.is_org_member(uuid, public.membership_role[]),
  app.is_trusted_jwt()
  to authenticated, anon;
