import 'package:flutter/material.dart'; // Componentes de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // ProviderScope para los proveedores
import 'package:flutter_test/flutter_test.dart'; // Herramientas de pruebas de widgets
import 'package:nica_app/core/theme.dart'; // Tema del sistema de diseño
import 'package:nica_app/features/legal/legal_content.dart'; // Lectura de textos y marcadores
import 'package:nica_app/features/legal/legal_screen.dart'; // Pantallas a probar

void main() {
  test('los marcadores se separan del texto normal', () {
    final parts = splitMarkers('Opera [marcador: razón social] desde Managua.'); // Texto con un marcador
    expect(parts.length, 3); // Antes, marcador y después
    expect(parts[1].marker, isTrue); // El del medio es el marcador
    expect(parts[1].text, '[marcador: razón social]'); // Texto exacto del marcador
  });

  testWidgets('lista las seis páginas y abre Privacidad con sus secciones', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: buildTheme(Brightness.light, webFonts: false), // Tema sin descargar fuentes
          home: const LegalIndexScreen(), // Pantalla a probar
        ),
      ),
    );
    await tester.pumpAndSettle(); // Espera a que carguen los textos
    for (final title in ['Sobre nosotros', 'Aviso de privacidad', 'Cookies y almacenamiento', 'Términos de uso', 'Accesibilidad', 'Contacto']) {
      // Cada página debe aparecer en la lista
      await tester.scrollUntilVisible(find.text(title), 200); // Desplaza si hace falta
      expect(find.text(title), findsOneWidget); // Está en la lista
    }
    await tester.scrollUntilVisible(find.text('Aviso de privacidad'), -200); // Vuelve a la página de privacidad
    await tester.tap(find.text('Aviso de privacidad')); // La abre
    await tester.pumpAndSettle(); // Espera la transición
    await tester.scrollUntilVisible(find.text('Tus derechos'), 300, scrollable: find.byType(Scrollable).last); // Desplaza la página abierta (la lista sigue debajo)
    expect(find.text('Tus derechos'), findsOneWidget); // La sección de derechos existe
    expect(tester.takeException(), isNull); // Sin errores al dibujar
  });
}
