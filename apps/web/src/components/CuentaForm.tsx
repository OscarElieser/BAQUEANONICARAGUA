'use client'; // Formulario interactivo del navegador

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'; // Estado local, efecto, tipo del evento de envío y del contenido
import type { MultiFactorResolver } from 'firebase/auth'; // Datos para completar el segundo paso
import {
  authErrorMessage, // Traduce los errores al idioma de la página
  cerrarSesion, // Cierra la sesión
  crearCuenta, // Crea una cuenta nueva
  entrarConCodigo, // Termina el inicio con el código de la app de autenticación
  EVENTO_SEGUNDO_PASO, // Aviso: volvió de Google y falta el código
  iniciarConGoogle, // Entra con Google
  iniciarSesion, // Entra con correo y contraseña
  recuperarContrasena, // Envía el correo de recuperación
  reenviarVerificacion, // Reenvía el correo de verificación
} from '@/lib/auth';
import { useSession } from '@/lib/useSession'; // Estado de la sesión
import { AvisosNavegador } from './AvisosNavegador'; // Avisos de este navegador
import { DosPasos } from './DosPasos'; // Verificación en dos pasos
import { t } from '@/i18n/t'; // Textos traducidos

type Mode = 'entrar' | 'crear' | 'recuperar'; // Las tres vistas del formulario

const field = 'login-campo'; // Estilo común de los campos (vidrio con icono)

/** Iconos de línea para los campos: ayudan a reconocerlos de un vistazo (la etiqueta sigue visible). */
const ICONOS = {
  nombre: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0', // Persona
  correo: 'M3 6h18v12H3zM3 7l9 6 9-6', // Sobre
  clave: 'M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3', // Candado
} as const;

/** Campo con su icono a la izquierda. */
function ConIcono({ icono, children }: { icono: keyof typeof ICONOS; children: ReactNode }) {
  return (
    <span className="relative block">
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="login-icono">
        <path d={ICONOS[icono]} /> {/* Dibujo del icono */}
      </svg>
      {children} {/* El campo */}
    </span>
  );
}

export function CuentaForm({ locale }: { locale: string }) {
  const session = useSession(); // Sesión actual
  const [mode, setMode] = useState<Mode>('entrar'); // Vista elegida (empieza en "Iniciar sesión")
  const [busy, setBusy] = useState(false); // Si hay una operación en curso
  const [error, setError] = useState<string | null>(null); // Mensaje de error visible
  const [info, setInfo] = useState<string | null>(null); // Mensaje de confirmación visible
  const [segundoPaso, setSegundoPaso] = useState<MultiFactorResolver | null>(null); // Si la cuenta pidió el código de la app de autenticación

  useEffect(() => {
    const alVolver = (e: Event) => setSegundoPaso((e as CustomEvent<MultiFactorResolver>).detail); // Volvió de Google y falta el código
    window.addEventListener(EVENTO_SEGUNDO_PASO, alVolver); // Escucha el aviso
    return () => window.removeEventListener(EVENTO_SEGUNDO_PASO, alVolver); // Deja de escuchar al salir
  }, []); // Solo una vez

  /** Ejecuta una acción mostrando "procesando", errores claros y confirmaciones. */
  async function run(action: () => Promise<unknown>, ok?: string) {
    setBusy(true); // Bloquea botones mientras trabaja
    setError(null); // Limpia errores anteriores
    setInfo(null); // Limpia avisos anteriores
    try {
      await action(); // Ejecuta la acción pedida
      if (ok) setInfo(ok); // Muestra la confirmación si la hay
    } catch (e) {
      const pedido = e as { code?: string; resolver?: MultiFactorResolver }; // Error con posible segundo paso
      if (pedido.code === 'app/mfa-required' && pedido.resolver) setSegundoPaso(pedido.resolver); // La cuenta tiene dos pasos: se pide el código
      else setError(authErrorMessage(locale, e)); // Mensaje traducido según el código del error
    } finally {
      setBusy(false); // Libera los botones
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); // Evita que el navegador recargue la página
    const f = new FormData(e.currentTarget); // Lee los campos del formulario
    const email = String(f.get('email') ?? ''); // Correo escrito
    const password = String(f.get('password') ?? ''); // Contraseña escrita
    if (mode === 'entrar') run(() => iniciarSesion(email, password)); // Inicia sesión
    if (mode === 'crear') run(() => crearCuenta(String(f.get('name') ?? ''), email, password), t(locale, 'auth.created')); // Crea la cuenta
    if (mode === 'recuperar') run(() => recuperarContrasena(email), t(locale, 'auth.reset_sent')); // Envía recuperación sin revelar si el correo existe
  }

  if (session.status === 'not_configured') {
    // Firebase aún no está conectado en este entorno
    return <p className="login-aviso">{t(locale, 'auth.not_configured')}</p>; // Aviso honesto
  }
  if (session.status === 'loading') {
    // Todavía comprobamos si hay sesión
    return <p className="text-ink-muted">{t(locale, 'common.loading')}…</p>; // Comprobando la sesión
  }

  if (session.status === 'signed_in') {
    // Vista de la cuenta cuando ya hay sesión
    const u = session.user; // Usuario con sesión
    return (
      <section aria-labelledby="mi-cuenta" className="flex flex-col gap-4">
        <h2 id="mi-cuenta" className="m-0 text-[20px] font-bold">{t(locale, 'profile.hello', { name: u.displayName || u.email || '' })}</h2> {/* Saludo con el nombre */}
        <p className="m-0 text-ink-muted">{u.email}</p> {/* Correo de la cuenta */}
        {!u.emailVerified && (
          // Si el correo no está verificado, ofrecemos reenviar
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-oro-text">{t(locale, 'session.unverified')}</span> {/* Aviso */}
            <button type="button" disabled={busy} onClick={() => run(reenviarVerificacion, t(locale, 'profile.resent'))}
              className="h-11 rounded-pill border-[1.5px] border-control-border px-4 font-bold disabled:opacity-45">
              {t(locale, 'profile.resend')} {/* Botón para reenviar */}
            </button>
          </div>
        )}
        <AvisosNavegador locale={locale} /> {/* Activar o apagar los avisos de este navegador */}
        <DosPasos locale={locale} user={u} /> {/* Activar o quitar la verificación en dos pasos */}
        <button type="button" disabled={busy} onClick={() => run(cerrarSesion)}
          className="h-[52px] self-start rounded-pill border-[1.5px] border-status-alert px-6 font-bold text-status-alert disabled:opacity-45">
          {busy ? t(locale, 'session.signing_out') : t(locale, 'session.sign_out')} {/* Botón de salida */}
        </button>
        {info && <p role="status" className="m-0 text-status-verified">{info}</p>} {/* Confirmación */}
        {error && <p role="alert" className="m-0 text-status-alert">{error}</p>} {/* Error */}
      </section>
    );
  }

  if (segundoPaso) {
    // La cuenta tiene verificación en dos pasos: falta el código de la app
    return (
      <form className="flex flex-col gap-4" onSubmit={(e) => {
        e.preventDefault(); // Sin recargar
        const codigo = String(new FormData(e.currentTarget).get('codigo') ?? ''); // Código escrito
        run(async () => { await entrarConCodigo(segundoPaso, codigo); setSegundoPaso(null); }); // Termina el inicio de sesión
      }}>
        <h2 className="m-0 text-[26px] font-bold leading-tight">{t(locale, 'dospasos.title')}</h2> {/* Título */}
        <p className="m-0 text-[15px] leading-[23px] text-ink-muted">{t(locale, 'dospasos.signin_text')}</p> {/* Qué hacer */}
        <label className="login-etiqueta">{t(locale, 'dospasos.code')}
          <input name="codigo" required autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} className={`${field} font-mono tracking-[0.3em]`} /> {/* Código de 6 dígitos */}
        </label>
        {error && <p role="alert" className="m-0 text-status-alert">{error}</p>} {/* Error visible */}
        <button type="submit" disabled={busy} className="login-principal">{busy ? t(locale, 'auth.processing') : t(locale, 'dospasos.verify')}</button> {/* Entrar */}
        <button type="button" onClick={() => { setSegundoPaso(null); setError(null); }} className="h-11 self-start font-bold text-accent underline">{t(locale, 'auth.back')}</button> {/* Volver */}
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label={t(locale, 'auth.tabs_aria')} className="login-pestanas">
        {(['entrar', 'crear'] as const).map((m) => (
          // Pestañas para elegir entre entrar y crear cuenta
          <button key={m} type="button" onClick={() => { setMode(m); setError(null); setInfo(null); }} aria-current={mode === m ? 'page' : undefined}
            className="login-pestana">
            {m === 'entrar' ? t(locale, 'session.sign_in') : t(locale, 'auth.create')} {/* Texto de cada pestaña */}
          </button>
        ))}
      </nav>

      <h2 className="m-0 text-[26px] font-bold leading-tight">
        {t(locale, mode === 'entrar' ? 'auth.sign_in_title' : mode === 'crear' ? 'auth.sign_up_title' : 'auth.reset_title')} {/* Título según la vista */}
      </h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {mode === 'crear' && (
          // El nombre solo se pide al crear la cuenta
          <label className="login-etiqueta">{t(locale, 'auth.name')}
            <ConIcono icono="nombre"><input name="name" required maxLength={80} autoComplete="name" className={field} /></ConIcono> {/* Campo del nombre */}
          </label>
        )}
        <label className="login-etiqueta">{t(locale, 'auth.email')}
          <ConIcono icono="correo"><input name="email" type="email" required autoComplete="email" spellCheck={false} className={field} /></ConIcono> {/* Campo del correo */}
        </label>
        {mode !== 'recuperar' && (
          // La contraseña no se pide para recuperar
          <label className="login-etiqueta">{t(locale, 'auth.password')}
            <ConIcono icono="clave"><input name="password" type="password" required minLength={mode === 'crear' ? 8 : 1}
              autoComplete={mode === 'crear' ? 'new-password' : 'current-password'} className={field} /></ConIcono> {/* Campo de la contraseña */}
            {mode === 'crear' && <span className="text-sm font-normal text-ink-muted">{t(locale, 'auth.password_hint')}</span>} {/* Ayuda */}
          </label>
        )}
        {error && <p role="alert" className="m-0 text-status-alert">{error}</p>} {/* Error visible */}
        {info && <p role="status" className="m-0 text-status-verified">{info}</p>} {/* Confirmación visible */}
        <button type="submit" disabled={busy} className="login-principal">
          {busy ? t(locale, 'auth.processing') : mode === 'entrar' ? t(locale, 'session.sign_in') : mode === 'crear' ? t(locale, 'auth.create') : t(locale, 'auth.send_link')} {/* Acción según la vista */}
        </button>
      </form>

      {mode === 'entrar' && (
        // Enlace para recuperar la contraseña
        <button type="button" onClick={() => { setMode('recuperar'); setError(null); setInfo(null); }} className="h-11 self-start font-bold text-accent underline">
          {t(locale, 'auth.forgot')} {/* Recuperar la contraseña */}
        </button>
      )}
      {mode === 'recuperar' && (
        // Volver al inicio de sesión
        <button type="button" onClick={() => setMode('entrar')} className="h-11 self-start font-bold text-accent underline">
          {t(locale, 'auth.back')} {/* Volver al inicio de sesión */}
        </button>
      )}

      {mode !== 'recuperar' && (
        // Alternativa: entrar con Google
        <div className="flex flex-col gap-4">
          <p className="login-separador"><span>{t(locale, 'auth.or_continue')}</span></p> {/* Separador "o continúa con" */}
          <button type="button" disabled={busy} onClick={() => run(iniciarConGoogle)} className="login-social">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M21.35 11.1H12v2.9h5.35c-.25 1.5-1.7 4.4-5.35 4.4a6.4 6.4 0 0 1 0-12.8c2 0 3.35.85 4.1 1.6l2.8-2.7C17.1 2.85 14.8 2 12 2a10 10 0 1 0 0 20c5.75 0 9.6-4.05 9.6-9.75 0-.65-.1-1.15-.25-1.15z" /> {/* Ícono de Google */}
            </svg>
            {t(locale, 'auth.google')} {/* Texto del botón */}
          </button>
          <p className="m-0 text-center text-sm text-ink-muted">{t(locale, 'auth.terms_note')}</p> {/* Aviso legal honesto */}
        </div>
      )}
    </div>
  );
}
