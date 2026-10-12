import 'package:flutter/material.dart'; // Componentes visuales de Flutter

/// Greca escalonada (motivo de la cerámica precolombina de la región), igual que en la web.
/// Decorativa: se traza una sola vez al aparecer, salvo que el teléfono pida menos animación.
class Greca extends StatefulWidget {
  const Greca({super.key, required this.color, this.height = 36}); // Constructor
  final Color color; // Color del trazo
  final double height; // Alto del friso

  @override
  State<Greca> createState() => _GrecaState(); // Crea el estado
}

class _GrecaState extends State<Greca> with SingleTickerProviderStateMixin {
  late final AnimationController _trazo = AnimationController(vsync: this, duration: const Duration(milliseconds: 2400)); // Avance del trazo

  @override
  void didChangeDependencies() {
    super.didChangeDependencies(); // Primero lo de Flutter
    if (MediaQuery.disableAnimationsOf(context)) {
      _trazo.value = 1; // Sin animación: ya trazada
    } else if (_trazo.value == 0 && !_trazo.isAnimating) {
      _trazo.forward(); // Se traza una vez
    }
  }

  @override
  void dispose() {
    _trazo.dispose(); // Libera la animación
    super.dispose(); // Libera el resto
  }

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: SizedBox(
        height: widget.height, // Alto del friso
        width: double.infinity, // Todo el ancho
        child: AnimatedBuilder(
          animation: _trazo, // Redibuja con el avance
          builder: (_, __) => CustomPaint(painter: _PintorGreca(color: widget.color, avance: Curves.easeInOutCubic.transform(_trazo.value))), // Dibujo
        ),
      ),
    );
  }
}

class _PintorGreca extends CustomPainter {
  _PintorGreca({required this.color, required this.avance}); // Constructor
  final Color color; // Color
  final double avance; // De 0 (nada) a 1 (completa)

  @override
  void paint(Canvas canvas, Size size) {
    final a = size.height; // Alto
    final u = a * 1.2; // Ancho de cada espiral (misma proporción que la web: 48 × 40)
    final path = Path()..moveTo(0, a / 2); // Empieza a media altura
    for (var i = 0; i * u < size.width + u; i++) {
      final x = i * u; // Inicio de esta espiral
      double y(double v) => i.isOdd ? a - v : v; // Una de cada dos, volteada
      for (final (px, py) in [(0.0, a), (0.0, 4.0), (0.83, 4.0), (0.83, a * 0.72), (0.25, a * 0.72), (0.25, a * 0.32), (0.58, a * 0.32), (0.58, a * 0.5), (1.0, a * 0.5)]) {
        path.lineTo(x + u * px, y(py)); // Cada tramo de la espiral cuadrada
      }
    }
    final trazo = Paint()
      ..style = PaintingStyle.stroke // Solo línea
      ..strokeWidth = 3 // Grosor
      ..color = color; // Color
    for (final m in path.computeMetrics()) {
      canvas.drawPath(m.extractPath(0, m.length * avance), trazo); // Solo la parte ya trazada
    }
  }

  @override
  bool shouldRepaint(_PintorGreca old) => old.avance != avance || old.color != color; // Redibuja al avanzar
}
