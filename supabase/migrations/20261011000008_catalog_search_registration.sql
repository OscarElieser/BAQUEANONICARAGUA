-- 0008 · Búsqueda del catálogo, cercanía y flujo de alta/verificación de negocios
-- (secciones 6, 7 y escenario "Emprendedor" de la sección 30)

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm  with schema extensions;

-- unaccent no es IMMUTABLE; este envoltorio fija el diccionario para poder indexar.
create or replace function app.f_unaccent(text)
returns text language sql immutable parallel safe strict
set search_path = extensions, public
as $$ select unaccent('unaccent'::regdictionary, $1) $$;
grant execute on function app.f_unaccent(text) to anon, authenticated;

create index destinations_name_trgm on public.destinations
  using gin (app.f_unaccent(lower(name)) extensions.gin_trgm_ops);
create index businesses_name_trgm on public.businesses
  using gin (app.f_unaccent(lower(name)) extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Búsqueda pública
-- Orden justo: relevancia primero; a igual relevancia, rotación diaria determinista
-- (no favorece a quien paga ni a quien tiene más reseñas). Los patrocinados NO entran aquí:
-- se piden aparte y se muestran etiquetados.
-- ---------------------------------------------------------------------------
create or replace function public.search_catalog(
  q text default null,
  p_department smallint default null,
  p_category text default null,
  p_kind text default null,          -- 'destination' | 'business' | null (ambos)
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  kind text, id uuid, slug text, name text, summary text, department_id smallint,
  listing_tier public.listing_tier, verification public.verification_status, relevance real
)
language sql stable security definer set search_path = '' as $$
  with params as (
    select nullif(app.f_unaccent(lower(trim(q))), '') as term,
           least(greatest(coalesce(p_limit, 24), 1), 50) as lim,
           greatest(coalesce(p_offset, 0), 0) as off
  ),
  dest as (
    select 'destination'::text as kind, d.id, d.slug, d.name, d.summary, d.department_id,
           null::public.listing_tier as listing_tier, d.verification,
           case when p.term is null then 0::real
                else extensions.similarity(app.f_unaccent(lower(d.name)), p.term)
                     + case when app.f_unaccent(lower(d.name)) like '%' || p.term || '%' then 0.5 else 0 end
                     + case when app.f_unaccent(lower(coalesce(d.summary, ''))) like '%' || p.term || '%' then 0.2 else 0 end
           end::real as relevance
    from public.destinations d, params p
    where d.editorial = 'published' and d.archived_at is null
      and (p_kind is null or p_kind = 'destination')
      and (p_department is null or d.department_id = p_department)
      and (p_category is null or exists (
            select 1 from public.destination_category_links l
            join public.destination_categories c on c.id = l.category_id
            where l.destination_id = d.id and c.slug = p_category))
  ),
  biz as (
    select 'business'::text, b.id, b.slug, b.name, b.summary, b.department_id,
           b.listing_tier, null::public.verification_status,
           case when p.term is null then 0::real
                else extensions.similarity(app.f_unaccent(lower(b.name)), p.term)
                     + case when app.f_unaccent(lower(b.name)) like '%' || p.term || '%' then 0.5 else 0 end
                     + case when app.f_unaccent(lower(coalesce(b.summary, ''))) like '%' || p.term || '%' then 0.2 else 0 end
           end::real
    from public.businesses b, params p
    where b.editorial = 'published' and b.archived_at is null and not b.is_sponsored
      and (p_kind is null or p_kind = 'business')
      and (p_department is null or b.department_id = p_department)
      and (p_category is null or exists (
            select 1 from public.business_categories l
            join public.destination_categories c on c.id = l.category_id
            where l.business_id = b.id and c.slug = p_category))
  )
  select r.* from (select * from dest union all select * from biz) r, params p
  where p.term is null or r.relevance > 0.15
  order by round(r.relevance::numeric, 1) desc,
           md5(r.id::text || current_date::text)   -- rotación diaria
  limit (select lim from params) offset (select off from params);
$$;
grant execute on function public.search_catalog(text, smallint, text, text, int, int) to anon, authenticated;

-- Cercanía (PostGIS). Usa la ubicación PÚBLICA (respeta precisión aproximada/restringida).
create or replace function public.nearby_catalog(
  p_lat double precision, p_lng double precision, p_radius_km double precision default 10, p_limit int default 30
)
returns table (kind text, id uuid, slug text, name text, distance_km double precision, location_precision public.location_precision)
language sql stable security definer set search_path = '' as $$
  with origin as (
    select extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography as g
  ),
  candidates as (
    select 'destination'::text as kind, d.id, d.slug, d.name, d.location, d.location_precision
    from public.public_destinations d
    union all
    select 'business', b.id, b.slug, b.name, b.location, b.location_precision
    from public.public_businesses b where not b.is_sponsored
  )
  select c.kind, c.id, c.slug, c.name,
         round((extensions.ST_Distance(c.location::extensions.geography, o.g) / 1000)::numeric, 1)::double precision,
         c.location_precision
  from candidates c, origin o
  where c.location is not null
    and extensions.ST_DWithin(c.location::extensions.geography, o.g, least(greatest(p_radius_km, 0.5), 100) * 1000)
  order by 5
  limit least(greatest(p_limit, 1), 100);
$$;
grant execute on function public.nearby_catalog(double precision, double precision, double precision, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Alta de negocio por su dueño (Vitrina de Nuestra Gente)
-- Crea organización + membresía owner + negocio en revisión + solicitud de verificación.
-- El nivel de riesgo depende de la categoría (sección 7: no exigir lo mismo a todos).
-- ---------------------------------------------------------------------------
create or replace function app.slugify(p text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(app.f_unaccent(lower(p)), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function app.risk_for_categories(p_categories text[])
returns text language sql immutable as $$
  select case
    when p_categories && array['operadores','alojamiento','ecoalojamiento','hospedaje-familiar'] then 'high'
    when p_categories && array['restaurantes','comedores','cafeterias','turismo-rural','pesca-artesanal','cafe','cacao'] then 'standard'
    else 'low'
  end;
$$;

create or replace function public.register_business(
  p_name text,
  p_department smallint,
  p_categories text[],
  p_summary text default null,
  p_municipality uuid default null
)
returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_profile uuid := app.current_profile_id();
  v_org uuid;
  v_biz uuid;
  v_slug text;
  v_cat_ids smallint[];
begin
  if v_profile is null then
    raise exception 'Inicia sesión para registrar un negocio' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'El nombre del negocio es obligatorio' using errcode = '22023';
  end if;
  select array_agg(id) into v_cat_ids from public.destination_categories
  where slug = any(p_categories) and family in ('services', 'community', 'culture');
  if v_cat_ids is null then
    raise exception 'Elige al menos una categoría válida' using errcode = '22023';
  end if;
  -- Límite anti-abuso: 5 negocios en revisión por persona
  if (select count(*) from public.businesses b
      join public.organization_memberships m on m.organization_id = b.organization_id
      where m.profile_id = v_profile and m.role = 'owner' and b.editorial = 'in_review') >= 5 then
    raise exception 'Tienes 5 negocios en revisión; espera la respuesta antes de registrar otro' using errcode = '54000';
  end if;

  insert into public.organizations (kind, name, created_by)
  values ('business', trim(p_name), v_profile) returning id into v_org;
  insert into public.organization_memberships (organization_id, profile_id, role)
  values (v_org, v_profile, 'owner');

  v_slug := app.slugify(p_name) || '-' || substr(replace(v_org::text, '-', ''), 1, 6);
  insert into public.businesses (organization_id, slug, name, department_id, municipality_id, summary,
                                 listing_tier, editorial)
  values (v_org, v_slug, trim(p_name), p_department, p_municipality, nullif(trim(p_summary), ''),
          'claimed', 'in_review')
  returning id into v_biz;

  insert into public.business_categories (business_id, category_id)
  select v_biz, unnest(v_cat_ids);

  insert into public.verification_requests (subject_type, subject_id, requested_by, risk_level)
  values ('business', v_biz, v_profile, app.risk_for_categories(p_categories));

  insert into audit.logs (actor_id, actor_kind, action, target_table, target_id, after_data)
  values (v_profile, 'user', 'business.register', 'businesses', v_biz::text,
          jsonb_build_object('name', trim(p_name), 'department_id', p_department, 'categories', p_categories));
  return v_biz;
end;
$$;
revoke execute on function public.register_business(text, smallint, text[], text, uuid) from public, anon;
grant execute on function public.register_business(text, smallint, text[], text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Resolución de verificación (Ops Center). Requiere verifications.review.
-- approve: publica el negocio; con verified_scope no vacío queda "verificado",
-- sin él queda "reclamado" (publicado, administrado por su dueño).
-- ---------------------------------------------------------------------------
create or replace function public.review_business_verification(
  p_request uuid,
  p_decision text,                    -- 'approve' | 'reject' | 'needs_info'
  p_reason text,
  p_verified_scope text[] default '{}'
)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_reviewer uuid := app.current_profile_id();
  v_req public.verification_requests%rowtype;
  v_before jsonb;
begin
  if not app.has_permission('verifications.review') then
    raise exception 'Permisos insuficientes' using errcode = '42501';
  end if;
  if p_decision not in ('approve','reject','needs_info') then
    raise exception 'Decisión no válida' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Explica la decisión al solicitante' using errcode = '22023';
  end if;

  select * into v_req from public.verification_requests where id = p_request for update;
  if not found or v_req.subject_type <> 'business' then
    raise exception 'Solicitud no encontrada' using errcode = 'P0002';
  end if;
  if v_req.state not in ('submitted','in_review','needs_info','appealed') then
    raise exception 'La solicitud ya fue resuelta' using errcode = '55000';
  end if;
  if v_req.requested_by = v_reviewer then
    raise exception 'No puedes resolver tu propia solicitud' using errcode = '42501';
  end if;

  select to_jsonb(b) into v_before from public.businesses b where b.id = v_req.subject_id;

  update public.verification_requests
     set state = case p_decision when 'approve' then 'approved'::public.verification_state
                                  when 'reject' then 'rejected'::public.verification_state
                                  else 'needs_info'::public.verification_state end,
         reviewer_id = v_reviewer,
         decision_reason = trim(p_reason)
   where id = p_request;

  if p_decision = 'approve' then
    update public.businesses
       set editorial = 'published',
           listing_tier = case when cardinality(coalesce(p_verified_scope, '{}')) > 0
                               then 'verified'::public.listing_tier else 'claimed'::public.listing_tier end,
           verified_scope = coalesce(p_verified_scope, '{}'),
           verified_at = case when cardinality(coalesce(p_verified_scope, '{}')) > 0 then now() else null end
     where id = v_req.subject_id;
    update public.organization_memberships set verified_at = now()
     where organization_id = (select organization_id from public.businesses where id = v_req.subject_id)
       and profile_id = v_req.requested_by;
  elsif p_decision = 'reject' then
    update public.businesses set editorial = 'hidden' where id = v_req.subject_id;
  end if;

  insert into audit.logs (actor_id, actor_kind, action, target_table, target_id, before_data, after_data)
  select v_reviewer, 'user', 'business.verification.' || p_decision, 'businesses', v_req.subject_id::text,
         v_before, to_jsonb(b) || jsonb_build_object('reason', trim(p_reason))
  from public.businesses b where b.id = v_req.subject_id;
end;
$$;
revoke execute on function public.review_business_verification(uuid, text, text, text[]) from public, anon;
grant execute on function public.review_business_verification(uuid, text, text, text[]) to authenticated;
