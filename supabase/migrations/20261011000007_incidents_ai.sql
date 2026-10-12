-- 0007 · Denuncias confidenciales (sección 13) e IA supervisada (sección 9)

-- ---------------------------------------------------------------------------
-- Denuncias
-- ---------------------------------------------------------------------------
create type public.incident_state as enum
  ('received','in_review','needs_info','referred','resolved','closed');

create table public.incident_reports (
  id             uuid primary key default gen_random_uuid(),
  reporter_id    uuid not null references public.profiles(id),
  category       text not null check (category in ('pollution','environmental_damage','animal_abuse',
                   'tourism_irregularity','misleading_info','trail_risk','harassment','safety','other')),
  description    text not null check (char_length(description) between 10 and 8000),
  occurred_at    timestamptz,
  location       geometry(Point, 4326),               -- opcional y nunca público
  department_id  smallint references public.departments(id),
  is_urgent      boolean not null default false,      -- dispara protocolo y muestra canales oficiales
  state          public.incident_state not null default 'received',
  assigned_to    uuid references public.profiles(id),
  share_identity_with_authorities boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index incidents_state_idx on public.incident_reports(state, created_at);
create trigger incidents_touch before update on public.incident_reports
  for each row execute function app.touch_updated_at();

create table public.incident_evidence (
  id            uuid primary key default gen_random_uuid(),
  incident_id   uuid not null references public.incident_reports(id) on delete cascade,
  storage_path  text not null unique,                 -- bucket privado "incident-evidence"
  mime_type     text not null,
  sha256        text not null check (sha256 ~ '^[a-f0-9]{64}$'),   -- integridad de la evidencia
  uploaded_by   uuid not null references public.profiles(id),
  uploaded_at   timestamptz not null default now()
);

-- Línea de tiempo (trazabilidad): solo inserción
create table public.incident_events (
  id          bigint generated always as identity primary key,
  incident_id uuid not null references public.incident_reports(id) on delete cascade,
  actor_id    uuid references public.profiles(id),
  event       text not null,               -- 'state_changed', 'info_requested', 'note', 'referred'…
  from_state  public.incident_state,
  to_state    public.incident_state,
  visible_to_reporter boolean not null default true,
  note        text,
  created_at  timestamptz not null default now()
);

-- Remisión a instituciones: solo si existe canal válido, consentimiento y transmisión real
create table public.incident_referrals (
  id               uuid primary key default gen_random_uuid(),
  incident_id      uuid not null references public.incident_reports(id) on delete cascade,
  institution      text not null,                     -- p. ej. 'MARENA', 'INTUR'
  channel          text not null,                     -- canal documentado (correo oficial, formulario…)
  channel_doc_ref  text not null,                     -- referencia a la documentación del canal
  consent_at       timestamptz not null,              -- consentimiento del denunciante
  status           text not null default 'prepared' check (status in ('prepared','transmitted','failed')),
  transmitted_at   timestamptz,
  transmission_receipt text,                          -- acuse/ID devuelto por el canal
  created_by       uuid not null references public.profiles(id),
  created_at       timestamptz not null default now(),
  -- Nunca "transmitida" sin fecha y acuse reales
  constraint transmitted_needs_receipt check (
    status <> 'transmitted' or (transmitted_at is not null and transmission_receipt is not null))
);

-- ---------------------------------------------------------------------------
-- IA
-- ---------------------------------------------------------------------------
create table public.ai_prompt_versions (
  id          serial primary key,
  name        text not null,                         -- 'assistant.system', 'itinerary.planner'…
  version     int not null,
  content     text not null,
  created_by  uuid references public.profiles(id),
  activated_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (name, version)
);

create table public.ai_conversations (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  trip_id     uuid references public.trips(id) on delete set null,   -- memoria del viaje
  locale      text not null default 'es',
  title       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.ai_messages (
  id              bigint generated always as identity primary key,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant','tool')),
  content         jsonb not null,
  tool_name       text,
  -- Origen de cada recomendación (explicabilidad): ids de destinos/negocios/fuentes usados
  cited_refs      jsonb not null default '[]'::jsonb,
  prompt_version_id int references public.ai_prompt_versions(id),
  model           text,
  input_tokens    int,
  output_tokens   int,
  created_at      timestamptz not null default now()
);
create index ai_messages_conv_idx on public.ai_messages(conversation_id, id);

-- Memoria persistente consentida: el usuario la ve, edita y borra
create table public.ai_memories (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('preference','constraint','accessibility','interest')),
  content     text not null check (char_length(content) <= 500),
  consented_at timestamptz not null,
  source_conversation_id uuid references public.ai_conversations(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Conocimiento: solo contenido publicado entra al RAG
create table public.ai_knowledge_chunks (
  id           bigint generated always as identity primary key,
  entity_table text not null,
  entity_id    uuid not null,
  locale       text not null,
  chunk_index  int not null,
  content      text not null,
  embedding    vector(1536),
  source_id    uuid references public.data_sources(id),
  content_revision_id bigint references public.content_revisions(id),
  indexed_at   timestamptz not null default now(),
  unique (entity_table, entity_id, locale, chunk_index)
);
create index ai_chunks_embedding_idx on public.ai_knowledge_chunks using hnsw (embedding vector_cosine_ops);

create table public.ai_feedback (
  id          bigint generated always as identity primary key,
  message_id  bigint not null references public.ai_messages(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  rating      smallint not null check (rating in (-1, 1)),
  reason      text check (reason in ('incorrect','outdated','unsafe','unhelpful','helpful','other')),
  comment     text check (char_length(comment) <= 2000),
  created_at  timestamptz not null default now(),
  unique (message_id, profile_id)
);

-- Aprendizaje supervisado: la IA propone, un humano decide
create table public.ai_correction_proposals (
  id            uuid primary key default gen_random_uuid(),
  entity_table  text not null,
  entity_id     uuid not null,
  field         text not null,
  current_value jsonb,
  proposed_value jsonb not null,
  rationale     text not null,
  evidence      jsonb not null default '[]'::jsonb,   -- fuentes que respaldan la propuesta
  origin        text not null check (origin in ('ai','user_feedback')),
  state         text not null default 'pending' check (state in ('pending','approved','rejected')),
  reviewed_by   uuid references public.profiles(id),
  reviewed_at   timestamptz,
  review_note   text,
  created_at    timestamptz not null default now(),
  constraint decided_needs_reviewer check (state = 'pending' or (reviewed_by is not null and reviewed_at is not null))
);
create index ai_corrections_pending_idx on public.ai_correction_proposals(created_at) where state = 'pending';

create table public.ai_evaluations (
  id            bigint generated always as identity primary key,
  suite         text not null,                       -- 'hallucination', 'prompt_injection', 'itinerary_budget'…
  prompt_version_id int references public.ai_prompt_versions(id),
  model         text not null,
  passed        int not null,
  failed        int not null,
  report        jsonb not null,
  run_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.incident_reports       enable row level security;
alter table public.incident_evidence      enable row level security;
alter table public.incident_events        enable row level security;
alter table public.incident_referrals     enable row level security;
alter table public.ai_prompt_versions     enable row level security;
alter table public.ai_conversations       enable row level security;
alter table public.ai_messages            enable row level security;
alter table public.ai_memories            enable row level security;
alter table public.ai_knowledge_chunks    enable row level security;
alter table public.ai_feedback            enable row level security;
alter table public.ai_correction_proposals enable row level security;
alter table public.ai_evaluations         enable row level security;

-- Denuncias: denunciante + personal con reports.manage. Moderadores comunitarios NO.
create policy incidents_own on public.incident_reports for select to authenticated
  using (reporter_id = app.current_profile_id());
create policy incidents_insert on public.incident_reports for insert to authenticated
  with check (reporter_id = app.current_profile_id() and state = 'received' and assigned_to is null);
create policy incidents_staff on public.incident_reports for select to authenticated
  using (app.has_permission('reports.manage'));
-- Cambios de estado: API con reports.manage, registrando incident_events y audit.logs.

create policy evidence_own on public.incident_evidence for select to authenticated
  using (exists (select 1 from public.incident_reports r where r.id = incident_id and r.reporter_id = app.current_profile_id()));
create policy evidence_insert on public.incident_evidence for insert to authenticated
  with check (uploaded_by = app.current_profile_id() and exists (
    select 1 from public.incident_reports r where r.id = incident_id and r.reporter_id = app.current_profile_id()));
create policy evidence_staff on public.incident_evidence for select to authenticated
  using (app.has_permission('reports.manage'));

create policy events_own on public.incident_events for select to authenticated
  using (visible_to_reporter and exists (
    select 1 from public.incident_reports r where r.id = incident_id and r.reporter_id = app.current_profile_id()));
create policy events_staff on public.incident_events for select to authenticated
  using (app.has_permission('reports.manage'));

create policy referrals_own on public.incident_referrals for select to authenticated
  using (exists (select 1 from public.incident_reports r where r.id = incident_id and r.reporter_id = app.current_profile_id()));
create policy referrals_staff on public.incident_referrals for select to authenticated
  using (app.has_permission('reports.manage'));

-- IA
create policy ai_conv_own on public.ai_conversations for all to authenticated
  using (profile_id = app.current_profile_id()) with check (profile_id = app.current_profile_id());
create policy ai_msgs_own on public.ai_messages for select to authenticated
  using (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.profile_id = app.current_profile_id()));
-- Los mensajes de la IA los escribe solo la API.

create policy ai_mem_own on public.ai_memories for all to authenticated
  using (profile_id = app.current_profile_id())
  with check (profile_id = app.current_profile_id() and consented_at is not null);

create policy ai_feedback_own on public.ai_feedback for all to authenticated
  using (profile_id = app.current_profile_id()) with check (profile_id = app.current_profile_id());

create policy ai_corrections_staff on public.ai_correction_proposals for select to authenticated
  using (app.has_permission('ai.review'));
create policy ai_prompts_staff on public.ai_prompt_versions for select to authenticated
  using (app.has_permission('ai.review'));
create policy ai_evals_staff on public.ai_evaluations for select to authenticated
  using (app.has_permission('ai.review') or app.has_permission('audit.read'));
-- ai_knowledge_chunks: sin políticas → solo la API (clave secreta) accede.

do $$
declare t text;
begin
  foreach t in array array['incident_reports','incident_evidence','incident_events','incident_referrals',
                           'ai_prompt_versions','ai_conversations','ai_messages','ai_memories',
                           'ai_knowledge_chunks','ai_feedback','ai_correction_proposals','ai_evaluations']
  loop
    execute format(
      'create policy trusted_issuer on public.%I as restrictive to authenticated using (app.is_trusted_jwt())', t);
  end loop;
end $$;
