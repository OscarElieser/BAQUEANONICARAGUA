-- 0019 · El panel del Ops Center suma lo que hacen los viajeros en la web y en Android (mismas tablas en los dos).
-- Solo cifras agregadas: nunca el contenido de viajes, favoritos ni conversaciones con BAQÜI.

create or replace function public.ops_dashboard_metrics() -- Reemplaza la versión de la migración 0014 con más indicadores
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
    'baqui_conversations_7d', (select count(*) from public.ai_conversations where created_at > now() - interval '7 days') -- Conversaciones nuevas con BAQÜI
  );
end;
$$;
revoke execute on function public.ops_dashboard_metrics() from public, anon; -- Nadie sin sesión
grant execute on function public.ops_dashboard_metrics() to authenticated; -- Cada llamada comprueba que sea del equipo
