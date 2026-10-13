'use client'; // Necesita saber la sesión y la ruta actual del navegador

import Link from 'next/link'; // Enlaces internos sin recargar
import { usePathname } from 'next/navigation'; // Ruta actual, para marcar la sección activa
import { useEffect, useState, type ReactNode } from 'react'; // Estado, efecto y tipo del contenido de cada página
import { SECTIONS } from './resources'; // Secciones del Ops Center (verificadas contra la base en CI)
import { useOpsAuth } from './useOps'; // Estado de la sesión del equipo

/** Grupos de la barra lateral: ordenan las secciones por tipo de trabajo (solo presentación). */
const GRUPOS: Array<{ titulo: string; claves: string[] }> = [
  { titulo: 'General', claves: ['panel'] }, // Vista de conjunto
  { titulo: 'Contenido', claves: ['territorios', 'destinos', 'negocios', 'cultura', 'fuentes'] }, // Lo que se publica
  { titulo: 'Personas', claves: ['usuarios', 'comunidad', 'denuncias', 'ia'] }, // Cuentas, moderación y revisiones
  { titulo: 'Control', claves: ['auditoria', 'navegacion', 'configuracion'] }, // Registro, medición y ajustes
  { titulo: 'Próximamente', claves: ['notificaciones', 'traducciones', 'seo'] }, // Aún sin construir (lo dice)
];

export function OpsShell({ locale, children }: { locale: string; children: ReactNode }) {
  const auth = useOpsAuth(); // Sesión del miembro del equipo
  const [sinSegundoPaso, setSinSegundoPaso] = useState(false); // Si esta sesión entró sin la verificación en dos pasos

  useEffect(() => {
    if (auth.kind !== 'ready') return; // Solo con sesión
    auth.user.getIdTokenResult().then((r) => {
      const firebase = r.claims.firebase as { sign_in_second_factor?: string } | undefined; // Datos de cómo se inició la sesión
      setSinSegundoPaso(!firebase?.sign_in_second_factor); // La API exige el segundo paso para trabajar aquí
    }).catch(() => setSinSegundoPaso(false)); // Si no se puede leer, la API igual lo dirá
  }, [auth]); // Cada vez que cambia la sesión
  const pathname = usePathname() ?? ''; // Ruta actual
  const base = `/${locale}/ops`; // Raíz del Ops Center en este idioma
  const rest = pathname.slice(base.length); // Parte de la ruta dentro del Ops Center

  const isActive = (path: string | null, resources?: string[]) => {
    if (path === null) return false; // Las secciones futuras nunca están activas
    if (path === '') return rest === '' || rest === '/'; // El panel solo en la raíz
    if (resources?.some((r) => rest.startsWith(`/r/${r}`))) return true; // Editor genérico de uno de sus recursos
    return rest.startsWith(path); // Página propia de la sección
  };

  let body: ReactNode = children; // Contenido de la página
  if (auth.kind === 'not_configured') {
    body = <p className="ops-aviso">El Ops Center se activa al conectar el inicio de sesión (Firebase). No disponible todavía.</p>; // Sin Firebase configurado
  } else if (auth.kind === 'loading') {
    body = <p className="text-ink-muted">Cargando…</p>; // Comprobando la sesión
  } else if (auth.kind === 'signed_out') {
    body = <p className="ops-aviso">Inicia sesión con una cuenta del equipo para entrar. <Link href={`/${locale}/cuenta`}>Iniciar sesión</Link></p>; // Sin sesión
  }

  const usuario = auth.kind === 'ready' ? auth.user.displayName || auth.user.email || 'Cuenta del equipo' : null; // Quién tiene la sesión abierta

  return (
    <div className="ops-noche flex flex-wrap">
      <nav aria-label="Ops Center" className="ops-lateral flex w-full flex-col gap-1 px-3.5 py-5 sm:w-[264px] sm:min-h-[calc(100vh-80px)]">
        <div className="px-2.5 pb-5">
          <div className="marca-cabecera">BAQUEANO</div> {/* Marca */}
          <div className="mt-1 text-sm text-ink-muted">Ops Center</div> {/* Nombre de la herramienta */}
        </div>
        {GRUPOS.map((g) => (
          <div key={g.titulo} className="mb-2">
            <p className="ops-grupo">{g.titulo}</p> {/* Título del grupo */}
            {g.claves.map((k) => SECTIONS.find((s) => s.key === k)).filter((s) => s !== undefined).map((s) =>
              s.path === null ? (
                <span key={s.key} className="ops-item ops-item-futuro">
                  {s.label} {/* Sección aún no construida */}
                  <span className="ops-insignia">Próximamente</span> {/* Lo dice en texto */}
                </span>
              ) : (
                <Link
                  key={s.key} // Sección
                  href={`${base}${s.path}`} // Su página
                  aria-current={isActive(s.path, s.resources) ? 'page' : undefined} // Marca la sección actual para lectores de pantalla
                  className="ops-item" // Estilo de fila (la activa se resalta por aria-current)
                >
                  {s.label} {/* Nombre de la sección */}
                </Link>
              ),
            )}
          </div>
        ))}
      </nav>
      <div className="min-w-0 flex-[999_1_560px]">
        <header className="ops-barra flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <p className="m-0 text-sm text-ink-muted">Centro de operaciones: solo datos reales de la base</p> {/* Recordatorio del principio: sin cifras estimadas */}
          {usuario && <p className="ops-usuario m-0">{usuario}</p>} {/* Cuenta con la sesión abierta */}
        </header>
        <main className="p-5 sm:p-8">
          {sinSegundoPaso && (
            // Aviso honesto: sin el segundo paso, la API rechaza las acciones del Ops Center
            <p role="status" className="ops-aviso mb-5">
              Esta sesión entró sin la verificación en dos pasos, y el Ops Center la exige. Actívala en <Link href={`/${locale}/cuenta`}>tu cuenta</Link> y vuelve a entrar con el código. {/* Qué hacer */}
            </p>
          )}
          {body} {/* Contenido de la sección */}
        </main>
      </div>
    </div>
  );
}
