import { CuentaForm } from '@/components/CuentaForm'; // Formulario de acceso y cuenta
import { t } from '@/i18n/t'; // Textos traducidos

export const metadata = { robots: { index: false, follow: false } }; // Los buscadores no indexan esta página

export default async function Cuenta({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; // Idioma de la página
  return (
    <main className="mx-auto max-w-[560px] px-4 py-12">
      <h1 className="m-0 font-display text-[40px] font-normal leading-[1.02]">{t(locale, 'auth.title')}</h1> {/* Título de la página */}
      <p className="mb-8 mt-3 text-[19px] leading-[30px] text-ink-muted">
        {t(locale, 'auth.intro')} {/* Para qué sirve la cuenta */}
      </p>
      <CuentaForm locale={locale} /> {/* Entrar, crear cuenta, recuperar o cerrar sesión */}
    </main>
  );
}
