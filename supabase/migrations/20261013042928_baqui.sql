-- 0018 · BAQÜI, el asistente de BAQUEANO (proveedor elegido por el dueño: Google Gemini).
-- La función de Supabase "baqui" llama al modelo con la clave del servidor (nunca en web ni Android).
-- Aquí van las dos funciones de base de datos que usa: abrir el turno (con la sesión de la persona) y guardar la respuesta (solo el servidor).

-- Abre un turno de conversación: comprueba la sesión, limita el uso y guarda el mensaje de la persona.
create or replace function public.baqui_start(p_message text, p_locale text default 'es', p_conversation uuid default null) -- Mensaje, idioma y conversación (si ya existe)
returns jsonb -- Conversación, historial reciente y territorios publicados
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_me uuid := app.current_profile_id(); -- Perfil de quien escribe (del token de Firebase)
  v_conv uuid := p_conversation; -- Conversación a usar
  v_msg text := btrim(coalesce(p_message, '')); -- Mensaje sin espacios sobrantes
begin
  if v_me is null or not app.is_trusted_jwt() then -- Sin sesión válida no hay asistente
    raise exception 'Inicia sesión para hablar con BAQÜI' using errcode = '42501';
  end if;
  if char_length(v_msg) < 1 or char_length(v_msg) > 2000 then -- Mensaje vacío o demasiado largo
    raise exception 'El mensaje debe tener entre 1 y 2000 caracteres' using errcode = '22023';
  end if;
  if (select count(*) from public.ai_messages m join public.ai_conversations c on c.id = m.conversation_id -- Mensajes propios
      where c.profile_id = v_me and m.role = 'user' and m.created_at > now() - interval '24 hours') >= 40 then -- en las últimas 24 horas
    raise exception 'Llegaste al límite de 40 mensajes por día con BAQÜI. Vuelve mañana.' using errcode = '54000';
  end if;
  if v_conv is null or not exists (select 1 from public.ai_conversations where id = v_conv and profile_id = v_me) then -- Conversación nueva o ajena
    insert into public.ai_conversations (profile_id, locale, title) values (v_me, coalesce(nullif(p_locale, ''), 'es'), left(v_msg, 80)) returning id into v_conv; -- Crea una propia
  end if;
  insert into public.ai_messages (conversation_id, role, content) values (v_conv, 'user', jsonb_build_object('text', v_msg)); -- Guarda lo que escribió
  update public.ai_conversations set updated_at = now() where id = v_conv; -- Marca actividad
  return jsonb_build_object(
    'conversation_id', v_conv, -- Conversación usada
    'history', coalesce((select jsonb_agg(jsonb_build_object('role', h.role, 'text', h.content->>'text') order by h.id) -- Últimos 12 mensajes, en orden
                         from (select id, role, content from public.ai_messages where conversation_id = v_conv and role in ('user','assistant') order by id desc limit 12) h), '[]'::jsonb),
    'territories', coalesce((select jsonb_agg(jsonb_build_object('name', d.name, 'kind', d.kind, 'capital', d.capital_name, 'source', s.title) order by d.name) -- Territorios publicados con su fuente
                             from public.departments d left join public.data_sources s on s.id = d.source_id where d.editorial = 'published'), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.baqui_start(text, text, uuid) from public, anon; -- Nadie sin sesión
grant execute on function public.baqui_start(text, text, uuid) to authenticated; -- Personas con sesión

-- Guarda la respuesta del modelo. Solo la llama el servidor (clave de servicio), nunca un cliente.
create or replace function public.baqui_reply(p_conversation uuid, p_text text, p_model text, p_input_tokens int, p_output_tokens int, p_cited jsonb default '[]'::jsonb, p_redacted text[] default '{}') -- Respuesta y sus datos
returns bigint -- Identificador del mensaje guardado
language plpgsql volatile security definer set search_path = '' as $$
declare v_id bigint; -- Mensaje nuevo
begin
  insert into public.ai_messages (conversation_id, role, content, cited_refs, model, input_tokens, output_tokens) -- Respuesta del asistente
  values (p_conversation, 'assistant', jsonb_build_object('text', p_text, 'prompt', 'assistant.system.v2', 'redacted', to_jsonb(p_redacted)), coalesce(p_cited, '[]'::jsonb), p_model, p_input_tokens, p_output_tokens)
  returning id into v_id; -- Guarda y devuelve su identificador
  return v_id; -- Identificador
end;
$$;
revoke execute on function public.baqui_reply(uuid, text, text, int, int, jsonb, text[]) from public, anon, authenticated; -- Ningún cliente puede escribir respuestas
grant execute on function public.baqui_reply(uuid, text, text, int, int, jsonb, text[]) to service_role; -- Solo el servidor
