import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkFeasibility, computeTotals, recalculate, type CostItem, type FeasibilityInput } from '../src/itinerary.ts';

const items: CostItem[] = [
  { label: 'Hospedaje familiar', amount: 40, currency: 'USD', per: 'night', nights: 4, rooms: 2, basis: 'owner_reported' },
  { label: 'Entrada a reserva', amount: 5, currency: 'USD', per: 'person', basis: 'verified_price' },
  { label: 'Comidas', amount: 12, currency: 'USD', per: 'person', basis: 'estimate', estimateMethod: 'promedio de 3 comedores verificados × 5 días ÷ 5' },
  { label: 'Tour en lancha', amount: null, currency: null, per: 'group', basis: 'quote_needed' },
];

const base: FeasibilityInput = {
  travelers: 4,
  budget: { amount: 600, currency: 'USD' },
  expectedDays: 2,
  items,
  days: [
    { dayNumber: 1, stops: [
      { label: 'Granada', plannedStart: '08:00', plannedEnd: '11:00' },
      { label: 'Laguna de Apoyo', plannedStart: '12:00', plannedEnd: '16:00', travelMinutes: 40, travelSource: 'routing_provider' },
    ] },
    { dayNumber: 2, stops: [{ label: 'Mercado', plannedStart: '09:00', plannedEnd: '11:00' }] },
  ],
};

test('separa confirmado, estimado y por cotizar', () => {
  const [usd] = computeTotals(items, 4);
  assert.equal(usd.confirmed, 340); // 40×4×2 + 5×4
  assert.equal(usd.estimated, 48);  // 12×4
  assert.equal(usd.total, 388);
  assert.deepEqual(usd.quotesPending, ['Tour en lancha']);
});

test('plan dentro del presupuesto es viable y avisa lo pendiente', () => {
  const r = checkFeasibility(base);
  assert.equal(r.feasible, true);
  assert.ok(r.issues.some((i) => i.code === 'pending_quotes'));
  assert.deepEqual(r.perPerson, [{ currency: 'USD', total: 97 }]);
});

test('detecta presupuesto superado', () => {
  const r = checkFeasibility({ ...base, budget: { amount: 300, currency: 'USD' } });
  assert.equal(r.feasible, false);
  const over = r.issues.find((i) => i.code === 'over_budget');
  assert.ok(over?.message.includes('88 USD'));
});

test('un tiempo de traslado sin origen bloquea (no se inventan tiempos)', () => {
  const days = structuredClone(base.days);
  days[0].stops[1].travelSource = null;
  const r = checkFeasibility({ ...base, days });
  assert.ok(r.issues.some((i) => i.code === 'travel_without_source' && i.severity === 'block'));
});

test('traslado sin calcular se avisa, no se rellena', () => {
  const days = structuredClone(base.days);
  days[0].stops[1].travelMinutes = null;
  const r = checkFeasibility({ ...base, days });
  assert.ok(r.issues.some((i) => i.code === 'route_unknown'));
});

test('día demasiado largo es inviable', () => {
  const days = structuredClone(base.days);
  days[0].stops[1] = { ...days[0].stops[1], plannedStart: '12:00', plannedEnd: '23:30' };
  const r = checkFeasibility({ ...base, days });
  assert.ok(r.issues.some((i) => i.code === 'day_too_long'));
  assert.equal(r.feasible, false);
});

test('estimación sin método bloquea', () => {
  const r = checkFeasibility({ ...base, items: [{ label: 'Taxi', amount: 20, currency: 'USD', per: 'group', basis: 'estimate' }] });
  assert.ok(r.issues.some((i) => i.code === 'estimate_without_method'));
});

test('monedas mezcladas no se suman sin tipo de cambio con fuente', () => {
  const mixed: CostItem[] = [...items, { label: 'Bus', amount: 100, currency: 'NIO', per: 'person', basis: 'verified_price' }];
  const r = checkFeasibility({ ...base, items: mixed });
  assert.ok(r.issues.some((i) => i.code === 'mixed_currencies_no_rate'));
  assert.equal(r.totals.length, 2);
  const withRate = checkFeasibility({ ...base, items: mixed, rate: { usdToNio: 36.6, source: 'BCN (prueba)', date: '2026-10-11' } });
  assert.equal(withRate.totals.length, 1);
  assert.ok(!withRate.issues.some((i) => i.code === 'mixed_currencies_no_rate'));
});

test('escenario IA de la sección 30: cambiar presupuesto y viajeros recalcula', () => {
  const { report, summary } = recalculate(base, { travelers: 6, budget: { amount: 400, currency: 'USD' } });
  // 40×4×2 + 5×6 + 12×6 = 320 + 30 + 72 = 422 > 400
  assert.equal(report.totals[0].total, 422);
  assert.equal(report.feasible, false);
  assert.ok(summary.some((s) => s.includes('Viajeros: 4 → 6')));
  assert.ok(summary.some((s) => s.includes('388 → 422')));
  assert.ok(summary.some((s) => s.includes('dejó de ser viable')));
});
