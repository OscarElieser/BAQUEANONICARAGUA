import 'package:firebase_auth/firebase_auth.dart'; // Tipo User
import 'package:flutter/material.dart'; // Componentes de Flutter
import 'package:flutter_localizations/flutter_localizations.dart'; // Textos del sistema en español
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Reemplazo de proveedores
import 'package:flutter_test/flutter_test.dart'; // Herramientas de pruebas de widgets
import 'package:nica_app/core/theme.dart'; // Tema
import 'package:nica_app/features/auth/auth_repository.dart'; // Sesión
import 'package:nica_app/features/baqui/baqui_screen.dart'; // Pantalla de BAQÜI
import 'package:nica_app/features/baqui/escenario_baqui.dart'; // BAQÜI en persona y su cara

import 'apoyo/baqui_falso.dart'; // Video, asistente y sesión falsos

/// Monta lo que se prueba con el video y el asistente falsos (y, si se pide, con las animaciones quitadas en Android).
Widget app(Widget home, {required FakeVideoBaqui video, FakeBaqui? baqui, User? usuario, bool sinAnimaciones = false}) => ProviderScope(
      overrides: [
        videoBaquiProvider.overrideWithValue(() => video), // Video falso
        baquiRepositoryProvider.overrideWithValue(baqui ?? FakeBaqui()), // Asistente falso
        authStateProvider.overrideWith((ref) => Stream<User?>.value(usuario)), // Sesión elegida por la prueba
      ],
      child: MaterialApp(
        theme: buildTheme(Brightness.light, webFonts: false), // Tema sin descargar fuentes
        locale: const Locale('es'), // Español
        supportedLocales: const [Locale('es')], // Solo español en la prueba
        localizationsDelegates: GlobalMaterialLocalizations.delegates, // Textos del sistema
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(disableAnimations: sinAnimaciones), // Ajuste de accesibilidad de Android
          child: child!, // La pantalla
        ),
        home: home, // Lo que se prueba
      ),
    );

/// BAQÜI en persona con el ancho que tiene en su pantalla.
Widget escenario({int respuestas = 0}) => Scaffold(body: Center(child: SizedBox(width: 320, child: EscenarioBaqui(respuestas: respuestas))));

/// Teléfono alto (360 × 1200 puntos): la conversación de la prueba cabe entera y BAQÜI queda a la vista.
void telefonoAlto(WidgetTester tester) {
  tester.view.physicalSize = const Size(1080, 3600); // Píxeles físicos
  tester.view.devicePixelRatio = 3; // Densidad de un teléfono
  addTearDown(tester.view.reset); // Vuelve al tamaño normal al terminar
}

/// Monta a BAQÜI con un contador de respuestas que la prueba puede subir.
Future<void Function()> conRespuestas(WidgetTester tester, FakeVideoBaqui video, {bool sinAnimaciones = false}) async {
  var respuestas = 0; // Respuestas de la conversación
  late StateSetter redibujar; // Para redibujar con una respuesta más
  await tester.pumpWidget(app(
    StatefulBuilder(builder: (context, setState) {
      redibujar = setState; // Guarda cómo redibujar
      return escenario(respuestas: respuestas); // BAQÜI con las respuestas actuales
    }),
    video: video, // Video falso
    sinAnimaciones: sinAnimaciones, // Ajuste de accesibilidad
  ));
  return () => redibujar(() => respuestas++); // Llega una respuesta nueva
}

void main() {
  testWidgets('BAQÜI se presenta solo, se puede pausar, seguir y ver de nuevo', (tester) async {
    final video = FakeVideoBaqui(listo: true); // Video disponible
    await tester.pumpWidget(app(escenario(), video: video)); // Abre
    await tester.pump(); // Termina de preparar
    expect(video.desde, [Duration.zero]); // La presentación arrancó sola, desde el comienzo
    expect(find.bySemanticsLabel(RegExp('pájaro explorador')), findsOneWidget); // Descrito para lectores de pantalla
    await tester.tap(find.text('Pausar')); // Lo pausa (dura más de 5 segundos: WCAG 2.2.2)
    await tester.pump(); // Redibuja
    expect(video.pausas, 1); // Se pausó
    await tester.tap(find.text('Ver a BAQÜI')); // Sigue
    await tester.pump(); // Redibuja
    expect(video.seguidas, 1); // Siguió desde donde quedó
    expect(video.desde, [Duration.zero]); // Sin volver a empezar
    video.terminar(); // Llega al final
    await tester.pump(); // Redibuja
    await tester.tap(find.text('Ver de nuevo')); // Lo ve otra vez
    await tester.pump(); // Redibuja
    expect(video.desde, [Duration.zero, Duration.zero]); // Otra vez desde el comienzo
    await tester.pumpWidget(const SizedBox()); // Cierra
    expect(video.liberado, isTrue); // Liberó el reproductor
  });

  testWidgets('cada respuesta nueva, BAQÜI la señala desde el segundo 6', (tester) async {
    final video = FakeVideoBaqui(listo: true); // Video disponible
    final responder = await conRespuestas(tester, video); // Abre con el contador
    await tester.pump(); // Termina de preparar y se presenta
    responder(); // Llega una respuesta
    await tester.pump(); // Redibuja
    expect(video.desde, [Duration.zero, const Duration(seconds: 6)]); // Presentación y luego señala
    expect(find.text('Pausar'), findsOneWidget); // Siempre se puede pausar
  });

  testWidgets('con las animaciones quitadas en Android no arranca solo ni señala; el botón lo muestra', (tester) async {
    final video = FakeVideoBaqui(listo: true); // Video disponible
    final responder = await conRespuestas(tester, video, sinAnimaciones: true); // Abre con el ajuste de accesibilidad
    await tester.pump(); // Termina de preparar
    expect(video.desde, isEmpty); // No arrancó solo
    responder(); // Llega una respuesta
    await tester.pump(); // Redibuja
    expect(video.desde, isEmpty); // Tampoco señala por su cuenta
    await tester.tap(find.text('Ver a BAQÜI')); // La persona decide verlo
    await tester.pump(); // Redibuja
    expect(video.desde, [Duration.zero]); // Ahora sí, desde el comienzo
  });

  testWidgets('si el video no se puede preparar queda su imagen quieta, sin botón', (tester) async {
    final video = FakeVideoBaqui(); // Teléfono sin decodificador
    await tester.pumpWidget(app(escenario(), video: video)); // Abre
    await tester.pump(); // Intenta preparar
    expect(find.text('Conoce a BAQÜI'), findsOneWidget); // Su presentación escrita
    expect(find.byType(OutlinedButton), findsNothing); // Sin botón que no haría nada
    expect(video.desde, isEmpty); // Nada que reproducir
  });

  testWidgets('conversación: BAQÜI piensa mientras espera, responde con saltitos y señala la respuesta', (tester) async {
    telefonoAlto(tester); // Todo a la vista
    final video = FakeVideoBaqui(listo: true); // Video disponible
    final baqui = FakeBaqui(); // Responde cuando la prueba diga
    await tester.pumpWidget(app(const BaquiScreen(), video: video, baqui: baqui, usuario: UsuarioFalso())); // Abre con sesión
    await tester.pump(); // Llega la sesión
    expect(video.desde, [Duration.zero]); // Se presentó una sola vez (la sesión que llega no lo reinicia)
    await tester.enterText(find.byType(TextField), '¿Qué hago 3 días en Granada?'); // Escribe
    await tester.tap(find.text('Enviar')); // Envía
    await tester.pump(); // Muestra su mensaje y la espera
    expect(baqui.preguntas, ['¿Qué hago 3 días en Granada?']); // La pregunta llegó tal cual
    expect(find.text('BAQÜI está pensando…'), findsOneWidget); // Avisa que piensa
    expect(find.byWidgetPredicate((w) => w is CaraBaqui && w.pensando), findsOneWidget); // Su cara piensa
    await tester.pump(const Duration(milliseconds: 400)); // Pasa el tiempo
    expect(tester.hasRunningAnimations, isTrue); // Ladea la cabeza mientras espera
    baqui.respuesta.complete(const RespuestaBaqui(texto: 'Granada tiene mucho por ver.', conversacion: 'c1')); // Responde
    await tester.pump(); // Muestra la respuesta
    expect(find.text('BAQÜI está pensando…'), findsNothing); // Ya no piensa
    expect(find.text('Granada tiene mucho por ver.'), findsOneWidget); // Su respuesta
    expect(find.byWidgetPredicate((w) => w is CaraBaqui && w.hablando), findsOneWidget); // La respuesta nueva "habla"
    await tester.pumpAndSettle(); // Tres saltitos y quieto
    expect(tester.hasRunningAnimations, isFalse); // Los saltitos terminan solos
    expect(video.desde, [Duration.zero, const Duration(seconds: 6)]); // Con BAQÜI a la vista, señaló la respuesta
  });

  testWidgets('con una respuesta larga la conversación baja y BAQÜI, que ya no se ve, no la señala', (tester) async {
    final video = FakeVideoBaqui(listo: true); // Video disponible
    final baqui = FakeBaqui(); // Responde cuando la prueba diga
    await tester.pumpWidget(app(const BaquiScreen(), video: video, baqui: baqui, usuario: UsuarioFalso())); // Abre con sesión (pantalla de prueba normal, 800 × 600)
    await tester.pump(); // Llega la sesión
    await tester.enterText(find.byType(TextField), 'Cuéntame de Ometepe'); // Escribe
    await tester.tap(find.text('Enviar')); // Envía
    await tester.pump(); // Muestra la espera
    baqui.respuesta.complete(RespuestaBaqui(texto: List.filled(40, 'Una línea de la respuesta.').join('\n'))); // Respuesta muy larga
    await tester.pumpAndSettle(); // Muestra la respuesta y termina de bajar
    final lista = tester.state<ScrollableState>(find.descendant(of: find.byType(ListView), matching: find.byType(Scrollable)).first).position; // Desplazamiento de la conversación (no el del campo de texto)
    expect(lista.pixels, greaterThan(160)); // Bajó hasta la respuesta
    expect(video.desde, [Duration.zero]); // No la señaló: BAQÜI ya no se veía
  });

  testWidgets('con las animaciones quitadas, la cara de BAQÜI no se mueve', (tester) async {
    await tester.pumpWidget(app(const Scaffold(body: Center(child: CaraBaqui(pensando: true))), video: FakeVideoBaqui(), sinAnimaciones: true)); // Piensa, sin animaciones
    await tester.pump(const Duration(milliseconds: 400)); // Pasa el tiempo
    expect(tester.hasRunningAnimations, isFalse); // Queda ladeada, quieta
  });
}
