import 'package:flutter/material.dart';
import '../theme.dart';

/// Franja tejida (hamacas de Masaya). Solo Vitrina, perfiles y Comunidad. Decorativa.
class FranjaTejida extends StatelessWidget {
  const FranjaTejida({super.key, this.height = 14});
  final double height;

  static const _pattern = <(Color, double)>[
    (TvColors.bandAnil, 30),
    (TvColors.bandMaiz, 8),
    (TvColors.bandAchiote, 30),
    (TvColors.bandMarfil, 4),
    (TvColors.bandVerde, 28),
    (TvColors.bandMarfil, 4),
  ];

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: SizedBox(
        height: height,
        child: ClipRect(
          child: OverflowBox(
            alignment: Alignment.centerLeft,
            maxWidth: double.infinity,
            child: Row(
              children: [
                for (var r = 0; r < 12; r++)
                  for (final (color, w) in _pattern) Container(width: w, height: height, color: color),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
