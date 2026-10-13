'use client';
// Botón "Guardar en Mis viajes" debajo de lo que entendió el intérprete. Guarda solo los datos que la persona dio.
import { useState } from 'react'; // Estado del formulario
import Link from 'next/link'; // Enlace a iniciar sesión
import type { TripIntent } from '@nica/ai-core'; // Lo entendido
import { useSession } from '@/lib/useSession'; // Sesión de Firebase
import { guardarViaje } from '@/lib/viajes'; // Guardado en Supabase
import { t } from '@/i18n/t'; // Textos traducidos

type Props = { locale: string; intent: TripIntent; total: { amount: number; currency: 'NIO' | 'USD' } | null }; // Datos a guardar

export function GuardarViaje({ locale, intent, total }: Props) {
  const sesion = useSession(); // Estado de la sesión
  const [titulo, setTitulo] = useState(intent.days ? t(locale, 'trips.default_title_days', { n: intent.days }) : t(locale, 'trips.default_title')); // Nombre sugerido
  const [estado, setEstado] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle'); // Paso del guardado

  if (sesion.status === 'not_configured') return null; // Sin inicio de sesión en este entorno: no se ofrece
  if (sesion.status !== 'signed_in')
    return (
      <p className="mb-0 mt-5 text-[15px]">
        <Link href={`/${locale}/cuenta`} className="font-bold text-accent">{t(locale, 'session.sign_in')}</Link> {t(locale, 'trips.sign_in_to_save')} {/* Invita a entrar para guardar */}
      </p>
    );

  return (
    <form
      className="mt-5 flex flex-wrap items-end gap-2" // Fila con el nombre y el botón
      onSubmit={async (e) => {
        e.preventDefault(); // Sin recargar
        setEstado('saving'); // Guardando
        try {
          await guardarViaje(titulo, intent, total); // Guarda en Supabase
          setEstado('saved'); // Listo
        } catch {
          setEstado('error'); // Falló
        }
      }}
    >
      <label className="flex min-w-0 flex-[1_1_220px] flex-col gap-1 text-[14px] font-bold">
        {t(locale, 'trips.name')} {/* "Nombre del viaje" */}
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} required className="h-[48px] rounded-m border border-control-border bg-ground px-3 text-[16px] font-normal text-ink" /> {/* Nombre editable */}
      </label>
      <button type="submit" disabled={estado === 'saving' || estado === 'saved'} className="boton-marca min-h-[48px] disabled:opacity-60">
        {estado === 'saved' ? t(locale, 'trips.saved') : t(locale, 'trips.save')} {/* Guardar / Guardado */}
      </button>
      <p role="status" className="m-0 w-full text-[14px]">
        {estado === 'saved' && <span className="text-status-verified">{t(locale, 'trips.saved_note')}</span>} {/* Dónde verlo */}
        {estado === 'error' && <span className="text-status-alert">{t(locale, 'trips.error')}</span>} {/* Error claro */}
      </p>
    </form>
  );
}
