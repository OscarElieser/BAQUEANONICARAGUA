import 'package:flutter/material.dart'; // Componentes de Flutter
import 'package:flutter_test/flutter_test.dart'; // Herramientas de pruebas de widgets
import 'package:nica_app/core/theme.dart'; // Tema del sistema de diseño
import 'package:nica_app/core/widgets/relieve_3d.dart'; // Widget a probar

void main() {
  testWidgets('el relieve 3D se dibuja, se gira con el dedo y es accesible', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: buildTheme(Brightness.dark, webFonts: false), // Tema sin descargar fuentes (las pruebas no tienen red)
        home: const Scaffold(body: SizedBox(width: 390, height: 280, child: RelieveVivo3D())), // Tamaño de teléfono
      ),
    );
    await tester.pump(const Duration(milliseconds: 100)); // Avanza un poco la animación
    expect(find.bySemanticsLabel(RegExp('Relieve en 3D')), findsOneWidget); // Tiene descripción para lectores de pantalla
    await tester.drag(find.byType(RelieveVivo3D), const Offset(120, -40)); // Gira con un deslizamiento
    await tester.pump(); // Redibuja tras el giro
    expect(tester.takeException(), isNull); // No hubo errores al dibujar ni al girar
  });
}
