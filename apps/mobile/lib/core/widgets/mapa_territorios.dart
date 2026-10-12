import 'dart:convert'; // Para leer el JSON del mapa

import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter/services.dart'; // Acceso a los archivos incluidos en la app
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod

import '../i18n/t.dart'; // Textos traducidos
import '../theme.dart'; // Colores del sistema de diseño

/// Una forma del mapa (territorio o lago) ya convertida en trazo de Flutter.
class FormaMapa {
  const FormaMapa({required this.id, required this.name, required this.path, required this.label, this.zone = ''}); // Constructor
  final String id; // Slug del territorio o id del lago
  final String zone; // Zona de paisaje: pacifico, norte o caribe (vacía en los lagos)
  final String name; // Nombre para mostrar
  final Path path; // Contorno en coordenadas del mapa
  final Offset label; // Punto donde va el nombre (dentro de la forma, lejos del borde)
}

/// Mapa de los 17 territorios tal como lo genera scripts/mapa (mismo archivo que la web).
class DatosMapa {
  const DatosMapa({required this.size, required this.territories, required this.lakes}); // Constructor
  final Size size; // Tamaño del lienzo original (viewBox)
  final List<FormaMapa> territories; // Los 17 territorios
  final List<FormaMapa> lakes; // Cocibolca y Xolotlán

  /// Lee el JSON de assets/mapa/mapa.json.
  factory DatosMapa.fromJson(Map<String, dynamic> json) {
    final box = (json['viewBox'] as String).split(' ').map(double.parse).toList(); // "0 0 ancho alto"
    FormaMapa forma(Map<String, dynamic> j, String idKey) {
      final l = (j['label'] as List).cast<num>(); // Punto de la etiqueta
      return FormaMapa(
        id: j[idKey] as String, // Identificador
        name: j['name'] as String, // Nombre
        path: parseSvgPath(j['d'] as String), // Contorno
        zone: (j['zone'] as String?) ?? '', // Zona (solo territorios)
        label: Offset(l[0].toDouble(), l[1].toDouble()), // Etiqueta
      );
    }

    return DatosMapa(
      size: Size(box[2], box[3]), // Ancho y alto del lienzo
      territories: [for (final t in json['territories'] as List) forma(t as Map<String, dynamic>, 'slug')], // Territorios
      lakes: [for (final l in json['lakes'] as List) forma(l as Map<String, dynamic>, 'id')], // Lagos
    );
  }

  /// Territorio que está bajo un punto del mapa (o null si es agua o fuera del país).
  FormaMapa? territoryAt(Offset p) {
    for (final lake in lakes) {
      if (lake.path.contains(p)) return null; // Tocar un lago no abre ningún territorio
    }
    for (final t in territories) {
      if (t.path.contains(p)) return t; // Primer territorio que contiene el punto
    }
    return null; // Fuera del país
  }
}

/// Convierte un trazo SVG con solo M, L y Z (lo único que produce el generador) en un Path.
Path parseSvgPath(String d) {
  final path = Path()..fillType = PathFillType.evenOdd; // Par-impar: Ometepe queda como isla dentro del lago
  final tokens = RegExp(r'[MLZ]|-?\d+(?:\.\d+)?').allMatches(d).map((m) => m.group(0)!).toList(); // Letras y números
  var cmd = 'M'; // Orden actual
  var i = 0; // Posición en la lista
  while (i < tokens.length) {
    final tok = tokens[i]; // Pieza actual
    if (tok == 'M' || tok == 'L') {
      cmd = tok; // Cambia de orden
      i++; // Siguiente pieza
      continue; // Lee las coordenadas en la vuelta siguiente
    }
    if (tok == 'Z') {
      path.close(); // Cierra el anillo
      cmd = 'M'; // Lo que siga empieza un anillo nuevo
      i++; // Siguiente pieza
      continue; // Sigue leyendo
    }
    if (i + 1 >= tokens.length) break; // Número suelto al final: se ignora
    final x = double.parse(tok), y = double.parse(tokens[i + 1]); // Par de coordenadas
    if (cmd == 'M') {
      path.moveTo(x, y); // Empieza un anillo
      cmd = 'L'; // En SVG, los pares que siguen a M son líneas
    } else {
      path.lineTo(x, y); // Continúa el contorno
    }
    i += 2; // Avanza el par
  }
  return path; // Trazo listo
}

/// Mapa cargado desde los archivos de la app (una sola vez).
final datosMapaProvider = FutureProvider<DatosMapa>((ref) async {
  final raw = await rootBundle.loadString('assets/mapa/mapa.json'); // Lee el archivo incluido en la app
  return DatosMapa.fromJson(jsonDecode(raw) as Map<String, dynamic>); // Lo convierte en formas
});

/// Mapa ilustrado: tocar un territorio publicado abre su ficha; los que aún se verifican se ven
/// punteados y, al tocarlos, solo muestran su nombre y estado. La lista de abajo ofrece lo mismo
/// en texto para lectores de pantalla.
class MapaTerritorios extends StatefulWidget {
  const MapaTerritorios({super.key, required this.mapa, required this.published, required this.onOpen}); // Constructor
  final DatosMapa mapa; // Formas del mapa
  final Set<String> published; // Slugs con ficha publicada
  final void Function(FormaMapa territory) onOpen; // Qué hacer al tocar uno publicado

  @override
  State<MapaTerritorios> createState() => _MapaTerritoriosState(); // Crea el estado
}

class _MapaTerritoriosState extends State<MapaTerritorios> {
  FormaMapa? _active; // Territorio resaltado

  /// Convierte un punto de la pantalla en coordenadas del mapa.
  Offset _toMap(Offset local, Size box) {
    final s = _scale(box); // Escala usada al dibujar
    final dx = (box.width - widget.mapa.size.width * s) / 2, dy = (box.height - widget.mapa.size.height * s) / 2; // Márgenes de centrado
    return Offset((local.dx - dx) / s, (local.dy - dy) / s); // Deshace el centrado y la escala
  }

  double _scale(Size box) {
    final m = widget.mapa.size; // Tamaño original
    final sx = box.width / m.width, sy = box.height / m.height; // Escala por eje
    return sx < sy ? sx : sy; // Cabe entero sin deformarse
  }

  void _tap(Offset local, Size box) {
    final ter = widget.mapa.territoryAt(_toMap(local, box)); // Territorio tocado
    setState(() => _active = ter); // Lo resalta (o quita el resalte si fue agua)
    if (ter != null && widget.published.contains(ter.id)) widget.onOpen(ter); // Abre la ficha solo si está publicado
  }

  @override
  Widget build(BuildContext context) {
    final tv = context.tv; // Colores
    final text = Theme.of(context).textTheme; // Estilos de texto
    final active = _active; // Copia local para comprobar null
    final isPub = active != null && widget.published.contains(active.id); // Si el resaltado está publicado

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
      children: [
        AspectRatio(
          aspectRatio: widget.mapa.size.width / widget.mapa.size.height, // Misma proporción que el mapa original
          child: LayoutBuilder(
            builder: (context, box) {
              final size = Size(box.maxWidth, box.maxHeight); // Espacio disponible
              return Semantics(
                label: context.t('tmap.aria'), // Descripción para lectores de pantalla
                hint: context.t('tmap.hint'), // Cómo se usa
                child: GestureDetector(
                  onTapUp: (d) => _tap(d.localPosition, size), // Toque en el mapa
                  child: CustomPaint(
                    size: size, // Ocupa todo el espacio
                    painter: _PintorMapa(mapa: widget.mapa, published: widget.published, active: active?.id, tv: tv, labelStyle: text.titleMedium), // Dibujo
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: TvSpace.s2), // Espacio
        Semantics(
          liveRegion: true, // Se anuncia al cambiar
          child: active == null
              ? Text(context.t('tmap.hint'), style: text.bodySmall?.copyWith(color: tv.inkMuted)) // Instrucción
              : Text(
                  '${active.name} · ${context.t(isPub ? 'tmap.status_published' : 'tmap.status_pending')}', // Nombre y estado
                  style: text.bodyMedium?.copyWith(color: isPub ? tv.statusVerified : tv.oroText), // Color según estado
                ),
        ),
        const SizedBox(height: TvSpace.s1), // Espacio
        Text(context.t('tmap.note'), style: text.bodySmall?.copyWith(color: tv.inkMuted)), // Fuente y límites aproximados
      ],
    );
  }
}

/// Dibuja territorios, lagos y el nombre del resaltado.
class _PintorMapa extends CustomPainter {
  _PintorMapa({required this.mapa, required this.published, required this.active, required this.tv, required this.labelStyle}); // Constructor
  final DatosMapa mapa; // Formas
  final Set<String> published; // Publicados
  final String? active; // Resaltado
  final TvColors tv; // Colores
  final TextStyle? labelStyle; // Estilo del nombre

  @override
  void paint(Canvas canvas, Size size) {
    final s = (size.width / mapa.size.width) < (size.height / mapa.size.height) ? size.width / mapa.size.width : size.height / mapa.size.height; // Escala que cabe
    canvas.save(); // Guarda el estado del lienzo
    canvas.translate((size.width - mapa.size.width * s) / 2, (size.height - mapa.size.height * s) / 2); // Centra
    canvas.scale(s); // Escala al espacio disponible

    final stroke = Paint()
      ..style = PaintingStyle.stroke // Solo borde
      ..color = TvColors.oro // Borde dorado como en la web
      ..strokeWidth = 1.2 / s; // Grosor constante en pantalla
    for (final t in mapa.territories) {
      final pub = published.contains(t.id); // Si tiene ficha
      final on = t.id == active; // Si está resaltado
      final fill = Paint()..color = on && pub ? TvColors.oro : (pub ? tv.groundRaised : tv.groundDeep); // Relleno según estado
      canvas.drawPath(t.path, fill); // Relleno
      if (on) _curvas(canvas, t.path, s); // Curvas de nivel al resaltar
      canvas.drawPath(t.path, pub ? stroke : (Paint()..style = PaintingStyle.stroke..color = TvColors.oro.withValues(alpha: 0.55)..strokeWidth = 1 / s)); // Borde (más tenue si está pendiente)
    }
    for (final l in mapa.lakes) {
      canvas.drawPath(l.path, Paint()..color = TvColors.bandAnil); // Agua
      canvas.drawPath(l.path, Paint()..style = PaintingStyle.stroke..color = TvColors.bandMarfil.withValues(alpha: 0.35)..strokeWidth = 1 / s); // Orilla
    }

    final on = mapa.territories.where((t) => t.id == active).firstOrNull; // Territorio resaltado
    if (on != null) {
      final tp = TextPainter(
        text: TextSpan(text: on.name, style: (labelStyle ?? const TextStyle()).copyWith(color: tv.ink, fontSize: 15 / s, shadows: [Shadow(color: tv.ground, blurRadius: 4 / s)])), // Nombre con halo para leerse sobre el mapa
        textDirection: TextDirection.ltr, // Dirección del texto
      )..layout(); // Mide el texto
      tp.paint(canvas, on.label - Offset(tp.width / 2, tp.height / 2)); // Lo centra en su punto
    }
    canvas.restore(); // Devuelve el lienzo a su estado
  }

  /// Anillos concéntricos recortados a la forma: el relieve que se ve al resaltar.
  void _curvas(Canvas canvas, Path shape, double s) {
    final b = shape.getBounds(); // Rectángulo que la contiene
    canvas.save(); // Guarda antes de recortar
    canvas.clipPath(shape); // Dibuja solo dentro del territorio
    final ring = Paint()
      ..style = PaintingStyle.stroke // Solo borde
      ..color = TvColors.onOro.withValues(alpha: 0.22) // Tenue
      ..strokeWidth = 1 / s; // Fino
    final c = b.center; // Centro del territorio
    for (var r = 8.0; r < b.longestSide; r += 9) {
      canvas.drawCircle(c, r, ring); // Una curva de nivel
    }
    canvas.restore(); // Quita el recorte
  }

  @override
  bool shouldRepaint(_PintorMapa old) => old.active != active || old.published != published || old.tv != tv; // Redibuja solo si cambia algo visible
}
