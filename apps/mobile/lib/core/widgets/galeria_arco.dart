import 'package:flutter/material.dart'; // Componentes visuales de Flutter

import '../theme.dart'; // Colores y espaciados del sistema de diseño

/// Galería en arco 3D: la tarjeta del centro queda de frente y las de los lados giran hacia adentro.
/// Se desliza con el dedo; cada tarjeta entra con una animación breve una sola vez.
/// Sirve para cualquier catálogo (territorios hoy, destinos cuando se publiquen).
class GaleriaArco extends StatefulWidget {
  const GaleriaArco({super.key, required this.titulo, required this.intro, required this.cantidad, required this.constructor, this.alto = 330}); // Constructor
  final String titulo; // Título visible
  final String intro; // Aclaración bajo el título
  final int cantidad; // Número de tarjetas
  final Widget Function(BuildContext, int) constructor; // Cómo se dibuja cada tarjeta
  final double alto; // Alto de la fila

  @override
  State<GaleriaArco> createState() => _GaleriaArcoState(); // Crea el estado
}

class _GaleriaArcoState extends State<GaleriaArco> {
  final _pagina = PageController(viewportFraction: 0.56); // Cada tarjeta ocupa algo más de la mitad: asoman las vecinas

  @override
  void dispose() {
    _pagina.dispose(); // Libera el controlador
    super.dispose(); // Limpieza base
  }

  @override
  Widget build(BuildContext context) {
    final base = Theme.of(context); // Tema actual
    final quieto = MediaQuery.of(context).disableAnimations; // Quien pidió quitar animaciones
    final noche = base.copyWith(
      extensions: [TvColors.dark, ...base.extensions.values.where((e) => e is! TvColors)], // Colores del tema oscuro dentro de la sala
      textTheme: base.textTheme.apply(bodyColor: TvColors.bandMarfil, displayColor: TvColors.bandMarfil), // Texto claro
    ); // La galería es una sala oscura en los dos temas

    return Theme(
      data: noche, // Tema de la sala
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28), // Esquinas suaves
          gradient: RadialGradient(center: Alignment.topCenter, radius: 1.2, colors: [Color.lerp(TvColors.marcaProfundo, TvColors.marcaTurquesa, 0.22)!, TvColors.marcaNocturno]), // Luz arriba, noche abajo
        ),
        padding: const EdgeInsets.symmetric(vertical: TvSpace.s8), // Relleno vertical
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: TvSpace.s6), // Márgenes del texto
              child: Column(
                children: [
                  Semantics(header: true, child: Text(widget.titulo, textAlign: TextAlign.center, style: noche.textTheme.headlineMedium)), // Título centrado
                  const SizedBox(height: TvSpace.s2), // Espacio
                  Text(widget.intro, textAlign: TextAlign.center, style: noche.textTheme.bodyMedium?.copyWith(color: TvColors.dark.inkMuted)), // Aclaración
                ],
              ),
            ),
            const SizedBox(height: TvSpace.s6), // Espacio
            SizedBox(
              height: widget.alto, // Alto de la fila
              child: PageView.builder(
                controller: _pagina, // Posición de la galería
                itemCount: widget.cantidad, // Tarjetas
                itemBuilder: (context, i) => AnimatedBuilder(
                  animation: _pagina, // Redibuja al deslizar
                  builder: (context, hijo) {
                    final pagina = _pagina.hasClients && _pagina.position.haveDimensions ? (_pagina.page ?? 0) : 0.0; // Página visible (con decimales mientras se desliza)
                    final delta = (i - pagina).clamp(-1.5, 1.5).toDouble(); // Distancia al centro
                    final giro = quieto ? 0.0 : 0.75 * delta; // Vista desde dentro de un cilindro: las de los lados acercan su borde exterior y miran al centro
                    final escala = 0.94 + 0.18 * (delta.abs() > 1 ? 1.0 : delta.abs()); // Las de los lados, un poco más grandes (están más cerca)
                    return Transform(
                      alignment: Alignment.center, // Gira sobre su centro
                      transform: Matrix4.identity()
                        ..setEntry(3, 2, 0.0012) // Perspectiva
                        ..rotateY(giro), // Giro hacia el centro
                      child: Transform.scale(scale: escala, child: hijo), // Tamaño según la distancia
                    );
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: TvSpace.s2), // Espacio entre tarjetas
                    child: quieto
                        ? widget.constructor(context, i) // Sin animación de entrada
                        : TweenAnimationBuilder<double>(
                            tween: Tween(begin: 0, end: 1), // De invisible a visible
                            duration: Duration(milliseconds: 700 + 70 * (i < 8 ? i : 8)), // Una tras otra
                            curve: Curves.easeOutCubic, // Llega suave
                            builder: (context, v, hijo) => Opacity(opacity: v, child: Transform.translate(offset: Offset(0, 40 * (1 - v)), child: hijo)), // Sube y aparece
                            child: widget.constructor(context, i), // Tarjeta
                          ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
