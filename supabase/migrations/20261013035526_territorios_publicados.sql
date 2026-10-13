-- 0017 · Publicación de los 17 territorios con datos oficiales (aprobado por el dueño el 12 de octubre de 2026).
-- Solo se publican datos con fuente: nombre y código ISO 3166-2:NI, y la cabecera (o sede administrativa) que fija la Ley 59.
-- No se agregan textos, cifras ni descripciones: las secciones editoriales siguen vacías hasta tener fuente.
-- Vuelta atrás: update public.departments set editorial = 'draft', capital_name = null, source_id = null; (estado anterior en audit.logs).

-- Fuente 1: lista oficial de subdivisiones de Nicaragua (nombres y códigos).
insert into public.data_sources (id, title, publisher, url, accessed_at, license, reuse_allowed, confidence, review_state, notes) -- Registra la fuente
values ('00000000-0000-0000-0000-00000000a017', 'ISO 3166-2:NI — Subdivisiones de Nicaragua', 'Organización Internacional de Normalización (ISO)', -- Título y autor
        'https://www.iso.org/obp/ui/#iso:code:3166:NI', '2026-10-12', 'hechos-no-protegidos', true, 5, 'published', -- Dirección, fecha de consulta, licencia y confianza
        'Nombres y códigos de los 15 departamentos y las 2 regiones autónomas.') -- Qué se toma de aquí
on conflict (id) do nothing; -- Si ya existe, no la duplica

-- Fuente 2: ley que fija las cabeceras departamentales y las sedes de las regiones autónomas.
insert into public.data_sources (id, title, publisher, url, published_at, accessed_at, license, reuse_allowed, confidence, review_state, notes) -- Registra la fuente
values ('00000000-0000-0000-0000-00000000a018', 'Ley No. 59, Ley de División Política Administrativa (La Gaceta, 6 de octubre de 1989)', 'Asamblea Nacional de Nicaragua', -- Título y autor
        'https://sajurin.enriquebolanos.org/docs/G-1989-10-06.pdf', '1989-10-06', '2026-10-12', 'texto-legal-oficial', true, 5, 'published', -- Dirección, fechas, licencia y confianza
        'Cabeceras departamentales y sedes administrativas de las regiones autónomas. Los nombres actuales de las regiones (Costa Caribe Norte y Sur) vienen de la reforma constitucional de 2014.') -- Qué se toma de aquí
on conflict (id) do nothing; -- Si ya existe, no la duplica

-- Deja constancia en la auditoría del estado anterior de cada territorio, antes de cambiarlo.
insert into audit.logs (actor_kind, action, target_table, target_id, before_data, after_data) -- Un registro por territorio
select 'system', 'territory.publish', 'departments', d.id::text, -- Acción del sistema aprobada por el dueño
       jsonb_build_object('editorial', d.editorial, 'capital_name', d.capital_name, 'source_id', d.source_id), -- Cómo estaba
       jsonb_build_object('editorial', 'published', 'capital_name', c.cabecera, 'source_id', '00000000-0000-0000-0000-00000000a018') -- Cómo queda
from public.departments d -- Los 17
join (values ('boaco','Boaco'), ('carazo','Jinotepe'), ('chinandega','Chinandega'), ('chontales','Juigalpa'), ('esteli','Estelí'), ('granada','Granada'), ('jinotega','Jinotega'), ('leon','León'), ('madriz','Somoto'), ('managua','Managua'), ('masaya','Masaya'), ('matagalpa','Matagalpa'), ('nueva-segovia','Ocotal'), ('rio-san-juan','San Carlos'), ('rivas','Rivas'), ('costa-caribe-norte','Puerto Cabezas'), ('costa-caribe-sur','Bluefields')) as c(slug, cabecera) on c.slug = d.slug -- Cabeceras de la Ley 59
where d.editorial <> 'published'; -- Solo los que aún no estaban publicados

-- Completa la cabecera con su fuente y publica cada territorio.
update public.departments d -- Los 17 territorios
set capital_name = c.cabecera, -- Cabecera o sede administrativa según la Ley 59
    source_id = '00000000-0000-0000-0000-00000000a018', -- Fuente de la cabecera
    editorial = 'published', -- Visible para el público (RLS)
    updated_at = now() -- Fecha del cambio
from (values ('boaco','Boaco'), ('carazo','Jinotepe'), ('chinandega','Chinandega'), ('chontales','Juigalpa'), ('esteli','Estelí'), ('granada','Granada'), ('jinotega','Jinotega'), ('leon','León'), ('madriz','Somoto'), ('managua','Managua'), ('masaya','Masaya'), ('matagalpa','Matagalpa'), ('nueva-segovia','Ocotal'), ('rio-san-juan','San Carlos'), ('rivas','Rivas'), ('costa-caribe-norte','Puerto Cabezas'), ('costa-caribe-sur','Bluefields')) as c(slug, cabecera) -- Misma tabla de cabeceras
where c.slug = d.slug; -- Une por slug
