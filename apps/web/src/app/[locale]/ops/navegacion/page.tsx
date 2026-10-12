'use client'; // Panel interactivo del Ops Center

import { useState } from 'react'; // Estado del periodo elegido
import { useOpsData } from '@/ops/useOps'; // Carga de datos con estados de carga y error

/** Forma del resumen que calcula la base de datos (ops_navigation_summary). */
type Resumen = {
  days: number; // Periodo consultado
  min_visits_shown: number; // Umbral de anonimato
  page_views: number; // Páginas vistas
  visits: number; // Visitas distintas
  top_paths: Array<{ path: string; views: number; visits: number }>; // Rutas más vistas
  by_locale: Record<string, number>; // Visitas por idioma
  by_platform: Record<string, number>; // Visitas por plataforma
  top_referrers: Array<{ host: string; visits: number }>; // Sitios de procedencia
};

const PERIODOS = [7, 30, 90]; // Periodos que se pueden elegir (días)

/** Resumen anónimo de navegación: solo datos de quienes aceptaron la medición. */
export default function Navegacion() {
  const [days, setDays] = useState(30); // Periodo elegido
  const { data, error, loading } = useOpsData<Resumen>(`/navigation?days=${days}`); // Pide el resumen a la API
  const max = Math.max(1, ...(data?.top_paths.map((p) => p.views) ?? [1])); // Mayor valor para escalar las barras

  return (
    <>
      <h1 className="m-0 font-display text-[36px] font-normal">Navegación</h1> {/* Título */}
      <p className="mt-2 max-w-[70ch] text-ink-muted">
        Solo cuenta a quienes aceptaron la medición. No hay nombres, correos ni IP, y se ocultan las filas con menos de 5 visitas para que nadie pueda aislar a una persona. Los datos se borran a los 90 días. {/* Explica el alcance */}
      </p>

      <fieldset className="my-5 flex flex-wrap gap-2 border-0 p-0">
        <legend className="visually-hidden">Periodo</legend> {/* Nombre del grupo para lectores de pantalla */}
        {PERIODOS.map((d) => (
          <button
            key={d} // Periodo
            type="button" // No envía formularios
            aria-pressed={days === d} // Indica cuál está elegido
            onClick={() => setDays(d)} // Cambia el periodo
            className={`h-11 rounded-pill border px-4 font-bold ${days === d ? 'border-oro bg-oro text-on-oro' : 'border-control-border text-ink'}`} // Resalta el elegido
          >
            Últimos {d} días {/* Texto del botón */}
          </button>
        ))}
      </fieldset>

      {error && <p role="alert" className="text-status-alert">{error}</p>} {/* Error real, sin ocultarlo */}
      {loading && !data && <p className="text-ink-muted">Cargando…</p>} {/* Mientras llega el resumen */}

      {data && (
        <>
          <dl className="m-0 flex flex-wrap gap-x-12 gap-y-4">
            <div>
              <dt className="text-ink-muted">Visitas</dt> {/* Etiqueta */}
              <dd className="m-0 font-display text-[40px]">{data.visits.toLocaleString('es-NI')}</dd> {/* Visitas distintas */}
            </div>
            <div>
              <dt className="text-ink-muted">Páginas vistas</dt> {/* Etiqueta */}
              <dd className="m-0 font-display text-[40px]">{data.page_views.toLocaleString('es-NI')}</dd> {/* Total de páginas */}
            </div>
          </dl>

          <h2 className="mt-8 font-display text-[24px] font-normal">Rutas más vistas</h2> {/* Sección */}
          {data.top_paths.length === 0 ? (
            <p className="text-ink-muted">Todavía no hay rutas con al menos {data.min_visits_shown} visitas en este periodo.</p> // Estado vacío honesto
          ) : (
            <ol className="m-0 list-none space-y-2 p-0">
              {data.top_paths.map((p) => (
                <li key={p.path} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1">
                  <code className="truncate text-[15px]">{p.path}</code> {/* Ruta */}
                  <span className="text-[15px] text-ink-muted">{p.views} vistas, {p.visits} visitas</span> {/* Números exactos */}
                  <span aria-hidden className="col-span-2 block h-2 rounded-pill bg-oro" style={{ width: `${(p.views / max) * 100}%` }} /> {/* Barra proporcional */}
                </li>
              ))}
            </ol>
          )}

          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {[
              { title: 'Por idioma', rows: Object.entries(data.by_locale) }, // Visitas por idioma
              { title: 'Por plataforma', rows: Object.entries(data.by_platform) }, // Web o Android
              { title: 'Sitios de procedencia', rows: data.top_referrers.map((r) => [r.host, r.visits] as [string, number]) }, // De dónde llegan
            ].map((g) => (
              <section key={g.title}>
                <h2 className="m-0 font-display text-[20px] font-normal">{g.title}</h2> {/* Título del grupo */}
                {g.rows.length === 0 ? (
                  <p className="text-ink-muted">Sin datos suficientes.</p> // Por debajo del umbral
                ) : (
                  <ul className="m-0 mt-2 list-none p-0">
                    {g.rows.map(([k, v]) => (
                      <li key={k} className="flex justify-between border-b border-line py-1.5">
                        <span>{k}</span> {/* Nombre */}
                        <span>{v}</span> {/* Visitas */}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}
