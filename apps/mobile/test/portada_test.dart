import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_test/flutter_test.dart'; // Herramientas de prueba

import 'package:nica_app/core/theme.dart'; // Tema del sistema de diseño
import 'package:nica_app/core/widgets/portada_baqueano.dart'; // Portada con ventana pintada

void main() {
  test('el generador con semilla da los mismos números que la web', () {
    final r = Azar(1979); // Misma semilla que apps/web/src/lib/pincel.ts
    expect(r(), closeTo(0.930223544594, 1e-9)); // Primer número (calculado con la versión web)
    expect(r(), closeTo(0.427827072795, 1e-9)); // Segundo
    expect(r(), closeTo(0.719976603286, 1e-9)); // Tercero
  });

  test('la ventana tiene 8 bandas dentro del lienzo', () {
    final bandas = pinceladas(1979); // Bandas de la portada
    expect(bandas, hasLength(8)); // Ocho brochazos
    for (final b in bandas) {
      final caja = b.getBounds(); // Rectángulo de la banda (con cerdas)
      expect(caja.left, greaterThan(-120)); // Las cerdas no se van lejos del lienzo
      expect(caja.right, lessThan(1320)); // Ni por la derecha
    }
  });

  testWidgets('la portada cambia de escena y sus botones responden', (tester) async {
    var explorar = 0, viaje = 0; // Veces que se tocó cada botón
    await tester.pumpWidget(
      MaterialApp(
        theme: buildTheme(Brightness.light, webFonts: false), // Tema sin descargar fuentes
        home: Scaffold(
          body: SingleChildScrollView(
            child: SizedBox(width: 390, child: PortadaBaqueano(onExplorar: () => explorar++, onViaje: () => viaje++)), // Ancho de teléfono
          ),
        ),
      ),
    );
    await tester.pumpAndSettle(); // Termina de pintar la ventana
    await tester.tap(find.byKey(const Key('escena-caribe'))); // Elige el Caribe
    await tester.pumpAndSettle(); // Termina el fundido
    expect(tester.takeException(), isNull); // Sin errores al dibujar
    await tester.tap(find.byType(FilledButton)); // "Explorar Nicaragua"
    await tester.tap(find.byType(OutlinedButton)); // "Crear mi viaje"
    expect(explorar, 1); // Pidió bajar al mapa
    expect(viaje, 1); // Pidió abrir Mi aventura
  });
}
