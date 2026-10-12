import 'dart:convert'; // Para leer el JSON del mapa
import 'dart:io'; // Lectura directa del archivo (sin esperas asíncronas en la prueba)

import 'package:flutter/material.dart'; // Componentes de Flutter
import 'package:flutter_test/flutter_test.dart'; // Herramientas de pruebas de widgets
import 'package:nica_app/core/theme.dart'; // Tema del sistema de diseño
import 'package:nica_app/core/widgets/mapa_territorios.dart'; // Widget a probar
import 'package:nica_app/core/widgets/portada_territorio.dart'; // Portadas y tarjetas

void main() {
  final mapa = DatosMapa.fromJson(jsonDecode(File('assets/mapa/mapa.json').readAsStringSync()) as Map<String, dynamic>); // Mismo archivo que usa la app

  test('el trazo SVG se convierte en una forma cerrada', () {
    final p = parseSvgPath('M0 0L10 0L10 10L0 10Z'); // Un cuadrado
    expect(p.contains(const Offset(5, 5)), isTrue); // El centro está dentro
    expect(p.contains(const Offset(15, 5)), isFalse); // Fuera del cuadrado
  });

  test('el mapa trae los 17 territorios y los 2 lagos, y cada etiqueta cae en su territorio', () {
    expect(mapa.territories, hasLength(17)); // 15 departamentos y 2 regiones autónomas
    expect(mapa.lakes, hasLength(2)); // Cocibolca y Xolotlán
    for (final t in mapa.territories) {
      expect(mapa.territoryAt(t.label)?.id, t.id, reason: 'La etiqueta de ${t.name} debe tocar ${t.name}'); // Tocar el nombre abre ese territorio
    }
    for (final l in mapa.lakes) {
      expect(mapa.territoryAt(l.label), isNull, reason: 'Tocar ${l.name} no abre ningún territorio'); // El agua no es un territorio
    }
  });

  testWidgets('tocar un territorio publicado abre su ficha; uno pendiente solo muestra su estado', (tester) async {
    final opened = <String>[]; // Fichas que se pidieron abrir
    await tester.pumpWidget(
      MaterialApp(
        theme: buildTheme(Brightness.dark, webFonts: false), // Tema sin descargar fuentes (las pruebas no tienen red)
        home: Scaffold(
          body: SingleChildScrollView(
            child: SizedBox(
              width: 390, // Ancho de teléfono
              child: MapaTerritorios(mapa: mapa, published: const {'boaco'}, onOpen: (f) => opened.add(f.id)), // Solo Boaco publicado
            ),
          ), // Con desplazamiento, como en la pantalla real (la leyenda va debajo del mapa)
        ),
      ),
    );
    final lienzo = find.descendant(of: find.byType(MapaTerritorios), matching: find.byType(CustomPaint)).first; // Dibujo del mapa (el primero; los botones de la leyenda también dibujan)
    final origin = tester.getTopLeft(lienzo); // Esquina del dibujo en pantalla
    final scale = tester.getSize(lienzo).width / mapa.size.width; // Escala del mapa en pantalla
    Offset onScreen(String slug) => origin + mapa.territories.firstWhere((t) => t.id == slug).label * scale; // Punto del territorio en pantalla

    await tester.tapAt(onScreen('chontales')); // Toca un territorio aún sin ficha
    await tester.pump(); // Redibuja
    expect(opened, isEmpty); // No abre nada
    expect(find.textContaining('Chontales'), findsOneWidget); // Pero muestra su nombre y estado

    await tester.tapAt(onScreen('boaco')); // Toca el territorio publicado
    await tester.pump(); // Redibuja
    expect(opened, ['boaco']); // Pide abrir su ficha
    expect(tester.takeException(), isNull); // Sin errores al dibujar

    final caribe = find.byType(ChoiceChip).last; // Último botón de la leyenda: Caribe (el idioma de la prueba puede variar)
    await tester.ensureVisible(caribe); // Lo trae a la vista
    await tester.tap(caribe); // Elige esa zona
    await tester.pump(); // Redibuja
    expect(tester.widget<ChoiceChip>(caribe).selected, isTrue); // Queda marcada
    expect(tester.takeException(), isNull); // Sin errores al apagar las otras zonas
  });

  testWidgets('las 17 portadas se dibujan sin errores y cada territorio tiene su zona', (tester) async {
    for (final f in mapa.territories) {
      expect(['pacifico', 'norte', 'caribe'], contains(f.zone), reason: '${f.name} necesita zona'); // Zona válida
    }
    await tester.pumpWidget(
      MaterialApp(
        theme: buildTheme(Brightness.dark, webFonts: false), // Tema sin red
        home: Scaffold(
          body: GridView.count(
            crossAxisCount: 4, // Cuatro por fila
            children: [for (final f in mapa.territories) PortadaTerritorio(mapa: mapa, slug: f.id)], // Las 17
          ),
        ),
      ),
    );
    await tester.pump(); // Dibuja
    expect(tester.takeException(), isNull); // Ninguna falló
  });

  testWidgets('la tarjeta de un territorio publicado se abre; la pendiente no', (tester) async {
    var abiertas = 0; // Veces que se pidió abrir
    final rivas = mapa.territories.firstWhere((t) => t.id == 'rivas'); // Territorio de prueba
    await tester.pumpWidget(
      MaterialApp(
        theme: buildTheme(Brightness.dark, webFonts: false), // Tema sin red
        home: Scaffold(
          body: Row(
            children: [
              SizedBox(width: 168, child: TarjetaTerritorio(key: const Key('pub'), mapa: mapa, forma: rivas, published: true, onOpen: () => abiertas++)), // Publicada
              SizedBox(width: 168, child: TarjetaTerritorio(key: const Key('pen'), mapa: mapa, forma: rivas, published: false, onOpen: () => abiertas++)), // Pendiente
            ],
          ),
        ),
      ),
    );
    await tester.tap(find.byKey(const Key('pen'))); // Toca la pendiente
    expect(abiertas, 0); // No abre
    await tester.tap(find.byKey(const Key('pub'))); // Toca la publicada
    expect(abiertas, 1); // Abre su ficha
    expect(find.bySemanticsLabel(RegExp('^Rivas\\.')), findsNWidgets(2)); // Ambas dicen su nombre a los lectores de pantalla
  });
}
