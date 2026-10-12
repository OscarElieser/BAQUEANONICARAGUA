-- 0012 · Flujo de denuncias confidenciales (sección 13)
-- Estados: recibida → en revisión → requiere información / derivada → resuelta → cerrada.
-- Una remisión a una institución solo cuenta como "transmitida" con acuse real.

create or replace function public.submit_incident(
  p_category text,
  p_description text,
  p_occurred_at timestamptz default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_department smallint default null,
  p_is_urgent boolean default false
)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_me uuid := app.current_profile_id();
  v_id uuid;
begin
  if v_me is null then
    raise exception 'Inicia sesión para enviar una denuncia' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_description, ''))) < 10 then
    raise exception 'Describe lo ocurrido con al menos 10 caracteres' using errcode = '22023';
  end if;
  if (select count(*) from public.incident_reports where reporter_id = v_me and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Alcanzaste el límite de 5 denuncias por día' using errcode = '54000';
  end if;

  insert into public.incident_reports (reporter_id, category, description, occurred_at, location, department_id, is_urgent)
  values (
    v_me, p_category, trim(p_description), p_occurred_at,
    case when p_lat is not null and p_lng is not null
         then extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326) end,
    p_department, coalesce(p_is_urgent, false)
  )
  returning id into v_id;

  insert into public.incident_events (incident_id, actor_id, event, to_state, visible_to_reporter, note)
  values (v_id, v_me, 'received', 'received', true, 'Denuncia recibida.');

  return jsonb_build_object(
    'id', v_id,
    'state', 'received',
    -- La plataforma no avisa a autoridades por sí sola; ante urgencia, orienta a canales oficiales
    'urgent_guidance', case when coalesce(p_is_urgent, false)
      then 'Si hay riesgo para la vida o la integridad de alguien, llama de inmediato a la Policía (118), Bomberos (115) o Cruz Roja (128). Esta plataforma no notifica a las autoridades por ti.'
      else null end
  );
end;
$$;
revoke execute on function public.submit_incident(text, text, timestamptz, double precision, double precision, smallint, boolean) from public, anon;
grant execute on function public.submit_incident(text, text, timestamptz, double precision, double precision, smallint, boolean) to authenticated;

create or replace function app.incident_transition_allowed(p_from public.incident_state, p_to public.incident_state)
returns boolean language sql immutable as $$
  select (p_from, p_to) in (
    ('received'::public.incident_state, 'in_review'::public.incident_state),
    ('received', 'closed'),
    ('in_review', 'needs_info'), ('in_review', 'referred'), ('in_review', 'resolved'), ('in_review', 'closed'),
    ('needs_info', 'in_review'), ('needs_info', 'closed'),
    ('referred', 'resolved'), ('referred', 'closed'),
    ('resolved', 'closed')
  );
$$;

create or replace function public.update_incident_state(
  p_incident uuid,
  p_to public.incident_state,
  p_note text,
  p_visible_to_reporter boolean default true
)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_me uuid := app.current_profile_id();
  v_from public.incident_state;
  v_reporter uuid;
begin
  if not app.has_permission('reports.manage') then
    raise exception 'Permisos insuficientes' using errcode = '42501';
  end if;
  select state, reporter_id into v_from, v_reporter from public.incident_reports where id = p_incident for update;
  if not found then raise exception 'Denuncia no encontrada' using errcode = 'P0002'; end if;
  if not app.incident_transition_allowed(v_from, p_to) then
    raise exception 'No se puede pasar de % a %', v_from, p_to using errcode = '55000';
  end if;
  if p_to = 'referred' and not exists (
    select 1 from public.incident_referrals where incident_id = p_incident and status = 'transmitted') then
    raise exception 'Para marcarla como derivada debe existir una remisión transmitida con acuse' using errcode = '55000';
  end if;
  if char_length(trim(coalesce(p_note, ''))) < 5 then
    raise exception 'Agrega una nota sobre el cambio' using errcode = '22023';
  end if;

  update public.incident_reports
     set state = p_to, assigned_to = coalesce(assigned_to, v_me)
   where id = p_incident;
  insert into public.incident_events (incident_id, actor_id, event, from_state, to_state, visible_to_reporter, note)
  values (p_incident, v_me, 'state_changed', v_from, p_to, coalesce(p_visible_to_reporter, true), trim(p_note));
  insert into audit.logs (actor_id, actor_kind, action, target_table, target_id, before_data, after_data)
  values (v_me, 'user', 'incident.state', 'incident_reports', p_incident::text,
          jsonb_build_object('state', v_from), jsonb_build_object('state', p_to));
  if coalesce(p_visible_to_reporter, true) then
    perform app.notify(v_reporter, 'incident_update', jsonb_build_object('incident_id', p_incident, 'state', p_to));
  end if;
end;
$$;
revoke execute on function public.update_incident_state(uuid, public.incident_state, text, boolean) from public, anon;
grant execute on function public.update_incident_state(uuid, public.incident_state, text, boolean) to authenticated;

-- El denunciante responde cuando se le pide información
create or replace function public.reply_incident(p_incident uuid, p_note text)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_me uuid := app.current_profile_id(); v_state public.incident_state;
begin
  select state into v_state from public.incident_reports where id = p_incident and reporter_id = v_me for update;
  if not found then raise exception 'Denuncia no encontrada' using errcode = 'P0002'; end if;
  if v_state <> 'needs_info' then
    raise exception 'Esta denuncia no está esperando información' using errcode = '55000';
  end if;
  if char_length(trim(coalesce(p_note, ''))) < 5 then
    raise exception 'Escribe la información solicitada' using errcode = '22023';
  end if;
  update public.incident_reports set state = 'in_review' where id = p_incident;
  insert into public.incident_events (incident_id, actor_id, event, from_state, to_state, visible_to_reporter, note)
  values (p_incident, v_me, 'info_provided', 'needs_info', 'in_review', true, trim(p_note));
end;
$$;
revoke execute on function public.reply_incident(uuid, text) from public, anon;
grant execute on function public.reply_incident(uuid, text) to authenticated;

-- Remisión: preparar exige consentimiento y canal documentado; transmitir exige acuse
create or replace function public.prepare_incident_referral(
  p_incident uuid, p_institution text, p_channel text, p_channel_doc_ref text, p_consent_at timestamptz
)
returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not app.has_permission('reports.manage') then
    raise exception 'Permisos insuficientes' using errcode = '42501';
  end if;
  if p_consent_at is null then
    raise exception 'Se necesita el consentimiento del denunciante' using errcode = '22023';
  end if;
  insert into public.incident_referrals (incident_id, institution, channel, channel_doc_ref, consent_at, created_by)
  values (p_incident, trim(p_institution), trim(p_channel), trim(p_channel_doc_ref), p_consent_at, app.current_profile_id())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.record_referral_transmission(p_referral uuid, p_succeeded boolean, p_receipt text)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_incident uuid;
begin
  if not app.has_permission('reports.manage') then
    raise exception 'Permisos insuficientes' using errcode = '42501';
  end if;
  update public.incident_referrals
     set status = case when p_succeeded then 'transmitted' else 'failed' end,
         transmitted_at = case when p_succeeded then now() end,
         transmission_receipt = case when p_succeeded then nullif(trim(p_receipt), '') end
   where id = p_referral and status = 'prepared'
   returning incident_id into v_incident;
  if v_incident is null then
    raise exception 'Remisión no encontrada o ya registrada' using errcode = 'P0002';
  end if;
  insert into public.incident_events (incident_id, actor_id, event, visible_to_reporter, note)
  values (v_incident, app.current_profile_id(), case when p_succeeded then 'referral_transmitted' else 'referral_failed' end,
          true, case when p_succeeded then 'Remitida a la institución con acuse ' || trim(p_receipt)
                     else 'No se pudo remitir a la institución. El caso sigue en revisión.' end);
end;
$$;
revoke execute on function public.prepare_incident_referral(uuid, text, text, text, timestamptz) from public, anon;
grant execute on function public.prepare_incident_referral(uuid, text, text, text, timestamptz) to authenticated;
revoke execute on function public.record_referral_transmission(uuid, boolean, text) from public, anon;
grant execute on function public.record_referral_transmission(uuid, boolean, text) to authenticated;
