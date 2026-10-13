// Piezas falsas para probar a BAQÜI sin reproductor de video, sin Firebase y sin Gemini.
// No termina en _test.dart: flutter test no lo corre solo, lo usan las pruebas que lo importan.
import 'dart:async'; // Completer para decidir cuándo responde BAQÜI

import 'package:firebase_auth/firebase_auth.dart'; // Tipo User
import 'package:flutter/material.dart'; // Componentes de Flutter
import 'package:nica_app/core/theme.dart'; // Colores del sistema de diseño
import 'package:nica_app/features/baqui/baqui_screen.dart'; // Asistente a reemplazar
import 'package:nica_app/features/baqui/escenario_baqui.dart'; // Video a reemplazar

/// Video falso de BAQÜI: la prueba decide si se puede preparar y anota lo que la pantalla le pide.
class FakeVideoBaqui implements VideoBaqui {
  FakeVideoBaqui({this.listo = false}); // Por defecto no hay reproductor (queda la imagen quieta)
  final bool listo; // Si el "video" se puede preparar
  final desde = <Duration>[]; // Desde dónde se pidió reproducir, en orden
  int pausas = 0; // Veces que se pausó
  int seguidas = 0; // Veces que siguió desde la pausa
  bool liberado = false; // Si se liberó
  VoidCallback? _fin; // Aviso de final que dejó la pantalla

  /// La prueba hace llegar el video al final.
  void terminar() => _fin?.call(); // Avisa a la pantalla

  @override
  Future<bool> preparar() async => listo; // Resultado elegido por la prueba

  @override
  Widget vista() => const ColoredBox(color: TvColors.marcaNaranja, child: SizedBox.expand()); // Hace de video

  @override
  Future<void> reproducirDesde(Duration d) async {
    desde.add(d); // Anota desde dónde
  }

  @override
  Future<void> pausar() async {
    pausas++; // Anota la pausa
  }

  @override
  Future<void> seguir() async {
    seguidas++; // Anota que siguió
  }

  @override
  void alTerminar(VoidCallback fn) => _fin = fn; // Guarda el aviso

  @override
  void liberar() => liberado = true; // Anota la liberación
}

/// Asistente falso: anota las preguntas y responde cuando la prueba completa la respuesta.
class FakeBaqui implements BaquiRepository {
  final preguntas = <String>[]; // Lo que se le preguntó
  final respuesta = Completer<RespuestaBaqui>(); // Respuesta pendiente (la completa la prueba)

  @override
  Future<RespuestaBaqui> enviar(String mensaje, String locale, String? conversacion) {
    preguntas.add(mensaje); // Anota la pregunta
    return respuesta.future; // Responde cuando la prueba lo diga
  }
}

/// Persona con sesión abierta (las pantallas probadas solo preguntan si hay alguien).
class UsuarioFalso implements User {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation); // Nada más se usa en estas pruebas
}
