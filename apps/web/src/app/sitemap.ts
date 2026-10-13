import type { MetadataRoute } from 'next'; // Tipo del archivo sitemap.xml
import { locales } from '@/i18n/config'; // Los 10 idiomas
import { legalSlugs } from '@/lib/legal'; // Páginas legales e institucionales
import { absolute, languageAlternates } from '@/lib/seo'; // Direcciones absolutas y versiones por idioma
import { publicDb } from '@/lib/territories'; // Lectura pública (solo contenido publicado)

export const revalidate = 3600; // Se regenera cada hora para incluir lo recién publicado

type Entry = { path: string; lastModified?: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }; // Página a declarar

/** Lee filas publicadas sin romper el sitemap si la base no responde (en ese caso solo salen las páginas fijas). */
async function rows(table: 'public_destinations' | 'public_businesses' | 'departments', columns: string): Promise<Array<Record<string, string>>> {
  const { data, error } = await publicDb().from(table).select(columns).limit(5000); // Máximo 5000 por tipo (50 000 direcciones con 10 idiomas)
  return error || !data ? [] : (data as unknown as Array<Record<string, string>>); // Filas o nada
}

/** sitemap.xml: cada página pública en los 10 idiomas, con sus versiones alternativas (hreflang). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed: Entry[] = [
    { path: '', priority: 1, changeFrequency: 'daily' }, // Inicio
    { path: '/mapa', priority: 0.8, changeFrequency: 'daily' }, // Mapa y búsqueda
    { path: '/territorios', priority: 0.9, changeFrequency: 'weekly' }, // Catálogo de los 17 territorios
    { path: '/comunidad', priority: 0.8, changeFrequency: 'daily' }, // Comunidad
    { path: '/cronicas', priority: 0.8, changeFrequency: 'daily' }, // Crónicas
    { path: '/cultura', priority: 0.7, changeFrequency: 'weekly' }, // Cultura
    { path: '/baqui', priority: 0.6, changeFrequency: 'monthly' }, // BAQÜI
    { path: '/ayuda', priority: 0.5, changeFrequency: 'monthly' }, // Centro de ayuda
    { path: '/creditos', priority: 0.2, changeFrequency: 'monthly' }, // Créditos de las fotos
    { path: '/mi-aventura', priority: 0.6, changeFrequency: 'monthly' }, // Planificador
    { path: '/comunidad/registrar', priority: 0.5, changeFrequency: 'monthly' }, // Registro de negocios
    ...legalSlugs.map((s) => ({ path: `/${s}`, priority: 0.3, changeFrequency: 'monthly' as const })), // Páginas legales
  ];
  const [territories, destinations, businesses] = await Promise.all([
    rows('departments', 'slug'), // Territorios publicados
    rows('public_destinations', 'slug, updated_at'), // Destinos publicados
    rows('public_businesses', 'slug, updated_at'), // Negocios publicados
  ]);
  const dynamic: Entry[] = [
    ...territories.map((t) => ({ path: `/territorios/${t.slug}`, priority: 0.9, changeFrequency: 'weekly' as const })), // Fichas de territorio
    ...destinations.map((d) => ({ path: `/destinos/${d.slug}`, lastModified: d.updated_at, priority: 0.8, changeFrequency: 'weekly' as const })), // Fichas de destino
    ...businesses.map((b) => ({ path: `/negocios/${b.slug}`, lastModified: b.updated_at, priority: 0.7, changeFrequency: 'weekly' as const })), // Fichas de negocio
  ];
  return [...fixed, ...dynamic].flatMap((e) =>
    locales.map((l) => ({
      url: absolute(l, e.path), // Dirección en este idioma
      lastModified: e.lastModified ? new Date(e.lastModified) : undefined, // Última actualización real (si se conoce)
      changeFrequency: e.changeFrequency, // Con qué frecuencia cambia
      priority: e.priority, // Importancia relativa dentro del sitio
      alternates: { languages: languageAlternates(e.path) }, // La misma página en los otros idiomas
    })),
  );
}
