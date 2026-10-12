import { publicDb } from './territories';
import type { MessageKey } from '@/i18n/t'; // Claves de traducción
import type { FieldState, VerificationRow } from '@/components/EstadoVerificacion';
import type { ListingTier } from '@/components/FranjaTejida';

type Hours = { weekday: number; opens_at: string | null; closes_at: string | null; closed: boolean; verified_at: string };
type Price = { label: string; amount: number; currency: 'NIO' | 'USD'; unit: string | null; observed_at: string; reported_by: 'owner' | 'editor' | 'official_source' };

const latest = (dates: string[]) => dates.sort().at(-1);

export function locationState(precision: 'exact' | 'approximate' | 'restricted'): FieldState {
  if (precision === 'exact') return { kind: 'pending' };
  if (precision === 'approximate') return { kind: 'approximate' };
  return { kind: 'restricted', noteKey: 'ficha.location_protected' }; // Ubicación protegida (texto traducido en pantalla)
}

export function hoursState(hours: Hours[]): FieldState {
  const d = latest(hours.map((h) => h.verified_at));
  return d ? { kind: 'verified', date: d } : { kind: 'unconfirmed' };
}

export function pricesState(prices: Price[]): FieldState {
  const d = latest(prices.map((p) => p.observed_at));
  return d ? { kind: 'verified', date: d } : { kind: 'ask_provider' };
}

export async function getDestination(slug: string) {
  const db = publicDb();
  const { data: d } = await db.from('public_destinations').select('*').eq('slug', slug).maybeSingle();
  if (!d) return null;
  const [{ data: hours }, { data: prices }, { data: src }] = await Promise.all([
    db.from('opening_hours').select('weekday, opens_at, closes_at, closed, verified_at').eq('destination_id', d.id),
    db.from('price_observations').select('label, amount, currency, unit, observed_at, reported_by').eq('destination_id', d.id),
    d.source_id ? db.from('data_sources').select('url').eq('id', d.source_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const rows: VerificationRow[] = [
    { field: 'field.location', state: locationState(d.location_precision) }, // Ubicación
    { field: 'field.hours', state: hoursState((hours ?? []) as Hours[]) }, // Horarios
    { field: 'field.prices', state: pricesState((prices ?? []) as Price[]) }, // Tarifas
  ];
  if (d.safety_notes) rows.push({ field: 'field.safety', state: { kind: 'restricted', note: d.safety_notes } });
  return { destination: d, prices: (prices ?? []) as Price[], rows, sourceHref: (src as { url?: string } | null)?.url };
}

export type Contact = { kind: string; value: string };

/** Enlaces de contacto directos. WhatsApp usa wa.me con solo dígitos. */
export function contactHref(c: Contact): string | null {
  const digits = c.value.replace(/\D/g, '');
  switch (c.kind) {
    case 'whatsapp': return digits ? `https://wa.me/${digits}` : null;
    case 'phone': return digits ? `tel:+${digits}` : null;
    case 'email': return `mailto:${c.value}`;
    case 'website': case 'facebook': case 'instagram': case 'tiktok':
      return /^https?:\/\//.test(c.value) ? c.value : null;
    default: return null;
  }
}

export async function getBusiness(slug: string) {
  const db = publicDb();
  const { data: b } = await db.from('public_businesses').select('*').eq('slug', slug).maybeSingle();
  if (!b) return null;
  const [{ data: contacts }, { data: hours }, { data: prices }] = await Promise.all([
    db.from('contacts').select('kind, value').eq('business_id', b.id),
    db.from('opening_hours').select('weekday, opens_at, closes_at, closed, verified_at').eq('business_id', b.id),
    db.from('price_observations').select('label, amount, currency, unit, observed_at, reported_by').eq('business_id', b.id),
  ]);
  const rows: VerificationRow[] = [
    { field: 'field.identity', state: (b.verified_scope ?? []).includes('identity') && b.verified_at ? { kind: 'verified', date: b.verified_at } : { kind: 'pending' } },
    { field: 'field.location', state: (b.verified_scope ?? []).includes('location') && b.verified_at ? { kind: 'verified', date: b.verified_at } : locationState(b.location_precision) },
    { field: 'field.hours', state: hoursState((hours ?? []) as Hours[]) }, // Horarios
    { field: 'field.prices', state: pricesState((prices ?? []) as Price[]) }, // Tarifas
  ];
  return {
    business: b as typeof b & { listing_tier: ListingTier; is_sponsored: boolean },
    contacts: (contacts ?? []) as Contact[],
    prices: (prices ?? []) as Price[],
    rows,
  };
}

export const reportedByKey: Record<Price['reported_by'], MessageKey> = {
  owner: 'prices.by_owner', // Lo informó el negocio
  editor: 'prices.by_editor', // Lo comprobó el equipo editorial
  official_source: 'prices.by_official', // Fuente oficial
}; // Clave de traducción de quién informó cada tarifa
