import 'dart:convert'; // Leer el JSON de los textos

import 'package:flutter/services.dart'; // rootBundle: leer archivos incluidos en la app
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod

/// Una sección de una página legal: título y párrafos o puntos.
class LegalSection {
  const LegalSection({required this.heading, this.body = const [], this.items = const [], this.aviso}); // Constructor
  final String heading; // Título de la sección
  final List<String> body; // Párrafos
  final List<String> items; // Lista de puntos
  final String? aviso; // Aviso destacado (opcional)

  /// Crea la sección a partir del JSON.
  factory LegalSection.fromJson(Map<String, dynamic> j) => LegalSection(
        heading: j['heading'] as String, // Título
        body: (j['body'] as List?)?.cast<String>() ?? const [], // Párrafos (o ninguno)
        items: (j['items'] as List?)?.cast<String>() ?? const [], // Puntos (o ninguno)
        aviso: j['aviso'] as String?, // Aviso destacado (si lo hay)
      );
}

/// Una página legal completa.
class LegalPage {
  const LegalPage({required this.slug, required this.title, required this.summary, required this.sections}); // Constructor
  final String slug; // Identificador (por ejemplo "privacidad")
  final String title; // Título
  final String summary; // Resumen de una línea
  final List<LegalSection> sections; // Secciones

  /// Crea la página a partir del JSON.
  factory LegalPage.fromJson(Map<String, dynamic> j) => LegalPage(
        slug: j['slug'] as String, // Identificador
        title: j['title'] as String, // Título
        summary: j['summary'] as String, // Resumen
        sections: (j['sections'] as List).map((s) => LegalSection.fromJson(s as Map<String, dynamic>)).toList(), // Secciones
      );
}

/// Archivo completo de textos legales de un idioma.
class LegalFile {
  const LegalFile({required this.version, required this.statusNote, required this.pages}); // Constructor
  final String version; // Fecha de la versión vigente (AAAA-MM-DD)
  final String statusNote; // Aviso de borrador para revisión legal
  final List<LegalPage> pages; // Páginas

  /// Lee el archivo desde el texto JSON.
  factory LegalFile.parse(String raw) {
    final j = jsonDecode(raw) as Map<String, dynamic>; // Convierte el texto en mapa
    return LegalFile(
      version: j['version'] as String, // Versión
      statusNote: j['status_note'] as String, // Aviso de borrador
      pages: (j['pages'] as List).map((p) => LegalPage.fromJson(p as Map<String, dynamic>)).toList(), // Páginas
    );
  }
}

/// Textos legales en español (los mismos de la web; scripts/sync_legal.py los copia y CI lo comprueba).
final legalProvider = FutureProvider<LegalFile>((ref) async {
  final raw = await rootBundle.loadString('assets/legal/es.json'); // Lee el archivo incluido en la app
  return LegalFile.parse(raw); // Lo convierte en objetos
});

/// Separa el texto en trozos normales y [marcador: …] para resaltarlos.
List<({bool marker, String text})> splitMarkers(String text) {
  final parts = <({bool marker, String text})>[]; // Trozos resultantes
  var last = 0; // Dónde terminó el último trozo
  for (final m in RegExp(r'\[marcador:[^\]]*\]').allMatches(text)) {
    // Cada marcador encontrado
    if (m.start > last) parts.add((marker: false, text: text.substring(last, m.start))); // Texto antes del marcador
    parts.add((marker: true, text: m.group(0)!)); // El marcador
    last = m.end; // Avanza
  }
  if (last < text.length) parts.add((marker: false, text: text.substring(last))); // Texto final
  return parts; // Lista de trozos
}
