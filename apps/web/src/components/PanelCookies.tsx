'use client';
// Panel de preferencias dentro de la página de cookies. Usa el mismo consentimiento real que el aviso (cookie nica_consentimiento).
import { useEffect, useState } from 'react'; // Estado y efectos
import { browserOptsOut, CONSENT_EVENT, readConsent, saveConsent } from '@/lib/consent'; // Lógica del consentimiento
import { t } from '@/i18n/t'; // Textos traducidos

export function PanelCookies({ locale }: { locale: string }) {
  const [medicion, setMedicion] = useState(false); // Interruptor de la medición
  const [gpc, setGpc] = useState(false); // Si el navegador pide no ser medido
  const [guardado, setGuardado] = useState(false); // Si se acaba de guardar

  useEffect(() => {
    const leer = () => {
      const optOut = browserOptsOut(); // Señal de privacidad del navegador
      setGpc(optOut); // La recuerda
      setMedicion(readConsent()?.medicion === true && !optOut); // Muestra lo elegido (apagado si hay señal)
    };
    leer(); // Al cargar
    window.addEventListener(CONSENT_EVENT, leer); // Si se cambia desde el aviso, se actualiza aquí
    return () => window.removeEventListener(CONSENT_EVENT, leer); // Deja de escuchar al salir
  }, []); // Solo una vez

  const guardar = (valor: boolean) => {
    saveConsent(valor && !gpc); // Guarda la elección real (nunca medición con señal de privacidad)
    setMedicion(valor && !gpc); // Refleja lo guardado
    setGuardado(true); // Muestra la confirmación
  };

  return (
    <section aria-labelledby="panel-cookies-t" className="legal-tarjeta">
      <h2 id="panel-cookies-t" className="m-0 text-[17px] font-bold">{t(locale, 'cookies.panel_title')}</h2> {/* "Tus preferencias" */}
      <div className="mt-4 flex items-start gap-3">
        <input type="checkbox" checked disabled aria-describedby="ck-nec" className="mt-1 h-5 w-5 accent-[var(--accent)]" aria-label={t(locale, 'cookies.needed_name')} /> {/* Necesarias: siempre activas */}
        <span>
          <span className="font-bold">{t(locale, 'cookies.needed_name')}</span> {/* Nombre */}
          <span id="ck-nec" className="block text-[14px] text-ink-muted">{t(locale, 'cookies.needed_desc')}</span> {/* Para qué sirven */}
        </span>
      </div>
      <label className="mt-4 flex items-start gap-3">
        <input type="checkbox" checked={medicion} disabled={gpc} onChange={(e) => { setMedicion(e.target.checked); setGuardado(false); }} className="mt-1 h-5 w-5 accent-[var(--accent)]" /> {/* Medición opcional */}
        <span>
          <span className="font-bold">{t(locale, 'cookies.measure_name')}</span> {/* Nombre */}
          <span className="block text-[14px] text-ink-muted">{gpc ? t(locale, 'cookies.gpc') : t(locale, 'cookies.measure_desc')}</span> {/* Para qué sirve o por qué está bloqueada */}
        </span>
      </label>
      <div className="mt-5 grid gap-2">
        <button type="button" onClick={() => guardar(medicion)} className="boton-marca w-full justify-center">{t(locale, 'cookies.save')}</button> {/* Guarda lo marcado */}
        <button type="button" onClick={() => guardar(false)} className="h-[48px] w-full rounded-pill border border-control-border px-5 font-bold text-ink">{t(locale, 'cookies.only_needed')}</button> {/* Solo necesarias */}
      </div>
      <p role="status" className="m-0 mt-3 min-h-[1.4em] text-[14px] text-status-verified">{guardado ? t(locale, 'cookies.saved') : ''}</p> {/* Confirmación */}
    </section>
  );
}
