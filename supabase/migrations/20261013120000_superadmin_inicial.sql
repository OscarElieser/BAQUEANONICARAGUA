-- Superadministrador inicial (pedido del dueño, 13 de octubre de 2026).
-- La primera vez que la cuenta del dueño inicia sesión con su correo ya verificado, la función del servidor
-- "preparar-sesion" llama a public.session_bootstrap_superadmin y esa cuenta recibe el rol superadmin.
-- Sirve una sola vez: si ya existe un superadministrador o la marca ya se usó, no hace nada.
-- Cada uso queda en audit.logs. Ningún cliente (web o Android) puede llamarla: solo service_role.
-- El repositorio es público, así que el correo no se escribe aquí: se guarda solo su huella SHA-256
-- (del correo en minúsculas y sin espacios). Para cambiar de dueño se usa el Ops Center (admin_grant_role).

insert into app.settings (key, value) -- Marca de un solo uso con la huella del correo del dueño
values ('superadmin_inicial_sha256', '37daaee11e3a1a3c063d1f959cec797485506aa51f9d612c0ca8b83f1c3051b5') -- SHA-256 del correo que dio el dueño
on conflict (key) do nothing; -- Si ya existe, se deja como está

create or replace function public.session_bootstrap_superadmin(p_firebase_uid text, p_email text, p_email_verified boolean)
returns boolean -- true solo si en esta llamada se otorgó el rol
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_huella text; -- Huella guardada en la marca
  v_perfil uuid; -- Perfil de la cuenta que acaba de iniciar sesión
begin
  if p_email_verified is not true or coalesce(btrim(p_email), '') = '' then -- Solo cuentan correos verificados por Firebase
    return false; -- Sin correo verificado no hay nada que revisar
  end if;
  select value into v_huella from app.settings where key = 'superadmin_inicial_sha256' for update; -- Lee la marca y la bloquea (dos inicios a la vez no la usan dos veces)
  if v_huella is null then -- La marca ya se usó o nunca existió
    return false; -- No hace nada
  end if;
  if encode(pg_catalog.sha256(convert_to(lower(btrim(p_email)), 'UTF8')), 'hex') <> v_huella then -- Compara la huella del correo con la guardada
    return false; -- No es la cuenta del dueño
  end if;
  if exists (select 1 from public.user_roles where role_key = 'superadmin') then -- Ya hay un superadministrador
    return false; -- El arranque solo sirve cuando no hay ninguno
  end if;
  select id into v_perfil from public.profiles where firebase_uid = p_firebase_uid and status = 'active'; -- Perfil activo de esa cuenta
  if v_perfil is null then -- Sin perfil activo (suspendido, eliminado o inexistente)
    return false; -- No se otorga nada
  end if;
  insert into public.user_roles (profile_id, role_key) -- Otorga el rol superadmin
  values (v_perfil, 'superadmin') -- Sin "granted_by": lo otorga el sistema
  on conflict (profile_id, role_key) do nothing; -- Si ya lo tenía, no duplica
  insert into audit.logs (actor_id, actor_kind, action, target_table, target_id, after_data) -- Deja constancia en la auditoría
  values (null, 'system', 'role.bootstrap', 'user_roles', v_perfil::text, -- Lo hizo el sistema sobre ese perfil
          jsonb_build_object('role', 'superadmin', 'via', 'preparar-sesion', 'regla', 'correo verificado del dueño')); -- Qué rol, por dónde y con qué regla
  delete from app.settings where key = 'superadmin_inicial_sha256'; -- Consume la marca: no se puede volver a usar
  return true; -- Rol otorgado
end;
$$;
revoke execute on function public.session_bootstrap_superadmin(text, text, boolean) from public, anon, authenticated; -- Ningún cliente puede llamarla
grant execute on function public.session_bootstrap_superadmin(text, text, boolean) to service_role; -- Solo la función del servidor (clave de servicio)
