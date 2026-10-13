import 'dart:async'; // Completer para decidir cuándo termina el video falso

import 'package:flutter/material.dart'; // Componentes de Flutter
import 'package:flutter_localizations/flutter_localizations.dart'; // Textos del sistema en español
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Reemplazo de proveedores
import 'package:flutter_test/flutter_test.dart'; // Herramientas de pruebas de widgets
import 'package:nica_app/core/theme.dart'; // Colores del sistema de diseño
import 'package:nica_app/features/intro/intro_revelacion.dart'; // Intro a probar

/// Reproductor falso: la prueba decide si se puede preparar y cuándo termina.
class FakeReproductor implements ReproductorIntro {
  FakeReproductor({this.listo = true}); // Por defecto se puede reproducir
  final bool listo; // Si el "video" se puede preparar
  final terminado = Completer<void>(); // Se completa cuando la prueba quiere
  bool preparado = false; // Si se intentó preparar
  bool liberado = false; // Si se liberó

  @override
  Future<bool> preparar() async {
    preparado = true; // Anota el intento
    return listo; // Resultado elegido por la prueba
  }

  @override
  Widget vista() => const ColoredBox(color: TvColors.marcaNaranja, child: SizedBox.expand()); // Hace de video

  @override
  Future<void> reproducir() => terminado.future; // Termina cuando la prueba lo diga

  @override
  void liberar() => liberado = true; // Anota la liberación
}

/// Monta la app de prueba con la intro encima (y, si se pide, con las animaciones quitadas en Android).
Widget app(FakeReproductor r, {bool sinAnimaciones = false}) => ProviderScope(
      overrides: [reproductorIntroProvider.overrideWithValue(r)], // Reproductor falso
      child: MaterialApp(
        locale: const Locale('es'), // Español
        supportedLocales: const [Locale('es')], // Solo español en la prueba
        localizationsDelegates: GlobalMaterialLocalizations.delegates, // Textos del sistema
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(disableAnimations: sinAnimaciones), // Ajuste de accesibilidad de Android
          child: IntroRevelacion(child: child!), // La intro encima de la app
        ),
        home: const Scaffold(body: Text('Inicio de la app')), // La app de debajo
      ),
    );

void main() {
  testWidgets('la intro tapa la app mientras corre y se quita sola al terminar', (tester) async {
    final r = FakeReproductor(); // Video que se puede reproducir
    await tester.pumpWidget(app(r)); // Abre la app
    await tester.pump(); // Termina de preparar
    expect(find.text('Saltar'), findsOneWidget); // La intro está encima, con su botón
    expect(find.bySemanticsLabel('Logotipo de BAQUEANO'), findsOneWidget); // Descrita para lectores de pantalla
    r.terminado.complete(); // El video llega al final
    await tester.pumpAndSettle(); // Espera el desvanecido
    expect(find.text('Saltar'), findsNothing); // La capa ya no está
    expect(find.text('Inicio de la app'), findsOneWidget); // Queda la app
    expect(r.liberado, isTrue); // Y el video se liberó
  });

  testWidgets('se puede saltar con el botón', (tester) async {
    final r = FakeReproductor(); // Video que no termina solo
    await tester.pumpWidget(app(r)); // Abre la app
    await tester.pump(); // Termina de preparar
    await tester.tap(find.text('Saltar')); // Salta la intro
    await tester.pumpAndSettle(); // Espera el desvanecido
    expect(find.text('Saltar'), findsNothing); // La capa ya no está
    expect(r.liberado, isTrue); // El video se liberó
  });

  testWidgets('con las animaciones quitadas en Android no aparece ni prepara el video', (tester) async {
    final r = FakeReproductor(); // Video disponible
    await tester.pumpWidget(app(r, sinAnimaciones: true)); // Abre la app con el ajuste de accesibilidad
    await tester.pump(); // Un cuadro
    expect(find.text('Saltar'), findsNothing); // Sin intro
    expect(r.preparado, isFalse); // Ni siquiera se preparó el video
  });

  testWidgets('si el video no se puede preparar, la app abre directo', (tester) async {
    final r = FakeReproductor(listo: false); // Teléfono sin decodificador
    await tester.pumpWidget(app(r)); // Abre la app
    await tester.pumpAndSettle(); // Espera
    expect(find.text('Saltar'), findsNothing); // Sin intro
    expect(find.text('Inicio de la app'), findsOneWidget); // La app está
    expect(r.liberado, isTrue); // Se liberó lo que se intentó preparar
  });
}
