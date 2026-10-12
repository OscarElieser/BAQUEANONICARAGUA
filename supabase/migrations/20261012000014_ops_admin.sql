-- 0014 · Ops Center: administración con permisos, lista blanca de campos, historial y auditoría
-- "Eliminar" contenido publicado = archivar. Solo un borrador nunca publicado se borra.
-- "Eliminar" una cuenta = anonimizar (Ley 787); la auditoría se conserva.

create or replace function app.require(p_permission text)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.has_permission(p_permission) then
    raise exception 'Permisos insuficientes (%)', p_permission using errcode = '42501';
  end if;
end;
$$;

create or replace function app.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles ur join public.roles r on r.key = ur.role_key
                 where ur.profile_id = app.current_profile_id() and r.is_staff
                   and (ur.expires_at is null or ur.expires_at > now()));
$$;

-- ---------------------------------------------------------------------------
-- Registro de recursos editables (espejo de apps/web/src/ops/resources.ts)
-- ---------------------------------------------------------------------------
create table app.admin_resources (
  resource       text primary key,
  table_name     text not null,
  editable       text[] not null,        -- columnas que el editor puede escribir
  editorial_col  text,                   -- 'editorial' | 'review_state' | null
  edit_perm      text not null default 'content.edit',
  publish_perm   text not null default 'content.publish'
);
revoke all on app.admin_resources from public, anon, authenticated;

insert into app.admin_resources (resource, table_name, editable, editorial_col, edit_perm, publish_perm) values
  ('destinations', 'destinations',
   array['slug','name','department_id','municipality_id','summary','description_md','location_precision','access_notes',
         'safety_notes','environmental_notes','accessibility','source_id','verification','verified_at','is_sensitive'],
   'editorial', 'content.edit', 'content.publish'),
  ('businesses', 'businesses',
   array['name','department_id','municipality_id','destination_id','summary','description_md','location_precision','source_id'],
   'editorial', 'content.edit', 'businesses.review'),
  ('territory_sections', 'territory_sections',
   array['department_id','section','locale','title','body_md','machine_translated','source_ids','verified_at'],
   'editorial', 'content.edit', 'content.publish'),
  ('municipalities', 'municipalities', array['name','official_code','source_id'], 'editorial', 'content.edit', 'content.publish'),
  ('data_sources', 'data_sources',
   array['title','publisher','url','published_at','accessed_at','license','reuse_allowed','confidence','available','notes'],
   'review_state', 'content.edit', 'content.publish'),
  ('heritage_items', 'heritage_items',
   array['slug','title','kind','tangible','department_id','summary','body_md','locale','unesco_recognized','community_knowledge',
         'community_consent_ref','sensitive_topic','source_ids','verified_at'],
   'editorial', 'content.edit', 'content.publish'),
  ('historical_events', 'historical_events',
   array['title','era','start_year','end_year','date_precision','department_id','summary','body_md','locale','contested',
         'perspectives_md','source_ids'],
   'editorial', 'content.edit', 'content.publish'),
  ('artists', 'artists', array['slug','name','kind','genres','instruments','department_id','bio_md','living','source_ids'],
   'editorial', 'content.edit', 'content.publish'),
  ('music_works', 'music_works', array['artist_id','title','year','genre','embed_url','hosted_path','license_id'],
   'editorial', 'content.edit', 'content.publish'),
  ('media_licenses', 'media_licenses',
   array['license','holder','permission_ref','allows_hosting','allows_commercial','expires_on','notes'],
   null, 'content.edit', 'content.publish'),
  ('community_stories', 'community_stories',
   array['title','body_md','community_name','department_id','teller_name','teller_consent_at','community_consent_ref','locale'],
   'editorial', 'content.edit', 'content.publish');

create or replace function app.resource(p_resource text)
returns app.admin_resources language plpgsql stable security definer set search_path = '' as $$
declare r app.admin_resources;
begin
  select * into r from app.admin_resources where resource = p_resource;
  if not found then raise exception 'Recurso no administrable: %', p_resource using errcode = '22023'; end if;
  return r;
end;
$$;

create or replace function app.record_revision(p_table text, p_id uuid, p_note text, p_origin text default 'human')
returns void language plpgsql security definer set search_path = '' as $$
declare v_row jsonb;
begin
  execute format('select to_jsonb(t) from public.%I t where id = $1', p_table) into v_row using p_id;
  insert into public.content_revisions (entity_table, entity_id, revision_no, data, change_note, author_id, origin)
  values (p_table, p_id,
          coalesce((select max(revision_no) from public.content_revisions where entity_table = p_table and entity_id = p_id), 0) + 1,
          v_row, p_note, app.current_profile_id(), p_origin);
end;
$$;

-- ---------------------------------------------------------------------------
-- Editor genérico: crear o modificar (nunca cambia el estado editorial salvo "enviar a revisión")
-- ---------------------------------------------------------------------------
create or replace function public.admin_save_content(
  p_resource text, p_id uuid, p_data jsonb, p_submit_for_review boolean default false, p_note text default null
)
returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  r app.admin_resources := app.resource(p_resource);
  v_unknown text[];
  v_cols text[];
  v_collist text;
  v_id uuid := p_id;
  v_before jsonb;
  v_after jsonb;
begin
  perform app.require(r.edit_perm);
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'Datos inválidos' using errcode = '22023';
  end if;
  select array_agg(k) into v_unknown from jsonb_object_keys(p_data) k where k <> all (r.editable);
  if v_unknown is not null then
    raise exception 'Campos no permitidos en %: %', p_resource, array_to_string(v_unknown, ', ') using errcode = '22023';
  end if;
  select array_agg(k order by k) into v_cols from jsonb_object_keys(p_data) k;

  if v_id is null then
    if v_cols is null then raise exception 'No hay datos para crear' using errcode = '22023'; end if;
    v_collist := (select string_agg(format('%I', c), ', ') from unnest(v_cols) c);
    execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) returning id',
                   r.table_name, v_collist, v_collist, r.table_name)
      into v_id using p_data;
  else
    execute format('select to_jsonb(t) from public.%I t where id = $1', r.table_name) into v_before using v_id;
    if v_before is null then raise exception 'Registro no encontrado' using errcode = 'P0002'; end if;
    if v_cols is not null then
      v_collist := (select string_agg(format('%I', c), ', ') from unnest(v_cols) c);
      execute format('update public.%I set (%s) = (select %s from jsonb_populate_record(null::public.%I, $1)) where id = $2',
                     r.table_name, v_collist, v_collist, r.table_name)
        using p_data, v_id;
    end if;
  end if;

  if p_submit_for_review and r.editorial_col is not null then
    execute format('update public.%I set %I = %L where id = $1 and %I in (''draft'',''hidden'')',
                   r.table_name, r.editorial_col, 'in_review', r.editorial_col) using v_id;
  end if;

  perform app.record_revision(r.table_name, v_id, coalesce(p_note, case when p_id is null then 'Creado' else 'Editado' end));
  execute format('select to_jsonb(t) from public.%I t where id = $1', r.table_name) into v_after using v_id;
  insert into audit.logs (actor_id, actor_kind, action, target_table, target_id, before_data, after_data)
  values (app.current_profile_id(), 'user', p_resource || case when p_id is null then '.create' else '.update' end,
          r.table_name, v_id::text, v_before, v_after);
  return v_id;
end;
$$;

-- Publicar, ocultar, archivar o devolver a borrador
create or replace function public.admin_set_editorial(p_resource text, p_id uuid, p_status text, p_reason text default null)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  r app.admin_resources := app.resource(p_resource);
  v_before jsonb;
  v_has_source boolean;
  v_has_archived boolean;
begin
  perform app.require(r.publish_perm);
  if r.editorial_col is null then
    raise exception 'Este recurso no tiene estado editorial' using errcode = '22023';
  end if;
  if p_status not in ('draft','in_review','published','hidden','archived') then
    raise exception 'Estado no válido: %', p_status using errcode = '22023';
  end if;
  execute format('select to_jsonb(t) from public.%I t where id = $1', r.table_name) into v_before using p_id;
  if v_before is null then raise exception 'Registro no encontrado' using errcode = 'P0002'; end if;

  -- Publicar exige fuente cuando el recurso la tiene (principio 2)
  if p_status = 'published' then
    v_has_source := v_before ? 'source_id';
    if v_has_source and (v_before->>'source_id') is null and p_resource <> 'businesses' then
      raise exception 'Para publicar, registra la fuente de la información' using errcode = '23514';
    end if;
  end if;
  if p_status in ('hidden','archived') and char_length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Indica el motivo' using errcode = '22023';
  end if;

  v_has_archived := v_before ? 'archived_at';
  execute format('update public.%I set %I = %L%s where id = $1',
                 r.table_name, r.editorial_col, p_status,
                 case when v_has_archived then
                   case when p_status = 'archived' then ', archived_at = now()' else ', archived_at = null' end
                 else '' end)
    using p_id;

  perform app.record_revision(r.table_name, p_id, coalesce(p_reason, 'Estado: ' || p_status));
  insert into audit.logs (actor_id, actor_kind, action, target_table, target_id, before_data, after_data)
  values (app.current_profile_id(), 'user', p_resource || '.' || p_status, r.table_name, p_id::text,
          jsonb_build_object(r.editorial_col, v_before->>r.editorial_col),
          jsonb_build_object(r.editorial_col, p_status, 'reason', p_reason));
end;
$$;

-- Borrado definitivo SOLO de borradores que nunca se publicaron
create or replace function public.admin_delete_draft(p_resource text, p_id uuid)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  r app.admin_resources := app.resource(p_resource);
  v_before jsonb;
begin
  perform app.require(r.publish_perm);
  execute format('select to_jsonb(t) from public.%I t where id = $1', r.table_name) into v_before using p_id;
  if v_before is null then raise exception 'Registro no encontrado' using errcode = 'P0002'; end if;
  if r.editorial_col is not null and (v_before->>r.editorial_col) <> 'draft' then
    raise exception 'Solo se eliminan borradores. Para retirar contenido publicado, archívalo.' using errcode = '55000';
  end if;
  if exists (select 1 from public.content_revisions
             where entity_table = r.table_name and entity_id = p_id and data->>coalesce(r.editorial_col, '-') = 'published') then
    raise exception 'Este registro estuvo publicado: archívalo en lugar de eliminarlo' using errcode = '55000';
  end if;
  execute format('delete from public.%I where id = $1', r.table_name) using p_id;
  insert into audit.logs (actor_id, actor_kind, action, target_table, target_id, before_data)
  values (app.current_profile_id(), 'user', p_resource || '.delete_draft', r.table_name, p_id::text, v_before);
end;
$$;

-- Listado para el editor (incluye borradores; solo personal con permiso de edición)
create or replace function public.admin_list(p_resource text, p_q text default null, p_status text default null,
                                             p_limit int default 50, p_offset int default 0)
returns setof jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r app.admin_resources := app.resource(p_resource);
begin
  perform app.require(r.edit_perm);
  return query execute format(
    'select to_jsonb(t) from public.%I t where ($1 is null or %s) and ($2 is null or %s) order by %s limit $3 offset $4',
    r.table_name,
    case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = r.table_name and column_name = 'name')
         then 'app.f_unaccent(lower(t.name)) like ''%'' || app.f_unaccent(lower($1)) || ''%'''
         when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = r.table_name and column_name = 'title')
         then 'app.f_unaccent(lower(t.title)) like ''%'' || app.f_unaccent(lower($1)) || ''%'''
         else 'true' end,
    case when r.editorial_col is not null then format('t.%I::text = $2', r.editorial_col) else 'true' end,
    case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = r.table_name and column_name = 'updated_at')
         then 't.updated_at desc' else 't.id' end)
  using p_q, p_status, least(greatest(coalesce(p_limit, 50), 1), 200), greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- Usuarios y roles
-- ---------------------------------------------------------------------------
create or replace function app.is_superadmin(p_profile uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where profile_id = p_profile and role_key = 'superadmin');
$$;

create or replace function public.admin_set_user_status(p_profile uuid, p_status text, p_reason text)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_me uuid := app.current_profile_id(); v_before jsonb;
begin
  perform app.require('users.suspend');
  if p_status not in ('active','suspended','deleted') then
    raise exception 'Estado no válido' using errcode = '22023';
  end if;
  if p_profile = v_me then
    raise exception 'No puedes cambiar el estado de tu propia cuenta' using errcode = '42501';
  end if;
  if app.is_superadmin(p_profile) and not app.is_superadmin(v_me) then
    raise exception 'Solo un superadministrador puede cambiar a otro superadministrador' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Indica el motivo' using errcode = '22023';
  end if;
  select to_jsonb(p) - 'firebase_uid' into v_before from public.profiles p where id = p_profile;
  if v_before is null then raise exception 'Usuario no encontrado' using errcode = 'P0002'; end if;
  if (v_before->>'status') = 'deleted' then
    raise exception 'La cuenta ya fue eliminada' using errcode = '55000';
  end if;

  if p_status = 'deleted' then
    if app.is_superadmin(p_profile) and (select count(*) from public.user_roles where role_key = 'superadmin') <= 1 then
      raise exception 'No se puede eliminar al último superadministrador' using errcode = '55000';
    end if;
    -- Anonimización: se conserva el id para la auditoría, se borran los datos personales
    update public.profiles
       set status = 'deleted', display_name = null, username = null, bio = null, avatar_path = null,
           firebase_uid = 'deleted:' || id::text
     where id = p_profile;
    delete from public.user_roles where profile_id = p_profile;
    delete from public.push_tokens where profile_id = p_profile;
    delete from public.ai_memories where profile_id = p_profile;
    delete from public.notification_preferences where profile_id = p_profile;
  else
    update public.profiles set status = p_status::public.profile_status where id = p_profile;
  end if;

  insert into audit.logs (actor_id, actor_kind, action, target_table, target_id, before_data, after_data)
  values (v_me, 'user', 'user.' || p_status, 'profiles', p_profile::text,
          jsonb_build_object('status', v_before->>'status'), jsonb_build_object('status', p_status, 'reason', trim(p_reason)));
end;
$$;

create or replace function public.admin_grant_role(p_profile uuid, p_role text, p_expires_at timestamptz default null)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_me uuid := app.current_profile_id();
begin
  perform app.require('roles.manage');
  if not exists (select 1 from public.roles where key = p_role) then
    raise exception 'Rol desconocido' using errcode = '22023';
  end if;
  if p_role = 'superadmin' and not app.is_superadmin(v_me) then
    raise exception 'Solo un superadministrador puede otorgar ese rol' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_profile and status = 'active') then
    raise exception 'Usuario no encontrado o no activo' using errcode = 'P0002';
  end if;
  insert into public.user_roles (profile_id, role_key, granted_by, expires_at)
  values (p_profile, p_role, v_me, p_expires_at)
  on conflict (profile_id, role_key) do update set granted_by = excluded.granted_by, granted_at = now(), expires_at = excluded.expires_at;
  insert into audit.logs (actor_id, actor_kind, action, target_table, target_id, after_data)
  values (v_me, 'user', 'role.grant', 'user_roles', p_profile::text, jsonb_build_object('role', p_role, 'expires_at', p_expires_at));
end;
$$;

create or replace function public.admin_revoke_role(p_profile uuid, p_role text)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_me uuid := app.current_profile_id();
begin
  perform app.require('roles.manage');
  if p_role = 'superadmin' then
    if not app.is_superadmin(v_me) then
      raise exception 'Solo un superadministrador puede quitar ese rol' using errcode = '42501';
    end if;
    if (select count(*) from public.user_roles where role_key = 'superadmin') <= 1 then
      raise exception 'No se puede quitar el último superadministrador' using errcode = '55000';
    end if;
  end if;
  delete from public.user_roles where profile_id = p_profile and role_key = p_role;
  if not found then raise exception 'El usuario no tiene ese rol' using errcode = 'P0002'; end if;
  insert into audit.logs (actor_id, actor_kind, action, target_table, target_id, before_data)
  values (v_me, 'user', 'role.revoke', 'user_roles', p_profile::text, jsonb_build_object('role', p_role));
end;
$$;

-- ---------------------------------------------------------------------------
-- Reclamaciones de fichas, reportes, propuestas de IA, ajustes
-- ---------------------------------------------------------------------------
create or replace function public.admin_review_claim(p_claim uuid, p_decision text, p_reason text)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_me uuid := app.current_profile_id(); c public.business_claims%rowtype; v_org uuid;
begin
  perform app.require('businesses.review');
  select * into c from public.business_claims where id = p_claim for update;
  if not found then raise exception 'Reclamación no encontrada' using errcode = 'P0002'; end if;
  if c.state not in ('submitted','in_review','needs_info','appealed') then
    raise exception 'La reclamación ya fue resuelta' using errcode = '55000';
  end if;
  if c.claimant_id = v_me then
    raise exception 'No puedes resolver tu propia reclamación' using errcode = '42501';
  end if;
  if p_decision not in ('approve','reject','needs_info') or char_length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Decisión o motivo no válidos' using errcode = '22023';
  end if;

  if p_decision = 'approve' then
    if exists (select 1 from public.businesses where id = c.business_id and organization_id is not null) then
      raise exception 'La ficha ya tiene administrador' using errcode = '55000';
    end if;
    v_org := c.organization_id;
    if v_org is null then
      insert into public.organizations (kind, name, created_by)
      select 'business', b.name, c.claimant_id from public.businesses b where b.id = c.business_id
      returning id into v_org;
    end if;
    insert into public.organization_memberships (organization_id, profile_id, role, verified_at)
    values (v_org, c.claimant_id, 'owner', now()) on conflict (organization_id, profile_id) do update set role = 'owner', verified_at = now();
    update public.businesses set organization_id = v_org, listing_tier = 'claimed' where id = c.business_id;
  end if;

  update public.business_claims
     set state = case p_decision when 'approve' then 'approved'::public.claim_state
                                 when 'reject' then 'rejected'::public.claim_state
                                 else 'needs_info'::public.claim_state end,
         decision_reason = trim(p_reason), reviewer_id = v_me,
         decided_at = case when p_decision = 'needs_info' then null else now() end
   where id = p_claim;
  insert into audit.logs (actor_id, actor_kind, action, target_table, target_id, after_data)
  values (v_me, 'user', 'claim.' || p_decision, 'businesses', c.business_id::text,
          jsonb_build_object('claim_id', p_claim, 'claimant', c.claimant_id, 'reason', trim(p_reason)));
end;
$$;

create or replace function public.admin_dismiss_report(p_report uuid, p_reason text)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_me uuid := app.current_profile_id(); rep public.content_reports%rowtype;
begin
  perform app.require('community.moderate');
  if char_length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'Indica el motivo' using errcode = '22023'; end if;
  select * into rep from public.content_reports where id = p_report for update;
  if not found then raise exception 'Reporte no encontrado' using errcode = 'P0002'; end if;
  if rep.state in ('actioned','dismissed') then raise exception 'El reporte ya fue resuelto' using errcode = '55000'; end if;
  update public.content_reports set state = 'dismissed', resolved_by = v_me, resolution = trim(p_reason) where id = p_report;
  insert into public.moderation_actions (moderator_id, report_id, target_type, target_id, action, reason)
  values (v_me, p_report, rep.target_type, rep.target_id, 'dismiss', trim(p_reason));
  insert into audit.logs (actor_id, actor_kind, action, target_table, target_id, after_data)
  values (v_me, 'user', 'report.dismiss', 'content_reports', p_report::text, jsonb_build_object('reason', trim(p_reason)));
end;
$$;

create or replace function public.admin_review_ai_correction(p_id uuid, p_decision text, p_note text)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_me uuid := app.current_profile_id(); p public.ai_correction_proposals%rowtype; r app.admin_resources;
begin
  perform app.require('ai.review');
  select * into p from public.ai_correction_proposals where id = p_id for update;
  if not found then raise exception 'Propuesta no encontrada' using errcode = 'P0002'; end if;
  if p.state <> 'pending' then raise exception 'La propuesta ya fue revisada' using errcode = '55000'; end if;
  if p_decision not in ('approve','reject') or char_length(trim(coalesce(p_note, ''))) < 5 then
    raise exception 'Decisión o nota no válidas' using errcode = '22023';
  end if;

  if p_decision = 'approve' then
    select * into r from app.admin_resources where table_name = p.entity_table;
    if not found or p.field <> all (r.editable) then
      raise exception 'La propuesta toca un campo que no se puede editar: %.%', p.entity_table, p.field using errcode = '22023';
    end if;
    execute format('update public.%I set %I = (select %I from jsonb_populate_record(null::public.%I, $1)) where id = $2',
                   r.table_name, p.field, p.field, r.table_name)
      using jsonb_build_object(p.field, p.proposed_value), p.entity_id;
    if not found then raise exception 'El registro de la propuesta ya no existe' using errcode = 'P0002'; end if;
    perform app.record_revision(r.table_name, p.entity_id, 'Corrección de IA aprobada: ' || trim(p_note), 'ai_proposal_approved');
  end if;

  update public.ai_correction_proposals
     set state = case when p_decision = 'approve' then 'approved' else 'rejected' end,
         reviewed_by = v_me, reviewed_at = now(), review_note = trim(p_note)
   where id = p_id;
  insert into audit.logs (actor_id, actor_kind, action, target_table, target_id, after_data)
  values (v_me, 'user', 'ai_correction.' || p_decision, p.entity_table, p.entity_id::text,
          jsonb_build_object('field', p.field, 'proposed', p.proposed_value, 'note', trim(p_note)));
end;
$$;

create or replace function public.admin_set_setting(p_key text, p_value text)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_before text;
begin
  perform app.require('settings.manage');
  if p_key not in ('firebase_project_id', 'support_email', 'maintenance_message') then
    raise exception 'Ajuste no permitido: %', p_key using errcode = '22023';
  end if;
  select value into v_before from app.settings where key = p_key;
  insert into app.settings (key, value) values (p_key, p_value)
  on conflict (key) do update set value = excluded.value;
  insert into audit.logs (actor_id, actor_kind, action, target_table, target_id, before_data, after_data)
  values (app.current_profile_id(), 'user', 'setting.update', 'settings', p_key,
          jsonb_build_object('value', v_before), jsonb_build_object('value', p_value));
end;
$$;

-- ---------------------------------------------------------------------------
-- Panel: métricas reales (nunca contenido de mensajes)
-- ---------------------------------------------------------------------------
create or replace function public.ops_dashboard_metrics()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.is_staff() then
    raise exception 'Solo para el equipo' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'generated_at', now(),
    'users_active', (select count(*) from public.profiles where status = 'active'),
    'users_suspended', (select count(*) from public.profiles where status = 'suspended'),
    'businesses_published', (select count(*) from public.businesses where editorial = 'published'),
    'businesses_in_review', (select count(*) from public.businesses where editorial = 'in_review'),
    'verifications_pending', (select count(*) from public.verification_requests where state in ('submitted','in_review','needs_info','appealed')),
    'claims_pending', (select count(*) from public.business_claims where state in ('submitted','in_review','needs_info','appealed')),
    'reports_open', (select count(*) from public.content_reports where state in ('open','in_review','appealed')),
    'incidents_open', (select count(*) from public.incident_reports where state <> 'closed'),
    'incidents_urgent_open', (select count(*) from public.incident_reports where state <> 'closed' and is_urgent),
    'posts_7d', (select count(*) from public.posts where created_at > now() - interval '7 days'),
    'conversations_new_7d', (select count(*) from public.conversations where created_at > now() - interval '7 days'),
    'ai_corrections_pending', (select count(*) from public.ai_correction_proposals where state = 'pending'),
    'destinations_published', (select count(*) from public.destinations where editorial = 'published')
  );
end;
$$;

-- Permisos de ejecución: solo usuarios autenticados (cada función comprueba su permiso)
do $$
declare f text;
begin
  foreach f in array array[
    'public.admin_save_content(text, uuid, jsonb, boolean, text)',
    'public.admin_set_editorial(text, uuid, text, text)',
    'public.admin_delete_draft(text, uuid)',
    'public.admin_list(text, text, text, int, int)',
    'public.admin_set_user_status(uuid, text, text)',
    'public.admin_grant_role(uuid, text, timestamptz)',
    'public.admin_revoke_role(uuid, text)',
    'public.admin_review_claim(uuid, text, text)',
    'public.admin_dismiss_report(uuid, text)',
    'public.admin_review_ai_correction(uuid, text, text)',
    'public.admin_set_setting(text, text)',
    'public.ops_dashboard_metrics()'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
