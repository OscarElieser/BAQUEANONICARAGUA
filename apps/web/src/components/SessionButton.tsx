'use client'; // Componente interactivo del navegador

import Link from 'next/link'; // Enlaces internos sin recargar la página
import { useState } from 'react'; // Estado local
import { cerrarSesion } from '@/lib/auth'; // Función para cerrar sesión
import { useSession } from '@/lib/useSession'; // Estado de la sesión
import { t } from '@/i18n/t'; // Textos traducidos

/** Botón de la cabecera: "Iniciar sesión" o el nombre del usuario con "Cerrar sesión". */
export function SessionButton({ locale }: { locale: string }) {
  const session = useSession(); // Sesión actual
  const [open, setOpen] = useState(false); // Si el menú del usuario está abierto
  const [busy, setBusy] = useState(false); // Si estamos cerrando sesión

  if (session.status !== 'signed_in') {
    // Sin sesión (o cargando, o sin configurar) mostramos el enlace para entrar
    return (
      <Link
        href={`/${locale}/cuenta`} // Página de inicio de sesión
        className="flex h-11 items-center rounded-pill border border-oro px-[18px] text-[15px] font-bold text-ink no-underline" // Botón con borde dorado
      >
        {t(locale, 'session.sign_in')} {/* Texto del botón */}
      </Link>
    );
  }

  const name = session.user.displayName || session.user.email || t(locale, 'session.my_account'); // Nombre visible, o correo si no hay nombre

  async function salir() {
    setBusy(true); // Muestra que estamos cerrando
    try {
      await cerrarSesion(); // Cierra la sesión en Firebase
      setOpen(false); // Cierra el menú
    } finally {
      setBusy(false); // Vuelve al estado normal pase lo que pase
    }
  }

  return (
    <div className="relative">
      <button
        type="button" // No envía formularios
        onClick={() => setOpen((v) => !v)} // Abre o cierra el menú
        aria-expanded={open} // Indica a lectores de pantalla si está abierto
        aria-haspopup="menu" // Indica que abre un menú
        className="flex h-11 max-w-[220px] items-center gap-2 rounded-pill bg-ground-raised px-4 text-[15px] font-bold text-ink" // Estilo de botón
      >
        <span className="truncate">{name}</span> {/* Nombre recortado si es muy largo */}
      </button>
      {open && (
        // Menú desplegable del usuario
        <div role="menu" className="absolute right-0 z-10 mt-2 flex w-60 flex-col gap-1 rounded-m bg-ground-raised p-2 shadow-none ring-1 ring-line">
          {!session.user.emailVerified && (
            // Aviso si el correo aún no está verificado
            <p className="m-0 px-3 py-2 text-sm text-oro-text">{t(locale, 'session.unverified')}</p>
          )}
          <Link role="menuitem" href={`/${locale}/cuenta`} onClick={() => setOpen(false)} className="rounded-[12px] px-3 py-2 text-ink no-underline hover:bg-ground">
            {t(locale, 'session.my_account')} {/* Enlace a la página de la cuenta */}
          </Link>
          <Link role="menuitem" href={`/${locale}/mensajes`} onClick={() => setOpen(false)} className="rounded-[12px] px-3 py-2 text-ink no-underline hover:bg-ground">
            {t(locale, 'session.messages')} {/* Enlace a la bandeja */}
          </Link>
          <button
            role="menuitem" // Elemento del menú
            type="button" // No envía formularios
            onClick={salir} // Cierra la sesión
            disabled={busy} // Evita doble clic
            className="rounded-[12px] px-3 py-2 text-left font-bold text-status-alert hover:bg-ground disabled:opacity-45" // Estilo de acción de salida
          >
            {busy ? t(locale, 'session.signing_out') : t(locale, 'session.sign_out')} {/* Texto según el estado */}
          </button>
        </div>
      )}
    </div>
  );
}
