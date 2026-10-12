'use client'; // Formulario interactivo del navegador

import { useState, type FormEvent } from 'react'; // Estado local y tipo del evento de envío
import {
  authErrorMessage, // Traduce errores de Firebase a español
  cerrarSesion, // Cierra la sesión
  crearCuenta, // Crea una cuenta nueva
  iniciarConGoogle, // Entra con Google
  iniciarSesion, // Entra con correo y contraseña
  recuperarContrasena, // Envía el correo de recuperación
  reenviarVerificacion, // Reenvía el correo de verificación
} from '@/lib/auth';
import { useSession } from '@/lib/useSession'; // Estado de la sesión

type Mode = 'entrar' | 'crear' | 'recuperar'; // Las tres vistas del formulario

const field = 'h-[52px] rounded-pill border border-control-border bg-ground-raised px-5 text-base text-ink'; // Estilo común de los campos

export function CuentaForm() {
  const session = useSession(); // Sesión actual
  const [mode, setMode] = useState<Mode>('entrar'); // Vista elegida (empieza en "Iniciar sesión")
  const [busy, setBusy] = useState(false); // Si hay una operación en curso
  const [error, setError] = useState<string | null>(null); // Mensaje de error visible
  const [info, setInfo] = useState<string | null>(null); // Mensaje de confirmación visible

  /** Ejecuta una acción mostrando "procesando", errores claros y confirmaciones. */
  async function run(action: () => Promise<unknown>, ok?: string) {
    setBusy(true); // Bloquea botones mientras trabaja
    setError(null); // Limpia errores anteriores
    setInfo(null); // Limpia avisos anteriores
    try {
      await action(); // Ejecuta la acción pedida
      if (ok) setInfo(ok); // Muestra la confirmación si la hay
    } catch (e) {
      setError(e instanceof Error && e.message && !(e as { code?: string }).code ? e.message : authErrorMessage(e)); // Mensaje propio o traducido
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
    if (mode === 'crear') run(() => crearCuenta(String(f.get('name') ?? ''), email, password), 'Cuenta creada. Te enviamos un correo para verificar tu dirección.'); // Crea la cuenta
    if (mode === 'recuperar') run(() => recuperarContrasena(email), 'Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña.'); // Envía recuperación sin revelar si el correo existe
  }

  if (session.status === 'not_configured') {
    // Firebase aún no está conectado en este entorno
    return <p className="rounded-m bg-ground-raised p-5 font-bold">El inicio de sesión se activa al conectar el proyecto de Firebase. No disponible todavía.</p>;
  }
  if (session.status === 'loading') {
    // Todavía comprobamos si hay sesión
    return <p className="text-ink-muted">Cargando…</p>;
  }

  if (session.status === 'signed_in') {
    // Vista de la cuenta cuando ya hay sesión
    const u = session.user; // Usuario con sesión
    return (
      <section aria-labelledby="mi-cuenta" className="flex flex-col gap-4 rounded-m bg-ground-raised p-6">
        <h2 id="mi-cuenta" className="m-0 text-[20px] font-bold">Hola, {u.displayName || u.email}</h2> {/* Saludo con el nombre */}
        <p className="m-0 text-ink-muted">{u.email}</p> {/* Correo de la cuenta */}
        {!u.emailVerified && (
          // Si el correo no está verificado, ofrecemos reenviar
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-oro-text">Tu correo no está verificado.</span> {/* Aviso */}
            <button type="button" disabled={busy} onClick={() => run(reenviarVerificacion, 'Te enviamos de nuevo el correo de verificación.')}
              className="h-11 rounded-pill border-[1.5px] border-control-border px-4 font-bold disabled:opacity-45">
              Reenviar correo {/* Botón para reenviar */}
            </button>
          </div>
        )}
        <button type="button" disabled={busy} onClick={() => run(cerrarSesion)}
          className="h-[52px] self-start rounded-pill border-[1.5px] border-status-alert px-6 font-bold text-status-alert disabled:opacity-45">
          {busy ? 'Cerrando sesión…' : 'Cerrar sesión'} {/* Botón de salida */}
        </button>
        {info && <p role="status" className="m-0 text-status-verified">{info}</p>} {/* Confirmación */}
        {error && <p role="alert" className="m-0 text-status-alert">{error}</p>} {/* Error */}
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Opciones de acceso" className="flex flex-wrap gap-1 self-start rounded-pill bg-ground-raised p-1">
        {(['entrar', 'crear'] as const).map((m) => (
          // Pestañas para elegir entre entrar y crear cuenta
          <button key={m} type="button" onClick={() => { setMode(m); setError(null); setInfo(null); }} aria-current={mode === m ? 'page' : undefined}
            className={`rounded-pill px-5 py-2.5 font-bold ${mode === m ? 'bg-ink text-ground' : 'text-ink'}`}>
            {m === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta'} {/* Texto de cada pestaña */}
          </button>
        ))}
      </nav>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {mode === 'crear' && (
          // El nombre solo se pide al crear la cuenta
          <label className="flex flex-col gap-2 font-bold">Tu nombre
            <input name="name" required maxLength={80} autoComplete="name" className={field} /> {/* Campo del nombre */}
          </label>
        )}
        <label className="flex flex-col gap-2 font-bold">Correo
          <input name="email" type="email" required autoComplete="email" className={field} /> {/* Campo del correo */}
        </label>
        {mode !== 'recuperar' && (
          // La contraseña no se pide para recuperar
          <label className="flex flex-col gap-2 font-bold">Contraseña
            <input name="password" type="password" required minLength={mode === 'crear' ? 8 : 1}
              autoComplete={mode === 'crear' ? 'new-password' : 'current-password'} className={field} /> {/* Campo de la contraseña */}
            {mode === 'crear' && <span className="text-sm font-normal text-ink-muted">Al menos 8 caracteres.</span>} {/* Ayuda */}
          </label>
        )}
        {error && <p role="alert" className="m-0 text-status-alert">{error}</p>} {/* Error visible */}
        {info && <p role="status" className="m-0 text-status-verified">{info}</p>} {/* Confirmación visible */}
        <button type="submit" disabled={busy} className="h-[52px] self-start rounded-pill bg-oro px-7 font-bold text-on-oro disabled:opacity-45">
          {busy ? 'Procesando…' : mode === 'entrar' ? 'Iniciar sesión' : mode === 'crear' ? 'Crear cuenta' : 'Enviar enlace'} {/* Acción según la vista */}
        </button>
      </form>

      {mode === 'entrar' && (
        // Enlace para recuperar la contraseña
        <button type="button" onClick={() => { setMode('recuperar'); setError(null); setInfo(null); }} className="h-11 self-start font-bold text-accent underline">
          Olvidé mi contraseña
        </button>
      )}
      {mode === 'recuperar' && (
        // Volver al inicio de sesión
        <button type="button" onClick={() => setMode('entrar')} className="h-11 self-start font-bold text-accent underline">
          Volver a iniciar sesión
        </button>
      )}

      {mode !== 'recuperar' && (
        // Alternativa: entrar con Google
        <div className="flex flex-col gap-2 border-t border-line pt-6">
          <button type="button" disabled={busy} onClick={() => run(iniciarConGoogle)}
            className="flex h-[52px] items-center gap-3 self-start rounded-pill border-[1.5px] border-control-border px-6 font-bold disabled:opacity-45">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M21.35 11.1H12v2.9h5.35c-.25 1.5-1.7 4.4-5.35 4.4a6.4 6.4 0 0 1 0-12.8c2 0 3.35.85 4.1 1.6l2.8-2.7C17.1 2.85 14.8 2 12 2a10 10 0 1 0 0 20c5.75 0 9.6-4.05 9.6-9.75 0-.65-.1-1.15-.25-1.15z" /> {/* Ícono de Google */}
            </svg>
            Continuar con Google {/* Texto del botón */}
          </button>
          <p className="m-0 text-sm text-ink-muted">Al continuar aceptas los términos y la política de privacidad (en revisión jurídica).</p> {/* Aviso legal honesto */}
        </div>
      )}
    </div>
  );
}
