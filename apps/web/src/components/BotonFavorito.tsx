'use client';
// Botón "Guardar" en las fichas de destino y negocio. Usa la tabla de favoritos (la misma que la app Android).
import { useEffect, useState } from 'react'; // Estado y efectos
import Link from 'next/link'; // Enlace a iniciar sesión
import { useSession } from '@/lib/useSession'; // Sesión de Firebase
import { alternarFavorito, esFavorito } from '@/lib/viajes'; // Guardado en Supabase
import { t } from '@/i18n/t'; // Textos traducidos

export function BotonFavorito({ locale, tipo, id }: { locale: string; tipo: 'destino' | 'negocio'; id: string }) {
  const sesion = useSession(); // Estado de la sesión
  const [guardado, setGuardado] = useState<boolean | null>(null); // null = todavía no se sabe
  const [error, setError] = useState(false); // Si falló

  useEffect(() => {
    if (sesion.status === 'signed_in') esFavorito(tipo, id).then(setGuardado).catch(() => setGuardado(false)); // Consulta el estado real
  }, [sesion.status, tipo, id]);

  if (sesion.status === 'not_configured') return null; // Sin inicio de sesión en este entorno
  if (sesion.status !== 'signed_in') return <Link href={`/${locale}/cuenta`} className="boton-contorno min-h-[44px]">{t(locale, 'fav.sign_in')}</Link>; // Pide entrar para guardar

  return (
    <span className="inline-flex flex-col">
      <button
        type="button" // No envía formularios
        aria-pressed={guardado === true} // Estado para lectores de pantalla
        disabled={guardado === null} // Mientras se consulta
        onClick={async () => {
          try {
            setGuardado(await alternarFavorito(tipo, id, guardado === true)); // Cambia y muestra el estado nuevo
            setError(false); // Sin error
          } catch {
            setError(true); // Error claro
          }
        }}
        className="boton-contorno min-h-[44px]"
      >
        {guardado ? t(locale, 'fav.saved') : t(locale, 'fav.save')} {/* "Guardado" / "Guardar" */}
      </button>
      {error && <span role="alert" className="mt-1 text-[13px] text-status-alert">{t(locale, 'trips.error')}</span>} {/* Error */}
    </span>
  );
}
