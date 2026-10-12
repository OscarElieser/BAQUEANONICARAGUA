/**
 * Definición única de los recursos editables del Ops Center.
 * La interfaz genera listas, filtros y formularios a partir de aquí.
 * DEBE coincidir con app.admin_resources (migración 0014): lo verifica
 * scripts/ops-resources.test.ts en CI. Sin dependencias para poder probarse con Node.
 */

export type FieldType =
  | 'text' | 'textarea' | 'markdown' | 'slug' | 'url' | 'email'
  | 'integer' | 'number' | 'boolean' | 'date' | 'datetime'
  | 'select' | 'department' | 'tags'
  | 'ref:municipality' | 'ref:source' | 'ref:artist' | 'ref:license' | 'ref:destination'
  | 'refs:source';

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  options?: Array<{ value: string; label: string }>;
  max?: number;
  min?: number;
}

export interface Resource {
  key: string;            // = app.admin_resources.resource
  label: string;          // plural, para títulos
  singular: string;       // para "Nuevo …"
  section: OpsSectionKey;
  titleField: string;     // columna que nombra cada fila
  columns: string[];      // columnas de la tabla de lista
  editorial: 'editorial' | 'review_state' | null;
  fields: Field[];
  publishNeedsSource?: boolean;
}

export type OpsSectionKey =
  | 'panel' | 'usuarios' | 'territorios' | 'destinos' | 'negocios' | 'comunidad' | 'denuncias'
  | 'ia' | 'cultura' | 'fuentes' | 'auditoria' | 'configuracion'
  | 'notificaciones' | 'traducciones' | 'seo';

const precision = [
  { value: 'approximate', label: 'Aproximada' },
  { value: 'exact', label: 'Exacta' },
  { value: 'restricted', label: 'Restringida' },
];

export const RESOURCES: Resource[] = [
  {
    key: 'destinations', label: 'Destinos', singular: 'destino', section: 'destinos', titleField: 'name',
    columns: ['name', 'department_id', 'editorial', 'verification', 'updated_at'], editorial: 'editorial', publishNeedsSource: true,
    fields: [
      { key: 'name', label: 'Nombre', type: 'text', required: true, max: 160 },
      { key: 'slug', label: 'Identificador en la URL', type: 'slug', required: true, help: 'Minúsculas y guiones' },
      { key: 'department_id', label: 'Territorio', type: 'department', required: true },
      { key: 'municipality_id', label: 'Municipio', type: 'ref:municipality' },
      { key: 'summary', label: 'Resumen', type: 'textarea', max: 400 },
      { key: 'description_md', label: 'Descripción', type: 'markdown' },
      { key: 'location_precision', label: 'Precisión de la ubicación', type: 'select', options: precision },
      { key: 'is_sensitive', label: 'Sitio sensible (nunca con ubicación exacta)', type: 'boolean' },
      { key: 'access_notes', label: 'Cómo llegar', type: 'textarea' },
      { key: 'safety_notes', label: 'Seguridad y restricciones', type: 'textarea' },
      { key: 'environmental_notes', label: 'Recomendaciones ambientales', type: 'textarea' },
      { key: 'accessibility', label: 'Accesibilidad comprobada', type: 'tags', help: 'Solo atributos verificados' },
      { key: 'source_id', label: 'Fuente', type: 'ref:source', help: 'Obligatoria para publicar' },
      { key: 'verification', label: 'Verificación', type: 'select', options: [
        { value: 'unverified', label: 'Sin verificar' }, { value: 'community_reported', label: 'Aportado por la comunidad' },
        { value: 'verified', label: 'Verificado' }, { value: 'outdated', label: 'Desactualizado' }, { value: 'disputed', label: 'En disputa' }] },
      { key: 'verified_at', label: 'Fecha de verificación', type: 'datetime' },
    ],
  },
  {
    key: 'businesses', label: 'Negocios', singular: 'negocio', section: 'negocios', titleField: 'name',
    columns: ['name', 'department_id', 'editorial', 'listing_tier', 'updated_at'], editorial: 'editorial',
    fields: [
      { key: 'name', label: 'Nombre', type: 'text', required: true, max: 160 },
      { key: 'department_id', label: 'Territorio', type: 'department', required: true },
      { key: 'municipality_id', label: 'Municipio', type: 'ref:municipality' },
      { key: 'destination_id', label: 'Destino relacionado', type: 'ref:destination' },
      { key: 'summary', label: 'Resumen', type: 'textarea', max: 500 },
      { key: 'description_md', label: 'Descripción', type: 'markdown' },
      { key: 'location_precision', label: 'Precisión de la ubicación', type: 'select', options: precision },
      { key: 'source_id', label: 'Fuente', type: 'ref:source' },
    ],
  },
  {
    key: 'territory_sections', label: 'Secciones de territorio', singular: 'sección', section: 'territorios', titleField: 'title',
    columns: ['title', 'department_id', 'section', 'locale', 'editorial'], editorial: 'editorial',
    fields: [
      { key: 'department_id', label: 'Territorio', type: 'department', required: true },
      { key: 'section', label: 'Sección', type: 'select', required: true, options: [
        ['overview', 'Presentación'], ['geography', 'Geografía'], ['history', 'Historia'], ['culture', 'Cultura y tradiciones'],
        ['gastronomy', 'Gastronomía'], ['peoples', 'Pueblos originarios'], ['nature', 'Sitios naturales'], ['heritage', 'Patrimonio'],
        ['festivities', 'Fiestas'], ['climate', 'Clima'], ['transport', 'Transporte'], ['routes', 'Rutas'], ['community', 'Comunidad'],
      ].map(([value, label]) => ({ value, label })) },
      { key: 'locale', label: 'Idioma', type: 'select', required: true, options: [
        'es', 'en', 'zh-Hans', 'ko', 'it', 'fr', 'pt', 'de', 'ru', 'ja'].map((v) => ({ value: v, label: v })) },
      { key: 'title', label: 'Título', type: 'text', required: true },
      { key: 'body_md', label: 'Contenido', type: 'markdown', required: true },
      { key: 'machine_translated', label: 'Traducción automática', type: 'boolean' },
      { key: 'source_ids', label: 'Fuentes', type: 'refs:source' },
      { key: 'verified_at', label: 'Fecha de verificación', type: 'datetime' },
    ],
  },
  {
    key: 'municipalities', label: 'Municipios', singular: 'municipio', section: 'territorios', titleField: 'name',
    columns: ['name', 'department_id', 'editorial'], editorial: 'editorial', publishNeedsSource: true,
    fields: [
      { key: 'name', label: 'Nombre oficial', type: 'text', required: true },
      { key: 'official_code', label: 'Código oficial', type: 'text', help: 'Según INIDE / INETER' },
      { key: 'source_id', label: 'Fuente', type: 'ref:source', required: true },
    ],
  },
  {
    key: 'data_sources', label: 'Fuentes', singular: 'fuente', section: 'fuentes', titleField: 'title',
    columns: ['title', 'publisher', 'review_state', 'confidence', 'available'], editorial: 'review_state',
    fields: [
      { key: 'title', label: 'Título', type: 'text', required: true },
      { key: 'publisher', label: 'Organismo o autor', type: 'text', required: true },
      { key: 'url', label: 'Dirección web', type: 'url' },
      { key: 'published_at', label: 'Fecha de publicación', type: 'date' },
      { key: 'accessed_at', label: 'Fecha de consulta', type: 'date', required: true },
      { key: 'license', label: 'Licencia de reutilización', type: 'text', required: true },
      { key: 'reuse_allowed', label: 'Permite reutilizar', type: 'boolean' },
      { key: 'confidence', label: 'Confianza (1 a 5)', type: 'integer', min: 1, max: 5 },
      { key: 'available', label: 'Sigue disponible', type: 'boolean' },
      { key: 'notes', label: 'Notas', type: 'textarea' },
    ],
  },
  {
    key: 'heritage_items', label: 'Patrimonio', singular: 'elemento', section: 'cultura', titleField: 'title',
    columns: ['title', 'kind', 'department_id', 'editorial'], editorial: 'editorial',
    fields: [
      { key: 'title', label: 'Título', type: 'text', required: true },
      { key: 'slug', label: 'Identificador en la URL', type: 'slug', required: true },
      { key: 'kind', label: 'Tipo', type: 'select', required: true, options: [
        ['site', 'Sitio'], ['building', 'Edificación'], ['craft', 'Artesanía'], ['dance', 'Danza'], ['music', 'Música'],
        ['cuisine', 'Gastronomía'], ['costume', 'Traje'], ['language', 'Lengua'], ['oral_tradition', 'Tradición oral'],
        ['festivity', 'Fiesta'], ['literature', 'Literatura'], ['visual_art', 'Artes visuales'], ['other', 'Otro'],
      ].map(([value, label]) => ({ value, label })) },
      { key: 'tangible', label: 'Patrimonio material', type: 'boolean' },
      { key: 'department_id', label: 'Territorio', type: 'department' },
      { key: 'summary', label: 'Resumen', type: 'textarea' },
      { key: 'body_md', label: 'Contenido', type: 'markdown' },
      { key: 'locale', label: 'Idioma', type: 'select', options: [{ value: 'es', label: 'es' }, { value: 'en', label: 'en' }] },
      { key: 'unesco_recognized', label: 'Reconocido por la UNESCO', type: 'boolean' },
      { key: 'community_knowledge', label: 'Conocimiento de una comunidad', type: 'boolean' },
      { key: 'community_consent_ref', label: 'Referencia del consentimiento comunitario', type: 'text', help: 'Obligatoria si es conocimiento comunitario' },
      { key: 'sensitive_topic', label: 'Tema sensible (exige segunda revisión)', type: 'boolean' },
      { key: 'source_ids', label: 'Fuentes', type: 'refs:source', help: 'Al menos una para publicar' },
      { key: 'verified_at', label: 'Fecha de verificación', type: 'datetime' },
    ],
  },
  {
    key: 'historical_events', label: 'Línea de tiempo', singular: 'hecho histórico', section: 'cultura', titleField: 'title',
    columns: ['title', 'era', 'start_year', 'editorial'], editorial: 'editorial',
    fields: [
      { key: 'title', label: 'Título', type: 'text', required: true },
      { key: 'era', label: 'Época', type: 'select', required: true, options: [
        ['prehispanic', 'Prehispánica'], ['colonial', 'Colonial'], ['republican', 'Republicana'], ['contemporary', 'Contemporánea'],
      ].map(([value, label]) => ({ value, label })) },
      { key: 'start_year', label: 'Año de inicio', type: 'integer', required: true, min: -10000, max: 2100 },
      { key: 'end_year', label: 'Año de fin', type: 'integer', min: -10000, max: 2100 },
      { key: 'date_precision', label: 'Precisión de la fecha', type: 'select', options: [
        ['day', 'Día'], ['month', 'Mes'], ['year', 'Año'], ['decade', 'Década'], ['century', 'Siglo'], ['approximate', 'Aproximada'],
      ].map(([value, label]) => ({ value, label })) },
      { key: 'department_id', label: 'Territorio', type: 'department' },
      { key: 'summary', label: 'Resumen', type: 'textarea' },
      { key: 'body_md', label: 'Contenido', type: 'markdown' },
      { key: 'locale', label: 'Idioma', type: 'select', options: [{ value: 'es', label: 'es' }, { value: 'en', label: 'en' }] },
      { key: 'contested', label: 'Tiene interpretaciones distintas', type: 'boolean' },
      { key: 'perspectives_md', label: 'Perspectivas', type: 'markdown', help: 'Obligatorio si tiene interpretaciones distintas' },
      { key: 'source_ids', label: 'Fuentes', type: 'refs:source' },
    ],
  },
  {
    key: 'artists', label: 'Artistas', singular: 'artista', section: 'cultura', titleField: 'name',
    columns: ['name', 'kind', 'department_id', 'editorial'], editorial: 'editorial',
    fields: [
      { key: 'name', label: 'Nombre', type: 'text', required: true },
      { key: 'slug', label: 'Identificador en la URL', type: 'slug', required: true },
      { key: 'kind', label: 'Tipo', type: 'select', required: true, options: [
        { value: 'person', label: 'Persona' }, { value: 'group', label: 'Agrupación' }, { value: 'ensemble', label: 'Conjunto' }] },
      { key: 'genres', label: 'Géneros', type: 'tags' },
      { key: 'instruments', label: 'Instrumentos', type: 'tags' },
      { key: 'department_id', label: 'Territorio', type: 'department' },
      { key: 'bio_md', label: 'Biografía', type: 'markdown' },
      { key: 'living', label: 'Vive', type: 'boolean' },
      { key: 'source_ids', label: 'Fuentes', type: 'refs:source' },
    ],
  },
  {
    key: 'music_works', label: 'Obras musicales', singular: 'obra', section: 'cultura', titleField: 'title',
    columns: ['title', 'year', 'genre', 'editorial'], editorial: 'editorial',
    fields: [
      { key: 'artist_id', label: 'Artista', type: 'ref:artist', required: true },
      { key: 'title', label: 'Título', type: 'text', required: true },
      { key: 'year', label: 'Año', type: 'integer', min: 1500, max: 2100 },
      { key: 'genre', label: 'Género', type: 'text' },
      { key: 'embed_url', label: 'Reproductor oficial', type: 'url', help: 'YouTube, Spotify, SoundCloud, Bandcamp o Internet Archive (enlace de inserción)' },
      { key: 'hosted_path', label: 'Audio alojado', type: 'text', help: 'Solo con licencia que permita alojar' },
      { key: 'license_id', label: 'Licencia', type: 'ref:license' },
    ],
  },
  {
    key: 'media_licenses', label: 'Licencias', singular: 'licencia', section: 'cultura', titleField: 'holder',
    columns: ['holder', 'license', 'allows_hosting', 'expires_on'], editorial: null,
    fields: [
      { key: 'license', label: 'Licencia', type: 'text', required: true, help: 'CC-BY-4.0, permiso-escrito, dominio-publico…' },
      { key: 'holder', label: 'Titular de derechos', type: 'text', required: true },
      { key: 'permission_ref', label: 'Referencia del permiso escrito', type: 'text' },
      { key: 'allows_hosting', label: 'Permite alojar el archivo', type: 'boolean' },
      { key: 'allows_commercial', label: 'Permite uso comercial', type: 'boolean' },
      { key: 'expires_on', label: 'Vence el', type: 'date' },
      { key: 'notes', label: 'Notas', type: 'textarea' },
    ],
  },
  {
    key: 'community_stories', label: 'Relatos comunitarios', singular: 'relato', section: 'cultura', titleField: 'title',
    columns: ['title', 'community_name', 'department_id', 'editorial'], editorial: 'editorial',
    fields: [
      { key: 'title', label: 'Título', type: 'text', required: true },
      { key: 'body_md', label: 'Relato', type: 'markdown', required: true },
      { key: 'community_name', label: 'Comunidad', type: 'text', required: true },
      { key: 'department_id', label: 'Territorio', type: 'department' },
      { key: 'teller_name', label: 'Quién lo cuenta', type: 'text', help: 'Puede quedar anónimo si así se pidió' },
      { key: 'teller_consent_at', label: 'Consentimiento de quien relata', type: 'datetime', required: true },
      { key: 'community_consent_ref', label: 'Consentimiento colectivo', type: 'text' },
      { key: 'locale', label: 'Idioma', type: 'select', options: [{ value: 'es', label: 'es' }, { value: 'en', label: 'en' }] },
    ],
  },
];

export interface OpsSection {
  key: OpsSectionKey;
  label: string;
  path: string | null;       // null = No disponible todavía
  permission?: string;
  resources?: string[];
}

export const SECTIONS: OpsSection[] = [
  { key: 'panel', label: 'Panel', path: '' },
  { key: 'usuarios', label: 'Usuarios', path: '/usuarios', permission: 'users.read' },
  { key: 'territorios', label: 'Territorios', path: '/r/territory_sections', resources: ['territory_sections', 'municipalities'] },
  { key: 'destinos', label: 'Destinos', path: '/r/destinations', resources: ['destinations'] },
  { key: 'negocios', label: 'Negocios', path: '/negocios', permission: 'businesses.review', resources: ['businesses'] },
  { key: 'comunidad', label: 'Comunidad', path: '/comunidad', permission: 'community.moderate' },
  { key: 'denuncias', label: 'Denuncias', path: '/denuncias', permission: 'reports.manage' },
  { key: 'ia', label: 'Inteligencia artificial', path: '/ia', permission: 'ai.review' },
  { key: 'cultura', label: 'Cultura y música', path: '/r/heritage_items',
    resources: ['heritage_items', 'historical_events', 'artists', 'music_works', 'media_licenses', 'community_stories'] },
  { key: 'fuentes', label: 'Fuentes y datos', path: '/r/data_sources', resources: ['data_sources'] },
  { key: 'auditoria', label: 'Auditoría', path: '/auditoria', permission: 'audit.read' },
  { key: 'configuracion', label: 'Configuración', path: '/configuracion', permission: 'settings.manage' },
  { key: 'notificaciones', label: 'Notificaciones', path: null },
  { key: 'traducciones', label: 'Traducciones', path: null },
  { key: 'seo', label: 'SEO', path: null },
];

export const EDITORIAL_LABEL: Record<string, string> = {
  draft: 'Borrador', in_review: 'En revisión', published: 'Publicado', hidden: 'Oculto', archived: 'Archivado',
};

export function resourceByKey(key: string): Resource | undefined {
  return RESOURCES.find((r) => r.key === key);
}
