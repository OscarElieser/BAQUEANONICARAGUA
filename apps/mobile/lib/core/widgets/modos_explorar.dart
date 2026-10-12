import 'package:flutter/material.dart'; // Componentes visuales de Flutter

import '../data/fotos.dart'; // Fotos reales con licencia libre
import '../i18n/t.dart'; // Textos traducidos
import '../theme.dart'; // Colores y espaciados

/// Un camino de entrada: texto, foto real (si la hay) y qué hacer al tocarlo.
class Camino {
  const Camino({required this.clave, required this.foto, required this.onTap}); // Constructor
  final String clave; // Clave del texto: ways.<clave> y ways.<clave>_desc
  final String foto; // Clave de la foto en el catálogo
  final VoidCallback onTap; // Pantalla o pestaña que abre
}

/// "Explora a tu manera": mosaicos con fotos reales y su crédito. El primero ocupa todo el ancho.
class ModosExplorar extends StatelessWidget {
  const ModosExplorar({super.key, required this.caminos}); // Constructor
  final List<Camino> caminos; // Caminos disponibles en la app

  @override
  Widget build(BuildContext context) {
    final marca = Theme.of(context).extension<LetrasMundo>()?.marca ?? const TextStyle(); // Letra de la marca
    final tv = context.tv; // Colores del tema
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
      children: [
        Semantics(header: true, child: Text(context.t('home.ways_title'), style: marca.copyWith(fontSize: 30, fontWeight: FontWeight.w800, height: 1.05, color: tv.ink))), // "Explora a tu manera"
        const SizedBox(height: TvSpace.s1), // Espacio
        Text(context.t('home.ways_intro'), style: TextStyle(color: tv.inkMuted, fontSize: 14)), // Aclara que las fotos son reales
        const SizedBox(height: TvSpace.s4), // Espacio
        if (caminos.isNotEmpty) _Mosaico(camino: caminos.first, alto: 220), // El primero, ancho completo
        for (var i = 1; i < caminos.length; i += 2) ...[
          const SizedBox(height: TvSpace.s3), // Espacio entre filas
          Row(
            children: [
              Expanded(child: _Mosaico(camino: caminos[i], alto: 190)), // Izquierda
              const SizedBox(width: TvSpace.s3), // Espacio entre columnas
              Expanded(child: i + 1 < caminos.length ? _Mosaico(camino: caminos[i + 1], alto: 190) : const SizedBox.shrink()), // Derecha (si hay)
            ],
          ),
        ],
      ],
    );
  }
}

/// Un mosaico: foto de fondo, sombra, nombre, descripción y crédito arriba.
class _Mosaico extends StatelessWidget {
  const _Mosaico({required this.camino, required this.alto}); // Constructor
  final Camino camino; // Qué camino es
  final double alto; // Alto del mosaico

  @override
  Widget build(BuildContext context) {
    final f = FotosReales.de(camino.foto); // Foto real (o null en pruebas)
    final marca = Theme.of(context).extension<LetrasMundo>()?.marca ?? const TextStyle(); // Letra de la marca
    return SizedBox(
      height: alto, // Alto fijo
      child: Material(
        color: TvColors.marcaProfundo, // Fondo si no hay foto
        borderRadius: BorderRadius.circular(22), // Esquinas suaves
        clipBehavior: Clip.antiAlias, // Recorta la foto
        child: InkWell(
          onTap: camino.onTap, // Abre el camino
          child: Stack(
            fit: StackFit.expand, // Llena el mosaico
            children: [
              if (f != null) Image.asset(f.asset, fit: BoxFit.cover, semanticLabel: f.lugar), // Foto real con su lugar
              const DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.center, colors: [Color(0xE60D1B2A), Color(0x000D1B2A)]))), // Sombra para el texto
              if (f != null)
                Positioned(
                  top: 8, left: 8, right: 8, // Arriba, con margen
                  child: Align(
                    alignment: Alignment.topRight, // A la derecha
                    child: DecoratedBox(
                      decoration: BoxDecoration(color: TvColors.marcaNocturno.withValues(alpha: 0.72), borderRadius: BorderRadius.circular(99)), // Etiqueta oscura
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2), // Relleno
                        child: Text(context.t('photo.credit', {'author': f.autor, 'license': f.licencia}), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: TvColors.bandMarfil, fontSize: 10)), // Crédito de la foto
                      ),
                    ),
                  ),
                ),
              Positioned(
                left: 14, right: 14, bottom: 12, // Abajo a la izquierda
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
                  mainAxisSize: MainAxisSize.min, // Solo lo necesario
                  children: [
                    Text(context.t('ways.${camino.clave}'), style: marca.copyWith(color: TvColors.bandMarfil, fontSize: 20, fontWeight: FontWeight.w800, height: 1.05)), // Nombre del camino
                    const SizedBox(height: 2), // Espacio
                    Text(context.t('ways.${camino.clave}_desc'), maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xFFE6EEE9), fontSize: 12.5, height: 1.3)), // Qué hay ahí
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
