/**
 * Presupuesto y viabilidad de itinerarios (secciones 8 y 10).
 * Reglas: no mezclar precios verificados con estimaciones, no convertir monedas sin un
 * tipo de cambio con fuente y fecha, no inventar tiempos de traslado.
 * Los nombres de campos siguen el esquema Supabase (itinerary_costs, itinerary_stops).
 */
import type { Currency } from './intent.ts';

export type CostBasis = 'verified_price' | 'owner_reported' | 'estimate' | 'quote_needed';
export type CostPer = 'person' | 'group' | 'night' | 'vehicle';

export interface CostItem {
  label: string;
  amount: number | null;      // null solo para quote_needed
  currency: Currency | null;
  per: CostPer;
  basis: CostBasis;
  nights?: number;            // para per = 'night'
  rooms?: number;             // para per = 'night' (por defecto 1)
  vehicles?: number;          // para per = 'vehicle' (por defecto 1)
  estimateMethod?: string;    // obligatorio si basis = estimate
  observedAt?: string;        // fecha de la observación de precio
}

export interface Stop {
  label: string;
  plannedStart?: string;      // "HH:MM"
  plannedEnd?: string;
  travelMinutes?: number | null;
  travelSource?: 'routing_provider' | 'verified_data' | 'user_entered' | null;
}

export interface Day {
  dayNumber: number;
  stops: Stop[];
}

export interface ExchangeRate {
  usdToNio: number;
  source: string;
  date: string; // ISO
}

export interface BudgetTotals {
  currency: Currency;
  confirmed: number;          // verified_price + owner_reported
  estimated: number;          // estimate
  total: number;              // confirmed + estimated
  quotesPending: string[];    // etiquetas por cotizar
}

export interface Issue {
  code:
    | 'over_budget' | 'budget_currency_mismatch' | 'pending_quotes' | 'route_unknown'
    | 'travel_without_source' | 'day_too_long' | 'empty_day' | 'days_mismatch'
    | 'estimate_without_method' | 'missing_amount' | 'mixed_currencies_no_rate';
  severity: 'block' | 'warn' | 'info';
  message: string;
  day?: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Costo total de una partida para un grupo dado. */
export function itemTotal(item: CostItem, travelers: number): number | null {
  if (item.amount == null) return null;
  switch (item.per) {
    case 'person': return item.amount * travelers;
    case 'group': return item.amount;
    case 'night': return item.amount * (item.nights ?? 1) * (item.rooms ?? 1);
    case 'vehicle': return item.amount * (item.vehicles ?? 1);
  }
}

/** Totales por moneda, sin convertir salvo que haya un tipo de cambio con fuente. */
export function computeTotals(items: CostItem[], travelers: number, rate?: ExchangeRate, target?: Currency): BudgetTotals[] {
  const byCurrency = new Map<Currency, BudgetTotals>();
  const get = (c: Currency) => {
    if (!byCurrency.has(c)) byCurrency.set(c, { currency: c, confirmed: 0, estimated: 0, total: 0, quotesPending: [] });
    return byCurrency.get(c)!;
  };
  for (const item of items) {
    if (item.basis === 'quote_needed') {
      get(target ?? item.currency ?? 'USD').quotesPending.push(item.label);
      continue;
    }
    const value = itemTotal(item, travelers);
    if (value == null || !item.currency) continue;
    let currency = item.currency;
    let amount = value;
    if (rate && target && currency !== target) {
      amount = currency === 'USD' ? value * rate.usdToNio : value / rate.usdToNio;
      currency = target;
    }
    const t = get(currency);
    if (item.basis === 'estimate') t.estimated += amount;
    else t.confirmed += amount;
  }
  return [...byCurrency.values()].map((t) => ({
    ...t,
    confirmed: round2(t.confirmed),
    estimated: round2(t.estimated),
    total: round2(t.confirmed + t.estimated),
  }));
}

const minutes = (hhmm?: string) => {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export interface FeasibilityInput {
  days: Day[];
  items: CostItem[];
  travelers: number;
  budget?: { amount: number; currency: Currency };
  expectedDays?: number;
  rate?: ExchangeRate;
  maxActiveHoursPerDay?: number; // por defecto 13 h
}

export interface FeasibilityReport {
  feasible: boolean;          // sin problemas de severidad "block"
  totals: BudgetTotals[];
  perPerson: Array<{ currency: Currency; total: number }>;
  issues: Issue[];
}

/** Revisa un itinerario completo y explica cada problema con una corrección sugerida. */
export function checkFeasibility(input: FeasibilityInput): FeasibilityReport {
  const issues: Issue[] = [];
  const maxMinutes = (input.maxActiveHoursPerDay ?? 13) * 60;
  const target = input.budget?.currency;
  const currencies = new Set(input.items.filter((i) => i.currency && i.basis !== 'quote_needed').map((i) => i.currency));
  const canConvert = Boolean(input.rate && target);

  if (currencies.size > 1 && !canConvert) {
    issues.push({ code: 'mixed_currencies_no_rate', severity: 'warn',
      message: 'Hay costos en dólares y en córdobas. Se muestran por separado hasta tener un tipo de cambio con fuente y fecha.' });
  }

  for (const item of input.items) {
    if (item.basis === 'estimate' && !item.estimateMethod) {
      issues.push({ code: 'estimate_without_method', severity: 'block',
        message: `“${item.label}” es una estimación sin método declarado. Indica cómo se calculó o márcalo como “por cotizar”.` });
    }
    if (item.basis !== 'quote_needed' && (item.amount == null || !item.currency)) {
      issues.push({ code: 'missing_amount', severity: 'block',
        message: `“${item.label}” no tiene monto o moneda. Márcalo como “por cotizar”.` });
    }
  }

  const totals = computeTotals(input.items, input.travelers, input.rate, canConvert ? target : undefined);

  if (input.budget) {
    const same = totals.find((t) => t.currency === input.budget!.currency);
    const other = totals.filter((t) => t.currency !== input.budget!.currency && t.total > 0);
    if (other.length > 0) {
      issues.push({ code: 'budget_currency_mismatch', severity: 'warn',
        message: `Parte de los costos está en otra moneda que el presupuesto (${input.budget.currency}); no se suman sin tipo de cambio con fuente.` });
    }
    if (same && same.total > input.budget.amount) {
      const over = round2(same.total - input.budget.amount);
      issues.push({ code: 'over_budget', severity: 'block',
        message: `El plan supera el presupuesto por ${over} ${same.currency} (${same.confirmed} confirmados + ${same.estimated} estimados). Reduce noches, cambia de hospedaje o quita actividades pagadas.` });
    }
  }

  const pending = totals.flatMap((t) => t.quotesPending);
  if (pending.length > 0) {
    issues.push({ code: 'pending_quotes', severity: 'info',
      message: `Falta cotizar: ${pending.join(', ')}. El total no los incluye.` });
  }

  if (input.expectedDays && input.days.length !== input.expectedDays) {
    issues.push({ code: 'days_mismatch', severity: 'warn',
      message: `El plan tiene ${input.days.length} días y el viaje dura ${input.expectedDays}.` });
  }

  for (const day of input.days) {
    if (day.stops.length === 0) {
      issues.push({ code: 'empty_day', severity: 'info', day: day.dayNumber, message: `El día ${day.dayNumber} no tiene actividades.` });
      continue;
    }
    let active = 0;
    let travelUnknown = false;
    day.stops.forEach((s, idx) => {
      const a = minutes(s.plannedStart);
      const b = minutes(s.plannedEnd);
      if (a != null && b != null && b > a) active += b - a;
      if (idx > 0) {
        if (s.travelMinutes == null) travelUnknown = true;
        else {
          active += s.travelMinutes;
          if (!s.travelSource) {
            issues.push({ code: 'travel_without_source', severity: 'block', day: day.dayNumber,
              message: `El traslado hacia “${s.label}” tiene tiempo pero no indica de dónde salió. Calcúlalo con el proveedor de rutas.` });
          }
        }
      }
    });
    if (travelUnknown) {
      issues.push({ code: 'route_unknown', severity: 'warn', day: day.dayNumber,
        message: `Día ${day.dayNumber}: hay traslados sin calcular. Se calculan con el proveedor de rutas al guardar.` });
    }
    if (active > maxMinutes) {
      issues.push({ code: 'day_too_long', severity: 'block', day: day.dayNumber,
        message: `Día ${day.dayNumber}: ${round2(active / 60)} h de actividades y traslados superan ${maxMinutes / 60} h. Mueve una parada a otro día.` });
    }
  }

  const perPerson = totals.map((t) => ({ currency: t.currency, total: round2(t.total / Math.max(input.travelers, 1)) }));
  return { feasible: !issues.some((i) => i.severity === 'block'), totals, perPerson, issues };
}

/**
 * Recalcula tras un cambio (viajeros, presupuesto, días). Devuelve el informe nuevo y
 * qué cambió, para que el asistente "resuma las modificaciones del plan".
 */
export function recalculate(
  before: FeasibilityInput,
  change: Partial<Pick<FeasibilityInput, 'travelers' | 'budget' | 'expectedDays' | 'rate'>>,
): { report: FeasibilityReport; summary: string[] } {
  const prev = checkFeasibility(before);
  const next = checkFeasibility({ ...before, ...change });
  const summary: string[] = [];
  if (change.travelers && change.travelers !== before.travelers) {
    summary.push(`Viajeros: ${before.travelers} → ${change.travelers}. Se recalcularon los costos por persona.`);
  }
  if (change.budget) {
    summary.push(`Presupuesto: ${before.budget ? `${before.budget.amount} ${before.budget.currency}` : 'sin definir'} → ${change.budget.amount} ${change.budget.currency}.`);
  }
  for (const t of next.totals) {
    const p = prev.totals.find((x) => x.currency === t.currency);
    if (!p || p.total !== t.total) summary.push(`Total en ${t.currency}: ${p?.total ?? 0} → ${t.total}.`);
  }
  if (prev.feasible !== next.feasible) {
    summary.push(next.feasible ? 'El plan ahora es viable.' : 'El plan dejó de ser viable; revisa los avisos.');
  }
  return { report: next, summary };
}
