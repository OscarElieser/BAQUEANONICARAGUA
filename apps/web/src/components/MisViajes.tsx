'use client';
// "Mis viajes y lugares guardados": lo que la persona guardó con su cuenta (lo mismo que ve en la app Android).
import { useCallback, useEffect, useState } from 'react'; // Estado y efectos
import Link from 'next/link'; // Enlaces a las fichas
import { useSession } from '@/lib/useSession'; // Sesión de Firebase
import { borrarViaje, EVENTO_VIAJES, misFavoritos, misViajes, type Favorito, type Viaje } from '@/lib/viajes'; // Datos guardados
import { t, type MessageKey } from '@/i18n/t'; // Textos traducidos

export function MisViajes({ locale }: { locale: string }) {
  const sesion = useSession(); // Estado de la sesión
  const [viajes, setViajes] = useState<Viaje[] | null>(null); // Viajes (null = cargando)
  const [favs, setFavs] = useState<Favorito[]>([]); // Lugares guardados
  const [error, setError] = useState(false); // Si falló la lectura

  const cargar = useCallback(async () => {
    try {
      const [v, f] = await Promise.all([misViajes(), misFavoritos()]); // Lee ambos a la vez
      setViajes(v); // Viajes
      setFavs(f); // Favoritos
      setError(false); // Sin error
    } catch {
      setError(true); // Muestra el error
      setViajes([]); // Deja de cargar
    }
  }, []);

  useEffect(() => {
    if (sesion.status !== 'signed_in') return; // Solo con sesión
    cargar(); // Primera lectura
    window.addEventListener(EVENTO_VIAJES, cargar); // Recarga cuando se guarda algo
    return () => window.removeEventListener(EVENTO_VIAJES, cargar); // Deja de escuchar
  }, [sesion.status, cargar]);

  const fecha = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`)); // Fecha legible
  const dinero = (n: number, c: string) => new Intl.NumberFormat(locale, { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n); // Dinero con moneda

  return (
    <section aria-labelledby="mis-viajes" className="mt-14">
      <h2 id="mis-viajes" className="terr-grupo m-0 mb-4">{t(locale, 'trips.title')}</h2> {/* "Mis viajes y lugares guardados" */}
      {sesion.status === 'not_configured' && <p className="legal-tarjeta m-0">{t(locale, 'trips.off')}</p>} {/* Sin inicio de sesión en este entorno */}
      {sesion.status === 'loading' && <p className="text-ink-muted">{t(locale, 'common.loading')}…</p>} {/* Comprobando la sesión */}
      {sesion.status === 'signed_out' && (
        <p className="legal-tarjeta m-0">
          {t(locale, 'trips.sign_in')} <Link href={`/${locale}/cuenta`} className="font-bold text-accent">{t(locale, 'session.sign_in')}</Link> {/* Invita a entrar */}
        </p>
      )}
      {sesion.status === 'signed_in' && (
        <>
          {error && <p role="alert" className="text-status-alert">{t(locale, 'trips.error')}</p>} {/* Error de lectura */}
          {viajes === null && <p className="text-ink-muted">{t(locale, 'common.loading')}…</p>} {/* Cargando */}
          {viajes?.length === 0 && !error && <p className="text-ink-muted">{t(locale, 'trips.empty')}</p>} {/* Aún no hay viajes */}
          <ul className="viajes m-0 list-none p-0">
            {viajes?.map((v) => (
              <li key={v.id} className="legal-tarjeta">
                <h3 className="m-0 text-[19px] font-bold">{v.title}</h3> {/* Nombre del viaje */}
                <dl className="datos-generales m-0 mt-3">
                  <div><dt>{t(locale, 'planner.travelers')}</dt><dd>{v.travelers ?? <span className="text-oro-text">{t(locale, 'planner.not_given')}</span>}</dd></div> {/* Personas */}
                  <div><dt>{t(locale, 'trips.dates')}</dt><dd>{v.starts_on ? `${fecha(v.starts_on)}${v.ends_on ? ` – ${fecha(v.ends_on)}` : ''}` : <span className="text-oro-text">{t(locale, 'planner.not_given')}</span>}</dd></div> {/* Fechas */}
                  <div><dt>{t(locale, 'planner.budget')}</dt><dd>{v.budget_amount != null && v.budget_currency ? dinero(v.budget_amount, v.budget_currency) : <span className="text-oro-text">{t(locale, 'planner.not_given')}</span>}</dd></div> {/* Presupuesto */}
                  <div><dt>{t(locale, 'planner.interests')}</dt><dd>{v.interests.length ? v.interests.map((i) => t(locale, `interest.${i}` as MessageKey)).join(', ') : <span className="text-oro-text">{t(locale, 'planner.not_given')}</span>}</dd></div> {/* Intereses */}
                </dl>
                <button type="button" onClick={() => { if (confirm(t(locale, 'trips.delete_confirm'))) borrarViaje(v.id).catch(() => setError(true)); }} className="mt-4 min-h-[44px] rounded-pill border border-control-border px-5 font-bold text-ink">
                  {t(locale, 'trips.delete')} {/* Borra este viaje (pide confirmación) */}
                </button>
              </li>
            ))}
          </ul>
          <h3 className="mb-3 mt-8 text-[19px] font-bold">{t(locale, 'trips.saved_places')}</h3> {/* "Lugares guardados" */}
          {favs.length === 0 ? (
            <p className="text-ink-muted">{t(locale, 'trips.no_places')}</p> // Aún no guardó lugares
          ) : (
            <ul className="indice m-0 list-none p-0">
              {favs.map((f) => (
                <li key={f.id}>
                  <Link href={`/${locale}/${f.tipo === 'destino' ? 'destinos' : 'negocios'}/${f.slug}`} className="indice-fila" data-enlace="">
                    <span className="min-w-0 flex-1">
                      <span className="indice-nombre">{f.name}</span> {/* Nombre */}
                      <span className="indice-tipo">{t(locale, f.tipo === 'destino' ? 'search.destination' : 'search.business')}</span> {/* Tipo */}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
