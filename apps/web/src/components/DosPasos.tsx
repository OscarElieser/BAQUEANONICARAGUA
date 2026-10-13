'use client';
// Verificación en dos pasos dentro de la cuenta: activarla con una app de autenticación o quitarla.
// La clave la genera Firebase; aquí solo se muestra para cargarla en la app y nunca se guarda en BAQUEANO.
import { useState, type FormEvent } from 'react'; // Estado y envío del formulario
import type { User } from 'firebase/auth'; // Persona con sesión
import { authErrorMessage } from '@/lib/auth'; // Errores traducidos
import { confirmarDosPasos, prepararDosPasos, quitarDosPasos, tieneDosPasos, type Preparacion } from '@/lib/dosPasos'; // Acciones de Firebase
import { t } from '@/i18n/t'; // Textos traducidos

export function DosPasos({ locale, user }: { locale: string; user: User }) {
  const [activa, setActiva] = useState(() => tieneDosPasos(user)); // Si la cuenta ya la tiene
  const [prep, setPrep] = useState<Preparacion | null>(null); // Clave en preparación (paso 1 y 2)
  const [ocupado, setOcupado] = useState(false); // Si hay una acción en curso
  const [error, setError] = useState<string | null>(null); // Error visible
  const [info, setInfo] = useState<string | null>(null); // Confirmación visible

  async function hacer(accion: () => Promise<void>, ok?: string) {
    setOcupado(true); // Bloquea botones
    setError(null); // Limpia el error anterior
    setInfo(null); // Limpia la confirmación anterior
    try {
      await accion(); // Ejecuta
      if (ok) setInfo(ok); // Confirma
    } catch (e) {
      setError(authErrorMessage(locale, e)); // Mensaje traducido
    } finally {
      setOcupado(false); // Libera botones
    }
  }

  function confirmar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); // Sin recargar la página
    const codigo = String(new FormData(e.currentTarget).get('codigo') ?? ''); // Código escrito
    hacer(async () => {
      await confirmarDosPasos(user, prep!, codigo); // Firebase comprueba el código y la activa
      setPrep(null); // Termina la preparación
      setActiva(true); // Ya está activa
    }, t(locale, 'dospasos.done')); // Explica qué cambia desde ahora
  }

  const boton = 'h-11 self-start rounded-pill border-[1.5px] border-control-border px-5 font-bold disabled:opacity-45'; // Botón de contorno
  return (
    <section aria-labelledby="dospasos-titulo" className="flex flex-col gap-3 rounded-m border border-line bg-ground-raised p-4">
      <h3 id="dospasos-titulo" className="m-0 text-base font-bold">{t(locale, 'dospasos.title')}</h3> {/* Título */}
      <p className="m-0 text-[14px] leading-[21px] text-ink-muted">{t(locale, 'dospasos.text')}</p> {/* Para qué sirve */}

      {activa && !prep && (
        // Ya activada: se puede quitar
        <>
          <p role="status" className="m-0 text-[14px] font-bold text-status-verified">{t(locale, 'dospasos.on')}</p> {/* Estado */}
          <button type="button" disabled={ocupado} className={boton}
            onClick={() => hacer(async () => { await quitarDosPasos(user); setActiva(false); }, t(locale, 'dospasos.removed'))}>
            {t(locale, 'dospasos.disable')} {/* Quitarla */}
          </button>
        </>
      )}

      {!activa && !prep && (
        // Sin activar: primero hay que tener el correo verificado
        user.emailVerified ? (
          <button type="button" disabled={ocupado} className="boton-marca self-start disabled:opacity-60"
            onClick={() => hacer(async () => setPrep(await prepararDosPasos(user)))}>
            {ocupado ? t(locale, 'avisos.working') : t(locale, 'dospasos.enable')} {/* Empezar */}
          </button>
        ) : (
          <p className="m-0 text-[14px] text-oro-text">{t(locale, 'dospasos.err.verify_email')}</p> // Firebase lo exige
        )
      )}

      {prep && (
        // Pasos para cargar la clave en la app y confirmar
        <form onSubmit={confirmar} className="flex flex-col gap-3">
          <p className="m-0 text-[14px]">{t(locale, 'dospasos.step_key')}</p> {/* Paso 1 */}
          <p className="m-0 select-all rounded-m bg-ground px-3 py-2 font-mono text-[15px] tracking-wider">{prep.clave}</p> {/* Clave en grupos de 4 */}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={boton}
              onClick={() => navigator.clipboard?.writeText(prep.secreto.secretKey).then(() => setInfo(t(locale, 'dospasos.copied'))).catch(() => {})}>
              {t(locale, 'dospasos.copy')} {/* Copiar la clave */}
            </button>
            <a href={prep.enlace} className={`${boton} inline-flex items-center text-ink no-underline`}>{t(locale, 'dospasos.open_app')}</a> {/* En el teléfono abre la app directamente */}
          </div>
          <label className="flex flex-col gap-1 text-[14px] font-bold">{t(locale, 'dospasos.step_code')}
            <input name="codigo" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} placeholder="000000"
              className="h-12 max-w-[200px] rounded-m border border-control-border bg-ground px-4 font-mono text-lg tracking-[0.3em] text-ink" /> {/* Código de 6 dígitos */}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" disabled={ocupado} className="boton-marca disabled:opacity-60">{ocupado ? t(locale, 'avisos.working') : t(locale, 'dospasos.confirm')}</button> {/* Activar */}
            <button type="button" disabled={ocupado} className={boton} onClick={() => { setPrep(null); setError(null); }}>{t(locale, 'dospasos.cancel')}</button> {/* Volver */}
          </div>
        </form>
      )}

      {info && <p role="status" className="m-0 text-[14px] text-status-verified">{info}</p>} {/* Confirmación */}
      {error && <p role="alert" className="m-0 text-[14px] text-status-alert">{error}</p>} {/* Error claro */}
    </section>
  );
}
