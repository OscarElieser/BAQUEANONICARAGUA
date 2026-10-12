// Crédito de una foto real: autor, licencia y enlace a su página de origen en Wikimedia Commons.
import type { Foto } from '@/lib/fotos'; // Datos de la foto
import { t } from '@/i18n/t'; // Textos traducidos

export function CreditoFoto({ locale, foto, className = '' }: { locale: string; foto: Foto; className?: string }) {
  return (
    <a href={foto.pagina} target="_blank" rel="noopener noreferrer license" className={`credito-foto ${className}`}>
      {t(locale, 'photo.credit', { author: foto.autor, license: foto.licencia })} {/* "Foto: autor (licencia), Wikimedia Commons" */}
    </a>
  );
}
