/**
 * Interpretación determinista de una solicitud de viaje (sección 8).
 * Es la primera pasada antes del modelo: extrae lo que el texto dice con certeza
 * y lista lo que falta confirmar. Nunca rellena con suposiciones.
 */

export type Currency = 'USD' | 'NIO';
export type Interest =
  | 'beach' | 'food' | 'small_business' | 'nature' | 'volcano' | 'culture'
  | 'history' | 'adventure' | 'coffee' | 'nightlife' | 'family';

export type BudgetScope = 'total' | 'per_person' | 'per_day' | 'unknown';

export interface TripIntent {
  travelers: number | null;
  days: number | null;
  budget: { amount: number; currency: Currency | null; scope: BudgetScope } | null;
  interests: Interest[];
  startDate: string | null; // ISO yyyy-mm-dd si se indicó
  travelerType: 'family' | 'couple' | 'group' | 'solo' | null;
  hasVehicle: boolean | null;
  accessibilityNeeds: boolean;
  missing: Array<'travelers' | 'days' | 'budget_currency' | 'dates' | 'transport'>;
}

const NUMBER_WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, one: 1, a: 1,
  dos: 2, two: 2, tres: 3, three: 3, cuatro: 4, four: 4, cinco: 5, five: 5,
  seis: 6, six: 6, siete: 7, seven: 7, ocho: 8, eight: 8, nueve: 9, nine: 9,
  diez: 10, ten: 10, once: 11, doce: 12, twelve: 12, quince: 15, fifteen: 15,
  veinte: 20, twenty: 20,
};

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');

function toNumber(token: string): number | null {
  const clean = token.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.');
  if (/^\d+(\.\d+)?$/.test(clean)) return Number(clean);
  return NUMBER_WORDS[token] ?? null;
}

const NUM = String.raw`(\d[\d.,]*|un|una|uno|one|dos|two|tres|three|cuatro|four|cinco|five|seis|six|siete|seven|ocho|eight|nueve|nine|diez|ten|once|doce|twelve|quince|fifteen|veinte|twenty)`;

function findTravelers(t: string): { n: number | null; type: TripIntent['travelerType'] } {
  if (/\b(sol[oa]|by myself|alone|viajo solo|viajo sola|solo traveler)\b/.test(t)) return { n: 1, type: 'solo' };
  if (/\b(mi pareja|en pareja|mi esposa|mi esposo|my partner|my wife|my husband|honeymoon|luna de miel)\b/.test(t) && !/\bhij[oa]s?\b|\bkids?\b|\bchildren\b/.test(t)) {
    return { n: 2, type: 'couple' };
  }
  const m =
    t.match(new RegExp(String.raw`\bsomos\s+${NUM}\b`)) ??
    t.match(new RegExp(String.raw`\b${NUM}\s+(personas|viajeros|adultos|amigos|people|travell?ers|adults|friends|of us)\b`)) ??
    t.match(new RegExp(String.raw`\bwe are\s+${NUM}\b`)) ??
    t.match(new RegExp(String.raw`\bpara\s+${NUM}\b(?!\s*(dias|noches|days|nights))`));
  const n = m ? toNumber(m[1]) : null;
  const family = /\b(familia|hij[oa]s|ninos|ninas|family|kids|children)\b/.test(t);
  const type: TripIntent['travelerType'] = family ? 'family' : n && n >= 3 ? 'group' : n === 2 ? 'couple' : n === 1 ? 'solo' : null;
  return { n: n && n >= 1 && n <= 60 ? n : null, type };
}

function findDays(t: string): number | null {
  const d = t.match(new RegExp(String.raw`\b${NUM}\s+(dias|days)\b`));
  if (d) return toNumber(d[1]);
  const n = t.match(new RegExp(String.raw`\b${NUM}\s+(noches|nights)\b`));
  if (n) { const v = toNumber(n[1]); return v ? v + 1 : null; }
  if (/\buna semana\b|\ba week\b|\bone week\b/.test(t)) return 7;
  if (/\bfin de semana\b|\bweekend\b/.test(t)) return 2;
  return null;
}

function findBudget(t: string): TripIntent['budget'] {
  const re = new RegExp(
    String.raw`(us\$|\$|c\$|usd|nio|cordobas?)?\s?(\d[\d.,]*)\s?(k\b|mil\b)?\s?(dolares|dollars|usd|cordobas?|nio|bucks)?`,
    'g',
  );
  // Primero cifras con moneda explícita; si no hay, cifras junto a palabras de dinero.
  const all = [...t.matchAll(re)].filter((m) => {
    const after = t.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 14);
    // Descarta cantidades de días, noches o personas
    return !/^\s*(dias|days|noches|nights|personas|people|adultos|adults|viajeros|travell?ers|ninos|kids|de nosotros|of us)\b/.test(after);
  });
  const withCurrency = all.filter((m) => m[1] || m[4]);
  const candidates = withCurrency.length > 0 ? withCurrency : all;
  for (const m of candidates) {
    const [, pre, num, mult, post] = m;
    if (!pre && !post) {
      const around = t.slice(Math.max(0, (m.index ?? 0) - 25), (m.index ?? 0) + m[0].length + 25);
      if (!/\b(presupuesto|budget|tenemos|tengo|gastar|spend)\b/.test(around)) continue;
    }
    let amount = toNumber(num);
    if (amount == null) continue;
    if (mult) amount *= 1000;
    const tag = `${pre ?? ''} ${post ?? ''}`;
    const currency: Currency | null = /c\$|cordoba|nio/.test(tag) ? 'NIO' : /us\$|\$|usd|dolar|dollar|bucks/.test(tag) ? 'USD' : null;
    const after = t.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 30);
    const scope: BudgetScope = /^\s*(por persona|cada uno|cada una|per person|each|pp\b)/.test(after)
      ? 'per_person'
      : /^\s*(por dia|al dia|per day|a day|daily)/.test(after)
        ? 'per_day'
        : /\b(en total|total|entre todos|in total|altogether)\b/.test(after) || /\b(tenemos|we have)\b/.test(t)
          ? 'total'
          : 'unknown';
    return { amount, currency, scope };
  }
  return null;
}

const INTEREST_PATTERNS: Array<[Interest, RegExp]> = [
  ['beach', /\b(playas?|beach(es)?|surf|mar|costa|ocean)\b/],
  ['food', /\b(gastronomia|comida|comer|platos?|food|cuisine|eat|restaurantes?)\b/],
  ['small_business', /\b(pequenos? negocios|emprendimientos?|emprendedores?|negocios locales|local business(es)?|small business(es)?|artesan[oa]s?)\b/],
  ['nature', /\b(naturaleza|reservas?|bosques?|senderos?|nature|hiking|caminata|wildlife|aves|birds?)\b/],
  ['volcano', /\b(volcan(es)?|volcano(es)?|crater)\b/],
  ['culture', /\b(cultura|museos?|tradiciones|culture|museums?|arte|art)\b/],
  ['history', /\b(historia|historico|colonial|history|historic)\b/],
  ['adventure', /\b(aventura|adventure|kayak|canopy|rappel|sandboarding)\b/],
  ['coffee', /\b(cafe|coffee|cafetal|finca de cafe)\b/],
  ['nightlife', /\b(vida nocturna|fiesta|nightlife|bares?)\b/],
  ['family', /\b(familia|ninos|kids|family)\b/],
];

function findDate(t: string): string | null {
  const iso = t.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}

export function parseTripIntent(text: string): TripIntent {
  const t = norm(text);
  const { n: travelers, type } = findTravelers(t);
  const days = findDays(t);
  const budget = findBudget(t);
  const interests = INTEREST_PATTERNS.filter(([, re]) => re.test(t)).map(([i]) => i);
  const startDate = findDate(t);
  const hasVehicle = /\b(sin (carro|vehiculo|auto)|transporte publico|bus|no car|public transport)\b/.test(t)
    ? false
    : /\b(alquilar(emos)? (un )?(carro|auto)|con (carro|vehiculo)|rent(ing)? a car|our car|nuestro carro)\b/.test(t)
      ? true
      : null;
  const accessibilityNeeds = /\b(silla de ruedas|movilidad reducida|accesib|wheelchair|reduced mobility|discapacidad|disability)\b/.test(t);

  const missing: TripIntent['missing'] = [];
  if (travelers == null) missing.push('travelers');
  if (days == null) missing.push('days');
  if (budget && budget.currency == null) missing.push('budget_currency');
  if (!startDate) missing.push('dates');
  if (hasVehicle == null) missing.push('transport');

  return { travelers, days, budget, interests, startDate, travelerType: type, hasVehicle, accessibilityNeeds, missing };
}

/** Presupuesto expresado por persona y por día, solo si los datos lo permiten (sin redondeos engañosos). */
export function budgetBreakdown(intent: TripIntent): { total: number; perPerson: number | null; perPersonPerDay: number | null; currency: Currency } | null {
  const b = intent.budget;
  if (!b || !b.currency) return null;
  const people = intent.travelers;
  const days = intent.days;
  let total: number | null = null;
  if (b.scope === 'total' || b.scope === 'unknown') total = b.amount;
  if (b.scope === 'per_person' && people) total = b.amount * people;
  if (b.scope === 'per_day' && days) total = b.amount * days;
  if (total == null) return null;
  const perPerson = people ? round2(total / people) : null;
  const perPersonPerDay = people && days ? round2(total / people / days) : null;
  return { total, perPerson, perPersonPerDay, currency: b.currency };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
