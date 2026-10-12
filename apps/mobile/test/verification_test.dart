import 'package:flutter_test/flutter_test.dart'; // Herramientas de pruebas
import 'package:nica_app/core/data/models.dart'; // Datos del catálogo
import 'package:nica_app/core/data/verification.dart'; // Reglas a probar
import 'package:nica_app/core/widgets/estado_verificacion.dart'; // Estados de cada campo

void main() {
  test('ubicación según su precisión (igual que la web)', () {
    expect(locationState('exact'), isA<Pending>()); // Exacta pero sin comprobar en terreno
    expect(locationState('approximate'), isA<Approximate>()); // Aproximada
    expect(locationState('restricted'), isA<Restricted>()); // Protegida
  });

  test('sin horarios ni tarifas no se inventa nada', () {
    expect(hoursState(const []), isA<Unconfirmed>()); // Horarios sin confirmar
    expect(pricesState(const []), isA<AskProvider>()); // Tarifas: consultar al prestador
  });

  test('horarios y tarifas usan la fecha de comprobación más reciente', () {
    final hours = [
      OpeningHours(weekday: 1, opensAt: '08:00:00', closesAt: '17:00:00', closed: false, verifiedAt: DateTime(2026, 3, 1)), // Comprobado en marzo
      OpeningHours(weekday: 2, opensAt: '08:00:00', closesAt: '17:00:00', closed: false, verifiedAt: DateTime(2026, 9, 1)), // Comprobado en septiembre
    ];
    final s = hoursState(hours) as Verified; // Estado
    expect(s.date, DateTime(2026, 9, 1)); // La fecha más reciente
  });

  test('enlaces de contacto seguros', () {
    expect(contactUri(const Contact('whatsapp', '+505 8888-0000')).toString(), 'https://wa.me/50588880000'); // WhatsApp solo con dígitos
    expect(contactUri(const Contact('phone', '(505) 2222 1111')).toString(), 'tel:+50522221111'); // Llamada
    expect(contactUri(const Contact('email', 'hola@ejemplo.ni'))!.scheme, 'mailto'); // Correo
    expect(contactUri(const Contact('website', 'javascript:alert(1)')), isNull); // Nada que no sea web completa
    expect(contactUri(const Contact('instagram', 'https://instagram.com/x')).toString(), 'https://instagram.com/x'); // Red social con https
    expect(contactUri(const Contact('whatsapp', 'sin número')), isNull); // Sin dígitos no hay enlace
  });

  test('negocio: identidad comprobada solo si está en el alcance verificado', () {
    final b = BusinessDetail(
      data: {'id': 'b1', 'name': 'Comedor', 'verified_scope': ['identity'], 'verified_at': '2026-08-10T00:00:00Z', 'location_precision': 'approximate'}, // Identidad verificada, ubicación aproximada
      contacts: const [], // Sin contactos
      hours: const [], // Sin horarios
      prices: const [], // Sin tarifas
    );
    final rows = businessRows(b); // Filas
    expect(rows[0].$2, isA<Verified>()); // Identidad comprobada
    expect(rows[1].$2, isA<Approximate>()); // Ubicación aproximada
    expect(rows[3].$2, isA<AskProvider>()); // Tarifas por consultar
  });
}
