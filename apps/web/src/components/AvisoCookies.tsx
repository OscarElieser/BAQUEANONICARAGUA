'use client'; // Componente interactivo en el navegador

import Link from 'next/link'; // Enlace a la página de cookies
import { useEffect, useRef, useState } from 'react'; // Estado, efectos y referencia al panel
import { browserOptsOut, OPEN_EVENT, readConsent, saveConsent } from '@/lib/consent'; // Lógica del consentimiento
import { t } from '@/i18n/t'; // Textos traducidos

/**
 * Aviso de cookies. Aparece la primera vez y cuando se pide desde el pie de página.
 * Las dos opciones tienen el mismo peso visual: aceptar no es más fácil que rechazar.
 */
export function AvisoCookies({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false); // Si el aviso está visible
  const [medicion, setMedicion] = useState(false); // Estado del interruptor de medición
  const [gpc, setGpc] = useState(false); // Si el navegador pide no ser medido
  const panel = useRef<HTMLDivElement>(null); // Panel, para mover el foco a él al abrirlo

  useEffect(() => {
    const optOut = browserOptsOut(); // Señal de privacidad del navegador
    setGpc(optOut); // La recordamos para explicarla
    const saved = readConsent(); // Elección guardada
    if (!saved) setOpen(true); // Primera visita: preguntamos
    setMedicion(saved?.medicion === true && !optOut); // Refleja lo elegido (apagado si hay señal de privacidad)
    const reopen = () => {
      setMedicion(readConsent()?.medicion === true && !browserOptsOut()); // Muestra la elección actual
      setOpen(true); // Abre el panel
    };
    window.addEventListener(OPEN_EVENT, reopen); // Escucha el botón del pie de página
    return () => window.removeEventListener(OPEN_EVENT, reopen); // Deja de escuchar al desmontar
  }, []); // Solo al cargar

  useEffect(() => {
    if (open) panel.current?.focus(); // Al abrir, el foco va al panel para teclado y lectores de pantalla
  }, [open]); // Cada vez que se abre

  if (!open) return null; // Cerrado: no ocupa espacio

  const elegir = (valor: boolean) => {
    saveConsent(valor && !gpc); // Guarda la elección (nunca medición si hay señal de privacidad)
    setOpen(false); // Cierra el aviso
  };

  return (
    <div
      ref={panel} // Referencia para el foco
      role="dialog" // Es un cuadro de diálogo
      aria-modal="false" // No bloquea el resto de la página
      aria-labelledby="cookies-titulo" // Título del diálogo
      tabIndex={-1} // Puede recibir el foco sin estar en el orden de tabulación
      onKeyDown={(e) => e.key === 'Escape' && readConsent() && setOpen(false)} // Escape cierra solo si ya hay una elección guardada
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-[640px] rounded-m border border-line bg-ground-raised p-5 text-ink shadow-[0_12px_40px_rgba(7,28,27,0.35)] sm:p-6"
    >
      <h2 id="cookies-titulo" className="m-0 font-display text-[24px] font-normal">
        {t(locale, 'cookies.title')} {/* Título del aviso */}
      </h2>
      <p className="mt-2 text-[16px] leading-[25px] text-ink-muted">
        {t(locale, 'cookies.body')}{' '}
        <Link href={`/${locale}/cookies`}>{t(locale, 'cookies.details')}</Link> {/* Enlace al detalle */}
      </p>

      <label className="mt-4 flex items-start gap-3">
        <input
          type="checkbox" // Interruptor de la medición
          checked={medicion} // Estado actual
          disabled={gpc} // Bloqueado si el navegador pide no ser medido
          onChange={(e) => setMedicion(e.target.checked)} // Cambia el estado
          className="mt-1 h-5 w-5 accent-[var(--accent)]" // Tamaño cómodo y color del sistema
        />
        <span>
          <span className="font-bold">{t(locale, 'cookies.measure_name')}</span> {/* Nombre de la categoría */}
          <span className="block text-[15px] text-ink-muted">
            {gpc
              ? t(locale, 'cookies.gpc') // Explica por qué está bloqueado
              : t(locale, 'cookies.measure_desc')} {/* Explica para qué sirve */}
          </span>
        </span>
      </label>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => elegir(false)} className="h-[48px] flex-1 rounded-pill border border-control-border px-5 font-bold text-ink">
          {t(locale, 'cookies.only_needed')} {/* Rechaza la medición */}
        </button>
        <button type="button" onClick={() => elegir(medicion)} className="h-[48px] flex-1 rounded-pill border border-control-border px-5 font-bold text-ink">
          {t(locale, 'cookies.save')} {/* Guarda lo marcado en el interruptor */}
        </button>
      </div>
    </div>
  );
}
