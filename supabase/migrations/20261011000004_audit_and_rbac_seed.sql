-- 0004 · Auditoría, revisiones de contenido y catálogo base de roles/permisos

create table audit.logs (
  id           bigint generated always as identity primary key,
  occurred_at  timestamptz not null default now(),
  actor_id     uuid,                    -- profiles.id (null = sistema)
  actor_kind   text not null check (actor_kind in ('user','system','ai')),
  action       text not null,           -- p. ej. 'business.verify', 'role.grant'
  target_table text,
  target_id    text,
  before_data  jsonb,
  after_data   jsonb,
  ip_hash      text,                     -- hash, nunca IP en claro
  request_id   text
);
create index audit_logs_target_idx on audit.logs(target_table, target_id);
create index audit_logs_actor_idx on audit.logs(actor_id, occurred_at desc);

-- Inmutable: sin update/delete para nadie (incluido service_role vía revoke).
revoke update, delete, truncate on audit.logs from public, anon, authenticated, service_role;
grant insert, select on audit.logs to service_role;

create or replace function audit.block_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'audit.logs es de solo inserción';
end;
$$;
create trigger audit_logs_immutable before update or delete on audit.logs
  for each row execute function audit.block_mutation();

-- Lectura para auditores a través de función con permiso explícito
create or replace function public.audit_log_search(
  p_target_table text default null, p_actor uuid default null, p_limit int default 100)
returns setof audit.logs
language sql
stable
security definer
set search_path = ''
as $$
  select l.* from audit.logs l
  where app.has_permission('audit.read')
    and (p_target_table is null or l.target_table = p_target_table)
    and (p_actor is null or l.actor_id = p_actor)
  order by l.occurred_at desc
  limit least(greatest(p_limit, 1), 500);
$$;
revoke execute on function public.audit_log_search(text, uuid, int) from public, anon;
grant execute on function public.audit_log_search(text, uuid, int) to authenticated;

-- Historial de revisiones editoriales
create table public.content_revisions (
  id           bigint generated always as identity primary key,
  entity_table text not null,
  entity_id    uuid not null,
  revision_no  int not null,
  data         jsonb not null,
  change_note  text,
  author_id    uuid references public.profiles(id),
  origin       text not null default 'human' check (origin in ('human','import','ai_proposal_approved')),
  approved_by  uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  unique (entity_table, entity_id, revision_no)
);
alter table public.content_revisions enable row level security;
create policy revisions_staff on public.content_revisions
  for select to authenticated using (app.has_permission('content.edit') or app.has_permission('audit.read'));

-- ---------------------------------------------------------------------------
-- Roles y permisos iniciales (sección 19 del prompt maestro)
-- ---------------------------------------------------------------------------
insert into public.roles (key, name, is_staff) values
  ('superadmin', 'Superadministrador', true),
  ('admin',      'Administrador',      true),
  ('auditor',    'Auditor',            true),
  ('moderator',  'Moderador',          true),
  ('editor',     'Editor de contenido',true),
  ('entrepreneur','Emprendedor',       false),
  ('guide',      'Guía',               false),
  ('user',       'Usuario',            false);
-- "Visitante" = rol anon de Postgres; no requiere fila.

insert into public.permissions (key, description) values
  ('users.read',            'Consultar perfiles y estado de usuarios'),
  ('users.suspend',         'Suspender o reactivar cuentas'),
  ('roles.read',            'Consultar asignaciones de roles'),
  ('roles.manage',          'Asignar o retirar roles'),
  ('organizations.read',    'Consultar organizaciones y membresías'),
  ('content.edit',          'Crear y editar contenido editorial'),
  ('content.publish',       'Publicar, ocultar o archivar contenido'),
  ('businesses.review',     'Revisar negocios y reclamaciones'),
  ('verifications.review',  'Resolver solicitudes de verificación'),
  ('community.moderate',    'Moderar publicaciones y comentarios'),
  ('reports.manage',        'Gestionar denuncias confidenciales'),
  ('ai.review',             'Revisar propuestas de corrección de la IA'),
  ('translations.approve',  'Aprobar traducciones'),
  ('notifications.send',    'Enviar campañas de notificación'),
  ('audit.read',            'Leer registros de auditoría'),
  ('settings.manage',       'Cambiar configuración e integraciones');

insert into public.role_permissions (role_key, permission_key)
select 'superadmin', key from public.permissions;

insert into public.role_permissions (role_key, permission_key) values
  ('admin','users.read'), ('admin','users.suspend'), ('admin','roles.read'),
  ('admin','organizations.read'), ('admin','content.edit'), ('admin','content.publish'),
  ('admin','businesses.review'), ('admin','verifications.review'),
  ('admin','community.moderate'), ('admin','reports.manage'), ('admin','ai.review'),
  ('admin','translations.approve'), ('admin','notifications.send'),
  -- Auditor: solo lectura, nunca escritura (escenario de aceptación de la sección 30)
  ('auditor','audit.read'), ('auditor','users.read'), ('auditor','roles.read'),
  ('auditor','organizations.read'),
  ('moderator','community.moderate'), ('moderator','users.read'),
  ('editor','content.edit'), ('editor','translations.approve');
