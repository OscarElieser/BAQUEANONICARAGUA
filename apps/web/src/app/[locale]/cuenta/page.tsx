import { CuentaForm } from '@/components/CuentaForm'; // Formulario de acceso y cuenta
import { CreditoFoto } from '@/components/CreditoFoto'; // Autor y licencia de la foto
import { fotoDe, srcsetDe } from '@/lib/fotos'; // Fotos reales con licencia libre
import { letraMarca } from '@/app/fuentes'; // Letra de la marca para la frase grande
import { t } from '@/i18n/t'; // Textos traducidos

export const metadata = { robots: { index: false, follow: false } }; // Los buscadores no indexan esta página

export default async function Cuenta({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; // Idioma de la página
  const foto = fotoDe('portada-caribe'); // Foto real de la mitad izquierda (playa en Corn Island)
  return (
    <main className={`${letraMarca.variable} tema-noche login-escena`}>
      <div aria-hidden="true" className="login-aurora" /> {/* Arco de luz con los colores de la marca (decoración) */}
      <div className="login-partido">
        <div className="login-arte">
          {foto && <img src={foto.imagen_movil} srcSet={srcsetDe(foto)} sizes="(min-width: 900px) 520px, 100vw" alt={foto.lugar} decoding="async" />} {/* Foto real con su lugar como texto alternativo */}
          <p className="login-arte-titulo">
            <span>{t(locale, 'auth.art_line1')}</span> {/* "El mundo es grande." */}
            <span>{t(locale, 'auth.art_line2')}</span> {/* "Nicaragua es inolvidable." */}
          </p>
          <p className="m-0 max-w-[40ch] text-[15px] leading-[22px]">{t(locale, 'auth.art_text')}</p> {/* Para qué sirve BAQUEANO */}
          {foto && <CreditoFoto locale={locale} foto={foto} />} {/* Crédito de la foto */}
        </div>
        <div className="login-lado">
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
        </div>
      </div>
    </main>
  );
}
