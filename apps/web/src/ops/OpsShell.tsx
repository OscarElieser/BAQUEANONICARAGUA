'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { SECTIONS } from './resources';
import { useOpsAuth } from './useOps';

export function OpsShell({ locale, children }: { locale: string; children: ReactNode }) {
  const auth = useOpsAuth();
  const pathname = usePathname() ?? '';
  const base = `/${locale}/ops`;
  const rest = pathname.slice(base.length);

  const isActive = (path: string | null, resources?: string[]) => {
    if (path === null) return false;
    if (path === '') return rest === '' || rest === '/';
    if (resources?.some((r) => rest.startsWith(`/r/${r}`))) return true;
    return rest.startsWith(path);
  };

  let body: ReactNode = children;
  if (auth.kind === 'not_configured') {
    body = <p className="rounded-m bg-ground-raised p-5 font-bold">El Ops Center se activa al conectar el inicio de sesión (Firebase). No disponible todavía.</p>;
  } else if (auth.kind === 'loading') {
    body = <p className="text-ink-muted">Cargando…</p>;
  } else if (auth.kind === 'signed_out') {
    body = <p>Inicia sesión con una cuenta del equipo para entrar. <Link href={`/${locale}/cuenta`}>Iniciar sesión</Link></p>;
  }

  return (
    <div className="flex flex-wrap bg-ground text-ink">
      <nav aria-label="Ops Center" className="flex w-full flex-col gap-1 bg-[#0D5448] px-3.5 py-5 text-[#F2EFE5] sm:w-[260px] sm:min-h-[calc(100vh-80px)]">
        <div className="px-2.5 pb-4">
          <div className="font-display text-[22px]">[Marca]</div>
          <div className="text-sm text-[#C9D8D0]">Ops Center</div>
        </div>
        {SECTIONS.map((s) =>
          s.path === null ? (
            <span key={s.key} className="flex min-h-10 items-center justify-between rounded-[12px] px-3 text-[15px] text-[#9FBFB6]">
              {s.label}
              <span className="rounded-pill border border-[#5E9488] px-2 text-xs">Próximamente</span>
            </span>
          ) : (
            <Link
              key={s.key}
              href={`${base}${s.path}`}
              aria-current={isActive(s.path, s.resources) ? 'page' : undefined}
              className={`flex min-h-10 items-center rounded-[12px] px-3 text-[15px] no-underline ${
                isActive(s.path, s.resources) ? 'bg-[#F2EFE5] font-bold text-[#0D5448]' : 'text-[#F2EFE5]'
              }`}
            >
              {s.label}
            </Link>
          ),
        )}
      </nav>
      <main className="min-w-0 flex-[999_1_560px] p-5 sm:p-8">{body}</main>
    </div>
  );
}
