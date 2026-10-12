import 'dart:convert'; // Leer JSON
import 'dart:io'; // Leer archivos del repositorio

import 'package:flutter_test/flutter_test.dart'; // Herramientas de pruebas
import 'package:nica_app/features/planner/trip_intent.dart'; // Versión Dart a comprobar

void main() {
  // Mismo archivo que verifica la versión web: si Android entiende distinto un viaje, esta prueba falla
  final golden = jsonDecode(File('../../packages/ai-core/evals/intent_golden.json').readAsStringSync()) as Map<String, dynamic>; // Resultados de TypeScript
  final cases = (golden['cases'] as List).cast<Map<String, dynamic>>(); // Casos

  test('hay casos de referencia', () => expect(cases.length, greaterThan(10))); // El archivo no está vacío

  for (final c in cases) {
    // Una prueba por frase
    test('igual que la web: ${c['input']}', () {
      final input = c['input'] as String; // Frase
      final want = c['intent'] as Map<String, dynamic>; // Interpretación esperada
      final got = parseTripIntent(input); // Interpretación de Android
      expect(got.travelers, want['travelers'], reason: 'viajeros'); // Personas
      expect(got.days, want['days'], reason: 'días'); // Días
      final wb = want['budget'] as Map<String, dynamic>?; // Presupuesto esperado
      if (wb == null) {
        expect(got.budget, isNull, reason: 'sin presupuesto'); // No debe inventar presupuesto
      } else {
        expect(got.budget?.amount, wb['amount'], reason: 'cantidad'); // Cantidad
        expect(got.budget?.currency, wb['currency'], reason: 'moneda'); // Moneda
        expect(got.budget?.scope, wb['scope'], reason: 'alcance'); // Alcance
      }
      expect(got.interests, want['interests'], reason: 'intereses'); // Intereses en el mismo orden
      expect(got.startDate, want['startDate'], reason: 'fecha'); // Fecha
      expect(got.travelerType, want['travelerType'], reason: 'tipo de grupo'); // Tipo de grupo
      expect(got.hasVehicle, want['hasVehicle'], reason: 'vehículo'); // Vehículo
      expect(got.accessibilityNeeds, want['accessibilityNeeds'], reason: 'accesibilidad'); // Accesibilidad
      expect(got.missing, want['missing'], reason: 'lo que falta'); // Preguntas pendientes

      final bb = c['budget'] as Map<String, dynamic>?; // Desglose esperado
      final gb = budgetBreakdown(got); // Desglose de Android
      if (bb == null) {
        expect(gb, isNull, reason: 'sin desglose'); // No debe desglosar sin datos
      } else {
        expect(gb?.total, bb['total'], reason: 'total'); // Total
        expect(gb?.perPerson, bb['perPerson'], reason: 'por persona'); // Por persona
        expect(gb?.perPersonPerDay, bb['perPersonPerDay'], reason: 'por persona al día'); // Por persona al día
        expect(gb?.currency, bb['currency'], reason: 'moneda del desglose'); // Moneda
      }
    });
  }
}
