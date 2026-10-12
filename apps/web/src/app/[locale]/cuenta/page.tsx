import { CuentaForm } from '@/components/CuentaForm'; // Formulario de acceso y cuenta
import { t } from '@/i18n/t'; // Textos traducidos

export const metadata = { robots: { index: false, follow: false } }; // Los buscadores no indexan esta página

export default async function Cuenta({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; // Idioma de la página
  return (
    <main className="tema-noche login-escena">
      <div aria-hidden="true" className="login-aurora" /> {/* Arco de luz con los colores de la marca (decoración) */}
      <div className="relative w-full max-w-[440px]">
      <div aria-hidden="true" className="login-orbe" /> {/* Orbe de la marca (decoración) */}
      <div className="login-vidrio">
        <h1 className="m-0 text-sm font-bold text-ink-muted">{t(locale, 'auth.title')}</h1> {/* Título de la página */}
        <p className="mb-6 mt-1 text-[15px] leading-[23px] text-ink-muted">
          {t(locale, 'auth.intro')} {/* Para qué sirve la cuenta */}
        </p>
        <CuentaForm locale={locale} /> {/* Entrar, crear cuenta, recuperar o cerrar sesión */}
      </div>
      </div>
    </main>
  );
}
