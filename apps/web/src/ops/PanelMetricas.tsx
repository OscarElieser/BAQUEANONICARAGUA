// Panel del Ops Center: tres tarjetas destacadas por área, un panel de tareas pendientes y todos los indicadores.
// Solo muestra cifras que devuelve la base (ops_dashboard_metrics); si una falta, muestra 0 y no inventa tendencias.
import Link from 'next/link'; // Enlaces a las secciones de trabajo

export type Metricas = Record<string, number | string>; // Respuesta del endpoint /ops/dashboard

const num = (m: Metricas, k: string) => Number(m[k] ?? 0); // Cifra de un indicador (0 si no vino)
const fmt = (v: number) => v.toLocaleString('es-NI'); // Número con separadores de Nicaragua

/** Áreas destacadas: un número principal y dos secundarios de la misma familia. */
const AREAS: Array<{ id: string; titulo: string; nota: string; principal: [string, string]; extra: Array<[string, string]>; tono: string }> = [
  { id: 'contenido', titulo: 'Contenido publicado', nota: 'Lo que ven los viajeros', principal: ['destinations_published', 'Destinos publicados'], extra: [['businesses_published', 'Negocios publicados'], ['businesses_in_review', 'Negocios en revisión']], tono: 'turquesa' },
  { id: 'moderacion', titulo: 'Moderación', nota: 'Lo que espera una persona del equipo', principal: ['reports_open', 'Reportes abiertos'], extra: [['incidents_open', 'Denuncias abiertas'], ['incidents_urgent_open', 'Denuncias urgentes']], tono: 'naranja' },
  { id: 'comunidad', titulo: 'Comunidad', nota: 'Últimos 7 días', principal: ['posts_7d', 'Publicaciones'], extra: [['conversations_new_7d', 'Conversaciones nuevas'], ['users_active', 'Usuarios activos']], tono: 'verde' },
  { id: 'viajeros', titulo: 'Viajeros (web y Android)', nota: 'Lo que guardan con su cuenta', principal: ['trips_total', 'Viajes guardados'], extra: [['favorites_total', 'Lugares guardados'], ['baqui_messages_24h', 'Mensajes a BAQÜI (24 h)']], tono: 'turquesa' },
];

/** Todos los indicadores, en la cuadrícula de abajo. */
const KPIS: Array<[string, string]> = [
  ['users_active', 'Usuarios activos'], // Cuentas activas
  ['businesses_published', 'Negocios publicados'], // Visibles al público
  ['businesses_in_review', 'Negocios en revisión'], // Esperando verificación
  ['verifications_pending', 'Verificaciones pendientes'], // Solicitudes sin revisar
  ['claims_pending', 'Reclamaciones pendientes'], // Dueños que reclaman su negocio
  ['reports_open', 'Reportes abiertos'], // Contenido denunciado
  ['incidents_open', 'Denuncias abiertas'], // Denuncias ambientales
  ['incidents_urgent_open', 'Denuncias urgentes'], // Marcadas como urgentes
  ['posts_7d', 'Publicaciones en 7 días'], // Actividad de la comunidad
  ['conversations_new_7d', 'Conversaciones nuevas en 7 días'], // Mensajería (solo la cifra)
  ['ai_corrections_pending', 'Propuestas de la IA'], // Correcciones que esperan revisión humana
  ['destinations_published', 'Destinos publicados'], // Catálogo visible
  ['territories_published', 'Territorios publicados'], // De los 17
  ['chronicles_7d', 'Crónicas en 7 días'], // Relatos de la comunidad
  ['trips_total', 'Viajes guardados'], // Mi aventura, web y Android
  ['favorites_total', 'Lugares guardados'], // Favoritos, web y Android
  ['baqui_messages_24h', 'Mensajes a BAQÜI en 24 h'], // Uso del asistente
  ['baqui_conversations_7d', 'Conversaciones con BAQÜI en 7 días'], // Conversaciones nuevas
];

export function PanelMetricas({ locale, data }: { locale: string; data: Metricas }) {
  const base = `/${locale}/ops`; // Raíz del Ops Center
  const pendientes: Array<[string, string, string]> = [
    ['verifications_pending', 'Verificaciones de negocios', `${base}/negocios`], // Revisar negocios
    ['incidents_open', 'Denuncias ambientales', `${base}/denuncias`], // Atender denuncias
    ['ai_corrections_pending', 'Propuestas de la IA', `${base}/ia`], // Revisar propuestas
  ]; // Tareas que llevan a su sección
  const totalPendiente = pendientes.reduce((s, [k]) => s + num(data, k), 0); // Suma de lo que espera revisión

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="m-0 text-sm text-ink-muted">
            {data.generated_at ? `Actualizado ${new Date(String(data.generated_at)).toLocaleString('es-NI')}` : 'Datos de la base'} {/* Cuándo se calcularon */}
          </p>
          <h1 className="ops-titulo">Panel</h1> {/* Título de la sección */}
        </div>
        <p className="m-0 text-sm text-ink-muted">Sin cifras estimadas ni tendencias inventadas.</p> {/* Principio del panel */}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(280px,1fr)]">
        <section aria-label="Áreas" className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {AREAS.map((a) => (
            <article key={a.id} className={`ops-tarjeta ops-tono-${a.tono}`}>
              <p className="m-0 text-[13px] text-ink-muted">{a.nota}</p> {/* Para qué sirve el área */}
              <h2 className="m-0 mt-1 text-[17px] font-bold">{a.titulo}</h2> {/* Nombre del área */}
              <p className="ops-cifra">{fmt(num(data, a.principal[0]))}</p> {/* Cifra principal */}
              <p className="m-0 text-sm text-ink-muted">{a.principal[1]}</p> {/* Qué cuenta */}
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4">
                {a.extra.map(([k, label]) => (
                  <div key={k}>
                    <dt className="text-[13px] text-ink-muted">{label}</dt> {/* Nombre del indicador */}
                    <dd className="m-0 text-[22px] font-bold tabular-nums">{fmt(num(data, k))}</dd> {/* Cifra */}
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </section>

        <aside aria-label="Pendiente de revisión" className="ops-tarjeta ops-destacada">
          <h2 className="m-0 text-[22px] font-bold">Pendiente de revisión</h2> {/* Título del panel */}
          <p className="m-0 mt-1 text-sm text-ink-muted">
            {totalPendiente === 0 ? 'Nada espera revisión ahora mismo.' : `${fmt(totalPendiente)} elementos esperan a una persona del equipo.`} {/* Resumen honesto */}
          </p>
          <ul className="m-0 mt-5 grid list-none gap-2 p-0">
            {pendientes.map(([k, label, href]) => (
              <li key={k}>
                <Link href={href} className="ops-pendiente">
                  <span>{label}</span> {/* Qué revisar */}
                  <span className="tabular-nums">{fmt(num(data, k))}</span> {/* Cuántos */}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <section aria-label="Todos los indicadores" className="mt-8">
        <h2 className="m-0 mb-3 text-[15px] font-bold text-ink-muted">Todos los indicadores</h2> {/* Título de la cuadrícula */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
          {KPIS.map(([key, label]) => (
            <div key={key} className="ops-tarjeta ops-mini">
              <div className="text-[28px] font-bold leading-none tabular-nums">{fmt(num(data, key))}</div> {/* Cifra */}
              <div className="mt-2 text-[14px] text-ink-muted">{label}</div> {/* Nombre */}
            </div>
          ))}
        </div>
      </section>
      <p className="mt-6 text-sm text-ink-muted">La mensajería solo aparece como cifra agregada: el Ops Center no permite leer conversaciones privadas.</p> {/* Privacidad */}
    </>
  );
}
