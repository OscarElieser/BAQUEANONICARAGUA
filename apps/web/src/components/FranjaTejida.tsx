/**
 * Franja tejida (hamacas de Masaya). Solo en Vitrina, perfiles y Comunidad.
 * Siempre decorativa: el nivel del perfil se dice en texto al lado.
 */
import { t, type MessageKey } from '@/i18n/t'; // Textos traducidos

export type ListingTier = 'community_info' | 'claimed' | 'verified';

const tierPattern: Record<ListingTier, string> = {
  community_info: 'repeating-linear-gradient(90deg, var(--band-maiz) 0 18px, transparent 18px 24px)',
  claimed: 'repeating-linear-gradient(90deg, var(--band-achiote) 0 30px, transparent 30px 35px)',
  verified: 'var(--band-anil)',
};

export const tierLabel: Record<ListingTier, MessageKey> = {
  community_info: 'tier.community_info', // Información comunitaria
  claimed: 'tier.claimed', // Perfil reclamado
  verified: 'tier.verified', // Negocio verificado
}; // Clave del nombre de cada nivel

export function FranjaTejida({ height = 18, className }: { height?: number; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        height,
        background:
          'repeating-linear-gradient(90deg, var(--band-anil) 0 30px, var(--band-maiz) 30px 38px, var(--band-achiote) 38px 68px, var(--band-marfil) 68px 72px, var(--band-verde) 72px 100px, var(--band-marfil) 100px 104px)',
      }}
    />
  );
}

export function FranjaNivel({ tier, locale }: { tier: ListingTier; locale: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[15px] font-bold">
      <span aria-hidden="true" style={{ width: 28, height: 8, background: tierPattern[tier], display: 'inline-block' }} />
      {t(locale, tierLabel[tier])} {/* Nivel en texto (la franja es decorativa) */}
    </span>
  );
}
