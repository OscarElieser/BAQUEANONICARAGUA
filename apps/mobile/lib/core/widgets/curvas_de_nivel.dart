import 'package:flutter/material.dart';
import '../theme.dart';

/// Motivo de relieve: anillos concéntricos en oro, opacidad creciente hacia la cima.
/// Decorativo salvo que reciba [semanticLabel].
class CurvasDeNivel extends StatelessWidget {
  const CurvasDeNivel({super.key, this.semanticLabel, this.rings = 6});

  final String? semanticLabel;
  final int rings;

  @override
  Widget build(BuildContext context) {
    final painter = CustomPaint(painter: _CurvasPainter(rings), size: Size.infinite);
    return semanticLabel == null
        ? ExcludeSemantics(child: painter)
        : Semantics(label: semanticLabel, image: true, child: painter);
  }
}

class _CurvasPainter extends CustomPainter {
  _CurvasPainter(this.rings);
  final int rings;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width * 0.54, size.height * 0.6);
    for (var i = 0; i < rings; i++) {
      final t = i / (rings - 1); // 0 = base, 1 = cima
      final scale = 1 - t * 0.85;
      final paint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = i == rings - 1 ? 2 : 1.2
        ..color = TvColors.oro.withValues(alpha: 0.15 + t * 0.8);
      canvas.drawOval(
        Rect.fromCenter(
          center: center.translate(0, -t * 8),
          width: size.width * 0.95 * scale,
          height: size.height * 0.9 * scale,
        ),
        paint,
      );
    }
    canvas.drawCircle(center.translate(0, -8), 5, Paint()..color = TvColors.terracota);
  }

  @override
  bool shouldRepaint(_CurvasPainter old) => old.rings != rings;
}
