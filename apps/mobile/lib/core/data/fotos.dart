import 'dart:convert'; // Para leer el catálogo

import 'package:flutter/services.dart'; // Acceso a los archivos incluidos en la app

/// Una foto real con licencia libre (Wikimedia Commons) y los datos de su crédito.
class FotoReal {
  const FotoReal({required this.clave, required this.lugar, required this.autor, required this.licencia, required this.pagina}); // Constructor
  final String clave; // Slug del territorio o "portada-<zona>"
  final String lugar; // Qué se ve
  final String autor; // Quién la tomó
  final String licencia; // Licencia libre (CC0, CC BY…)
  final String pagina; // Página de origen en Commons

  String get asset => 'assets/fotos/$clave-800.webp'; // Archivo dentro de la app
}

/// Catálogo de fotos reales (copiado desde content/fotos por scripts/sync_fotos.py). Se carga una vez al abrir la app;
/// si no está (por ejemplo, en pruebas), las pantallas usan las ilustraciones.
class FotosReales {
  static Map<String, FotoReal> _fotos = const {}; // Fotos por clave

  /// Lee el catálogo de los archivos de la app.
  static Future<void> cargar() async {
    try {
      final raw = jsonDecode(await rootBundle.loadString('assets/fotos/fotos.json')) as Map<String, dynamic>; // Catálogo
      final fotos = raw['fotos'] as Map<String, dynamic>; // Fotos
      _fotos = {
        for (final e in fotos.entries)
          e.key: FotoReal(clave: e.key, lugar: e.value['lugar'] as String, autor: e.value['autor'] as String, licencia: e.value['licencia'] as String, pagina: e.value['pagina'] as String), // Una foto
      };
    } catch (_) {
      _fotos = const {}; // Sin catálogo: se usan las ilustraciones
    }
  }

  /// Foto de una clave, o null si no hay.
  static FotoReal? de(String clave) => _fotos[clave];

  /// Todas las fotos, para la pantalla de créditos.
  static List<FotoReal> todas() => _fotos.values.toList();

  /// Solo para pruebas: fija el catálogo.
  static void fijarParaPruebas(Map<String, FotoReal> fotos) => _fotos = fotos;
}
