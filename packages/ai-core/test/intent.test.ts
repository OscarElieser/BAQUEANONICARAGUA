import { test } from 'node:test';
import assert from 'node:assert/strict';
import { budgetBreakdown, parseTripIntent } from '../src/intent.ts';

test('ejemplo del prompt maestro: 5 días, 4 personas, 600 dólares', () => {
  const i = parseTripIntent('Voy a Nicaragua cinco días, somos cuatro personas, tenemos 600 dólares y queremos playas, gastronomía y conocer pequeños negocios.');
  assert.equal(i.days, 5);
  assert.equal(i.travelers, 4);
  assert.deepEqual(i.budget, { amount: 600, currency: 'USD', scope: 'total' });
  assert.deepEqual(i.interests.sort(), ['beach', 'food', 'small_business']);
  assert.equal(i.travelerType, 'group');
  assert.ok(i.missing.includes('dates'));
  assert.ok(i.missing.includes('transport'));
  assert.ok(!i.missing.includes('budget_currency'));
});

test('presupuesto desglosado sin inventar', () => {
  const i = parseTripIntent('somos cuatro, cinco días, tenemos 600 dólares');
  assert.deepEqual(budgetBreakdown(i), { total: 600, perPerson: 150, perPersonPerDay: 30, currency: 'USD' });
});

test('moneda ausente se marca como dato por confirmar', () => {
  const i = parseTripIntent('Tenemos 600 de presupuesto para 3 días');
  assert.equal(i.budget?.amount, 600);
  assert.equal(i.budget?.currency, null);
  assert.ok(i.missing.includes('budget_currency'));
  assert.equal(budgetBreakdown(i), null);
});

test('córdobas y presupuesto por persona', () => {
  const i = parseTripIntent('somos 2 personas, C$ 5000 por persona, una semana');
  assert.equal(i.budget?.currency, 'NIO');
  assert.equal(i.budget?.scope, 'per_person');
  assert.equal(i.days, 7);
  assert.equal(budgetBreakdown(i)?.total, 10000);
});

test('inglés: pareja, noches y carro alquilado', () => {
  const i = parseTripIntent('Me and my wife, 4 nights, budget $1,200 total, we will rent a car, volcanoes and coffee');
  assert.equal(i.travelers, 2);
  assert.equal(i.travelerType, 'couple');
  assert.equal(i.days, 5);
  assert.equal(i.budget?.amount, 1200);
  assert.equal(i.hasVehicle, true);
  assert.ok(i.interests.includes('volcano') && i.interests.includes('coffee'));
});

test('familia con necesidad de accesibilidad', () => {
  const i = parseTripIntent('Viajamos en familia, somos 5, mi mamá usa silla de ruedas, sin carro');
  assert.equal(i.travelers, 5);
  assert.equal(i.travelerType, 'family');
  assert.equal(i.accessibilityNeeds, true);
  assert.equal(i.hasVehicle, false);
});

test('no inventa datos que no están', () => {
  const i = parseTripIntent('Quiero conocer Nicaragua');
  assert.equal(i.travelers, null);
  assert.equal(i.days, null);
  assert.equal(i.budget, null);
  assert.deepEqual(i.missing, ['travelers', 'days', 'dates', 'transport']);
});
