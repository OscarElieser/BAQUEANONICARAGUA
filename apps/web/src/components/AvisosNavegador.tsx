'use client';
// Avisos de este navegador, dentro de la cuenta. Dice la verdad en cada estado: no se puede aquí, bloqueado,
// apagado o activado. Al activarlo, el navegador pide permiso y el token queda guardado en la cuenta.
import { useEffect, useState } from 'react'; // Estado y efecto al cargar
import { activarAvisos, apagarAvisos, estadoAvisos, type EstadoAvisos } from '@/lib/avisos'; // Avisos con Firebase
import { t } from '@/i18n/t'; // Textos traducidos

export function AvisosNavegador({ locale }: { locale: string }) {
  const [estado, setEstado] = useState<EstadoAvisos | null>(null); // null mientras revisa el navegador
  const [ocupado, setOcupado] = useState(false); // Si está activando o apagando
  const [fallo, setFallo] = useState(false); // Si la última acción falló

  useEffect(() => {
    estadoAvisos().then(setEstado).catch(() => setEstado('no_soportado')); // Revisa una vez al abrir
  }, []); // Solo al montar

  async function cambiar(accion: () => Promise<EstadoAvisos>) {
    setOcupado(true); // Bloquea el botón
    setFallo(false); // Limpia el error anterior
    try {
      setEstado(await accion()); // Nuevo estado real
    } catch {
      setFallo(true); // Error claro abajo
    } finally {
      setOcupado(false); // Libera el botón
    }
  }

  const activado = estado === 'activado'; // Si ya recibe avisos
  return (
    <section aria-labelledby="avisos-titulo" className="flex flex-col gap-3 rounded-m border border-line bg-ground-raised p-4">
      <h3 id="avisos-titulo" className="m-0 text-base font-bold">{t(locale, 'avisos.title')}</h3> {/* Título */}
      <p className="m-0 text-[14px] leading-[21px] text-ink-muted">{t(locale, 'avisos.text')}</p> {/* Para qué sirven */}
      {estado === null && <p className="m-0 text-[14px] text-ink-muted">{t(locale, 'common.loading')}…</p>} {/* Revisando */}
      {estado === 'no_soportado' && <p className="m-0 text-[14px]">{t(locale, 'avisos.unsupported')}</p>} {/* No se puede aquí */}
      {estado === 'bloqueado' && <p role="status" className="m-0 text-[14px] text-oro-text">{t(locale, 'avisos.blocked')}</p>} {/* Cómo desbloquearlos */}
      {activado && <p role="status" className="m-0 text-[14px] font-bold text-status-verified">{t(locale, 'avisos.on')}</p>} {/* Confirmación */}
      {(estado === 'apagado' || activado) && (
        <button type="button" disabled={ocupado} onClick={() => cambiar(activado ? apagarAvisos : activarAvisos)}
          className={activado ? 'h-11 self-start rounded-pill border-[1.5px] border-control-border px-5 font-bold disabled:opacity-45' : 'boton-marca self-start disabled:opacity-60'}>
          {ocupado ? t(locale, 'avisos.working') : activado ? t(locale, 'avisos.disable') : t(locale, 'avisos.enable')} {/* Acción según el estado */}
        </button>
      )}
      {fallo && <p role="alert" className="m-0 text-[14px] text-status-alert">{t(locale, 'avisos.error')}</p>} {/* Error claro */}
    </section>
  );
}
