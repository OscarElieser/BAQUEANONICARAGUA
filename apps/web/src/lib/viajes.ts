'use client'; // Solo en el navegador: usa la sesión de la persona

// Viajes y favoritos guardados en Supabase. Son los mismos que ve la app Android con la misma cuenta.
// Los permisos los decide RLS (cada quien ve y cambia solo lo suyo); aquí no hay ninguna clave secreta.
import type { TripIntent } from '@nica/ai-core'; // Lo que entendió el intérprete
import { supabase } from './supabase'; // Cliente con el token de Firebase

export type Viaje = { id: string; title: string; starts_on: string | null; ends_on: string | null; travelers: number | null; budget_amount: number | null; budget_currency: 'NIO' | 'USD' | null; interests: string[]; created_at: string }; // Un viaje guardado
export type Favorito = { tipo: 'destino' | 'negocio'; id: string; slug: string; name: string }; // Un lugar guardado

export const EVENTO_VIAJES = 'baqueano:viajes'; // Aviso interno cuando cambian los viajes o favoritos

/** Perfil de la persona con sesión (lo crea la función preparar-sesion al iniciar). */
async function miPerfil(): Promise<string> {
  const { data, error } = await supabase.rpc('my_profile_id'); // Pregunta a la base de datos
  if (error || !data) throw new Error('perfil'); // Sin perfil no se puede guardar
  return data as string; // Identificador del perfil
}

/** Suma días a una fecha ISO (yyyy-mm-dd). */
function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`); // Fecha en UTC para no correrse de día
  d.setUTCDate(d.getUTCDate() + dias); // Suma los días
  return d.toISOString().slice(0, 10); // Vuelve a yyyy-mm-dd
}

/** Guarda lo entendido como un viaje nuevo, con solo los datos que la persona dio. */
export async function guardarViaje(titulo: string, intent: TripIntent, total: { amount: number; currency: 'NIO' | 'USD' } | null): Promise<void> {
  const owner_id = await miPerfil(); // Dueña o dueño del viaje
  const { error } = await supabase.from('trips').insert({
    owner_id, // Quién lo guarda
    title: titulo.trim().slice(0, 120), // Nombre del viaje
    starts_on: intent.startDate, // Fecha de inicio (si la dijo)
    ends_on: intent.startDate && intent.days ? sumarDias(intent.startDate, intent.days - 1) : null, // Fecha final calculada (si hay inicio y días)
    travelers: intent.travelers, // Personas (si las dijo)
    budget_amount: total?.amount ?? null, // Presupuesto total (si hay moneda)
    budget_currency: total?.currency ?? null, // Córdobas o dólares
    interests: intent.interests, // Intereses entendidos
    created_via: 'assistant', // Lo armó el intérprete
  }); // Inserta (RLS exige que owner_id sea la persona con sesión)
  if (error) throw new Error(error.message); // Error claro
  window.dispatchEvent(new Event(EVENTO_VIAJES)); // Avisa a la lista de viajes
}

/** Viajes de la persona, del más nuevo al más viejo. */
export async function misViajes(): Promise<Viaje[]> {
  const owner = await miPerfil(); // Perfil propio
  const { data, error } = await supabase.from('trips').select('id, title, starts_on, ends_on, travelers, budget_amount, budget_currency, interests, created_at').eq('owner_id', owner).order('created_at', { ascending: false }); // Solo los propios
  if (error) throw new Error(error.message); // Error claro
  return (data ?? []) as Viaje[]; // Lista
}

/** Borra un viaje propio. */
export async function borrarViaje(id: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', id); // RLS solo deja borrar los propios
  if (error) throw new Error(error.message); // Error claro
  window.dispatchEvent(new Event(EVENTO_VIAJES)); // Avisa a la lista
}

/** Lugares guardados, con su nombre y dirección (solo los que siguen publicados). */
export async function misFavoritos(): Promise<Favorito[]> {
  const { data, error } = await supabase.from('favorites').select('destination_id, business_id, created_at').order('created_at', { ascending: false }); // RLS: solo los propios
  if (error) throw new Error(error.message); // Error claro
  const dest = (data ?? []).map((f) => f.destination_id).filter(Boolean) as string[]; // Destinos guardados
  const neg = (data ?? []).map((f) => f.business_id).filter(Boolean) as string[]; // Negocios guardados
  const [d, n] = await Promise.all([
    dest.length ? supabase.from('public_destinations').select('id, slug, name').in('id', dest) : Promise.resolve({ data: [] }), // Nombres de destinos publicados
    neg.length ? supabase.from('public_businesses').select('id, slug, name').in('id', neg) : Promise.resolve({ data: [] }), // Nombres de negocios publicados
  ]);
  return [
    ...((d.data ?? []) as Array<{ id: string; slug: string; name: string }>).map((x) => ({ tipo: 'destino' as const, ...x })), // Destinos
    ...((n.data ?? []) as Array<{ id: string; slug: string; name: string }>).map((x) => ({ tipo: 'negocio' as const, ...x })), // Negocios
  ];
}

/** Si un lugar está guardado. */
export async function esFavorito(tipo: 'destino' | 'negocio', id: string): Promise<boolean> {
  const col = tipo === 'destino' ? 'destination_id' : 'business_id'; // Columna según el tipo
  const { data } = await supabase.from('favorites').select(col).eq(col, id).maybeSingle(); // Busca el propio (RLS)
  return Boolean(data); // Existe o no
}

/** Guarda o quita un lugar de favoritos; devuelve el estado nuevo. */
export async function alternarFavorito(tipo: 'destino' | 'negocio', id: string, guardado: boolean): Promise<boolean> {
  const col = tipo === 'destino' ? 'destination_id' : 'business_id'; // Columna según el tipo
  if (guardado) {
    const { error } = await supabase.from('favorites').delete().eq(col, id); // Quita el propio
    if (error) throw new Error(error.message); // Error claro
  } else {
    const profile_id = await miPerfil(); // Perfil propio
    const { error } = await supabase.from('favorites').insert({ profile_id, [col]: id }); // Guarda
    if (error) throw new Error(error.message); // Error claro
  }
  window.dispatchEvent(new Event(EVENTO_VIAJES)); // Avisa a la lista
  return !guardado; // Estado nuevo
}
