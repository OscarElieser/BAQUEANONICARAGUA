import 'dart:math' as math; // Funciones trigonométricas para la proyección 3D

import 'package:flutter/material.dart'; // Componentes visuales de Flutter

import '../i18n/t.dart'; // Textos traducidos
import '../theme.dart'; // Colores del sistema de diseño

/// Cima del relieve: posición, tamaño de la base, altura, número de capas y nombre.
class _Cima {
  const _Cima(this.x, this.z, this.rx, this.rz, this.altura, this.capas, this.nombre); // Guarda los datos
  final double x, z, rx, rz, altura; // Posición, radios de la base y altura
  final int capas; // Número de curvas de nivel
  final String nombre; // Nombre que se muestra al tocarla
}

// Mismo relieve estilizado que la web (Ometepe como forma de diseño, no modelo topográfico)
const _cimas = [
  _Cima(-1.3, -0.2, 2.4, 1.8, 2.2, 9, 'Volcán Concepción'), // Cima mayor
  _Cima(1.6, 0.6, 1.6, 1.25, 1.35, 7, 'Volcán Maderas'), // Cima menor
];

/// "Relieve vivo" para Android: capas de curvas de nivel en perspectiva.
/// Se gira con el dedo, gira despacio en reposo y al tocar una cima muestra su nombre.
/// Con "quitar animaciones" activado en el teléfono queda quieto.
class RelieveVivo3D extends StatefulWidget {
  const RelieveVivo3D({super.key}); // Constructor constante

  @override
  State<RelieveVivo3D> createState() => _RelieveVivo3DState(); // Crea el estado animado
}

class _RelieveVivo3DState extends State<RelieveVivo3D> with SingleTickerProviderStateMixin {
  late final AnimationController _reloj; // Reloj que impulsa la animación
  double _giro = 0.6; // Ángulo horizontal (radianes)
  double _inclinacion = 0.55; // Ángulo vertical (radianes)
  bool _tocando = false; // Si el dedo está girando el relieve
  String? _cimaElegida; // Nombre de la cima tocada

  @override
  void initState() {
    super.initState(); // Inicializa el estado base
    _reloj = AnimationController(vsync: this, duration: const Duration(seconds: 60)) // Un ciclo largo
      ..addListener(_alAvanzar) // Cada cuadro actualiza el giro automático
      ..repeat(); // Se repite sin fin
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies(); // Actualiza dependencias base
    final sinAnimaciones = MediaQuery.of(context).disableAnimations; // Preferencia del sistema "quitar animaciones"
    if (sinAnimaciones && _reloj.isAnimating) _reloj.stop(); // Detiene la animación si la persona la desactivó
    if (!sinAnimaciones && !_reloj.isAnimating) _reloj.repeat(); // La reanuda si vuelve a activarla
  }

  void _alAvanzar() {
    if (_tocando) return; // Mientras el dedo gira, no hay giro automático
    setState(() => _giro += 0.0018); // Giro lento en reposo
  }

  @override
  void dispose() {
    _reloj.dispose(); // Libera el reloj de animación
    super.dispose(); // Libera el resto
  }

  @override
  Widget build(BuildContext context) {
    final tv = context.tv; // Colores del tema actual
    final flotar = math.sin(_reloj.value * math.pi * 2 * 8) * 4; // Flotación suave (píxeles)
    return Semantics(
      label: context.t('relief.aria_touch'), // Descripción accesible
      image: true, // Para lectores de pantalla es una imagen
      child: GestureDetector(
        onPanStart: (_) => _tocando = true, // Empieza a girar con el dedo
        onPanUpdate: (d) => setState(() {
          _giro += d.delta.dx * 0.01; // Deslizar en horizontal gira el relieve
          _inclinacion = (_inclinacion - d.delta.dy * 0.005).clamp(0.25, 0.95); // Deslizar en vertical lo inclina (con límites)
        }),
        onPanEnd: (_) => _tocando = false, // Al soltar vuelve el giro automático
        onTapUp: (d) => _alTocar(d.localPosition, context.size ?? Size.zero), // Toque para elegir una cima
        child: Stack(
          children: [
            Positioned.fill(
              child: Transform.translate(
                offset: Offset(0, flotar), // Aplica la flotación
                child: CustomPaint(painter: _RelievePainter(giro: _giro, inclinacion: _inclinacion, tv: tv)), // Dibuja el relieve
              ),
            ),
            if (_cimaElegida != null)
              Positioned(
                left: 20, // Margen izquierdo
                top: 16, // Margen superior
                child: Text(_cimaElegida!, style: Theme.of(context).textTheme.displaySmall), // Nombre de la cima tocada
              ),
          ],
        ),
      ),
    );
  }

  /// Busca la cima más cercana al toque (dentro de 36 píxeles).
  void _alTocar(Offset toque, Size tamano) {
    String? encontrada; // Cima encontrada (si alguna)
    double mejor = 36; // Distancia máxima aceptada
    for (final c in _cimas) {
      // Recorre las cimas
      final p = _proyectar(c.x, c.altura + 0.12, c.z, _giro, _inclinacion, tamano); // Posición en pantalla de la cima
      final d = (p - toque).distance; // Distancia entre el toque y la cima
      if (d < mejor) {
        // Si está más cerca que la mejor hasta ahora
        mejor = d; // Guarda la nueva distancia
        encontrada = c.nombre; // Guarda la cima
      }
    }
    setState(() => _cimaElegida = encontrada); // Muestra el nombre (o lo oculta si no se tocó ninguna)
  }
}

/// Convierte un punto 3D en un punto de la pantalla con perspectiva.
Offset _proyectar(double x, double y, double z, double giro, double inclinacion, Size tamano) {
  final cosG = math.cos(giro), sinG = math.sin(giro); // Seno y coseno del giro
  final x1 = x * cosG - z * sinG; // Gira el punto alrededor del eje vertical
  final z1 = x * sinG + z * cosG; // Profundidad tras el giro
  final cosI = math.cos(inclinacion), sinI = math.sin(inclinacion); // Seno y coseno de la inclinación
  final y2 = y * cosI - z1 * sinI; // Inclina el punto hacia la cámara
  final z2 = y * sinI + z1 * cosI; // Profundidad tras la inclinación
  const distancia = 9.0; // Distancia de la cámara al relieve
  final f = distancia / (distancia + z2); // Factor de perspectiva (lo lejano se ve más pequeño)
  final escala = tamano.width / 9.5; // Tamaño del relieve según el ancho disponible
  return Offset(tamano.width / 2 + x1 * f * escala, tamano.height * 0.62 - y2 * f * escala); // Punto final en pantalla
}

/// Pinta las capas de cada cima desde la base hacia la cima.
class _RelievePainter extends CustomPainter {
  _RelievePainter({required this.giro, required this.inclinacion, required this.tv}); // Recibe ángulos y colores
  final double giro, inclinacion; // Ángulos de la vista
  final TvColors tv; // Colores del tema

  @override
  void paint(Canvas canvas, Size size) {
    final capas = <({double profundidad, Path forma, Color relleno, Color borde, double grosor})>[]; // Capas a dibujar
    for (var ci = 0; ci < _cimas.length; ci++) {
      // Recorre cada cima
      final c = _cimas[ci]; // Cima actual
      final alto = c.altura / c.capas; // Altura de cada capa
      for (var i = 0; i < c.capas; i++) {
        // Recorre las capas de la base a la cima
        final t = i / (c.capas - 1); // 0 en la base, 1 en la cima
        final escala = 1 - t * 0.88; // Cada capa es más pequeña
        final cx = c.x - t * 0.08, cz = c.z - t * 0.12, y = i * alto + alto * 0.92; // Centro y altura de la tapa superior
        final path = Path(); // Contorno proyectado de la capa
        for (var k = 0; k <= 48; k++) {
          // 48 puntos alrededor de la elipse
          final a = k / 48 * math.pi * 2; // Ángulo del punto
          final p = _proyectar(cx + math.cos(a) * c.rx * escala, y, cz + math.sin(a) * c.rz * escala, giro, inclinacion, size); // Punto en pantalla
          if (k == 0) {
            path.moveTo(p.dx, p.dy); // Primer punto: empieza el contorno
          } else {
            path.lineTo(p.dx, p.dy); // Siguientes puntos: continúa el contorno
          }
        }
        path.close(); // Cierra la elipse
        final profundidad = (cx * math.sin(giro) + cz * math.cos(giro)) - y * 10; // Orden de dibujo: primero lo de atrás y abajo
        capas.add((
          profundidad: profundidad, // Para ordenar
          forma: path, // Contorno
          relleno: Color.lerp(const Color(0xFF0D5448), TvColors.oro, math.pow(t, 1.6).toDouble())!, // Del verde al oro
          borde: TvColors.oro.withValues(alpha: 0.35 + t * 0.6), // Curva de nivel dorada
          grosor: i == c.capas - 1 ? 2 : 1.2, // La cima con línea más gruesa
        ));
      }
    }
    capas.sort((a, b) => b.profundidad.compareTo(a.profundidad)); // Dibuja de atrás hacia adelante
    for (final capa in capas) {
      // Pinta cada capa
      canvas.drawPath(capa.forma, Paint()..color = capa.relleno); // Relleno de la capa
      canvas.drawPath(
        capa.forma, // Mismo contorno
        Paint()
          ..style = PaintingStyle.stroke // Solo el borde
          ..strokeWidth = capa.grosor // Grosor del borde
          ..color = capa.borde, // Color del borde
      );
    }
    for (var ci = 0; ci < _cimas.length; ci++) {
      // Marca cada cima con un punto
      final c = _cimas[ci]; // Cima actual
      final p = _proyectar(c.x - 0.08, c.altura + 0.12, c.z - 0.12, giro, inclinacion, size); // Posición de la cima
      canvas.drawCircle(p, 5, Paint()..color = ci == 0 ? TvColors.terracota : TvColors.oro); // Terracota en la cima principal
    }
  }

  @override
  bool shouldRepaint(_RelievePainter old) => old.giro != giro || old.inclinacion != inclinacion || old.tv != tv; // Redibuja si cambia la vista o el tema
}
