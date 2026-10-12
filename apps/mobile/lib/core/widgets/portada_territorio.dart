import 'dart:typed_data'; // Matriz para encoger la silueta

import 'package:flutter/material.dart'; // Componentes visuales de Flutter

import '../i18n/t.dart'; // Textos traducidos
import '../theme.dart'; // Colores del sistema de diseño
import 'mapa_territorios.dart'; // Formas del mapa

/// Colores de cada zona de paisaje (los mismos que la web, del sistema de diseño).
class PaletaZona {
  const PaletaZona(this.fondo, this.curva, this.cima); // Constructor
  final Color fondo; // Fondo de la portada
  final Color curva; // Curvas de nivel
  final Color cima; // Cima y contorno

  static const pacifico = PaletaZona(TvColors.zonaPacifico, TvColors.terracota, TvColors.oro); // Ceniza, lava y oro
  static const norte = PaletaZona(TvColors.zonaNorte, TvColors.musgo, TvColors.bandMaiz); // Neblina, musgo y maíz
  static const caribe = PaletaZona(TvColors.bandAnil, TvColors.caribe, TvColors.bandMarfil); // Añil, mar y arena

  /// Paleta según la zona del territorio.
  static PaletaZona de(String zone) => switch (zone) {
        'pacifico' => pacifico, // Pacífico volcánico
        'caribe' => caribe, // Caribe y Río San Juan
        _ => norte, // Centro-norte de montaña
      };
}

/// Clave del nombre de cada zona en los textos traducidos.
String zonaTexto(String zone) => 'zone.${zone.isEmpty ? 'norte' : zone}'; // zone.pacifico, zone.norte o zone.caribe

/// Escalas de las curvas de nivel, de la orilla hacia la cima (iguales que la web).
const curvasPortada = [1.0, 0.84, 0.69, 0.55, 0.42, 0.3, 0.19]; // Siete anillos

/// Portada ilustrada de un territorio: su silueta real con curvas de nivel hacia una cima.
/// Decorativa: el nombre y el estado siempre van en texto al lado.
class PortadaTerritorio extends StatelessWidget {
  const PortadaTerritorio({super.key, required this.mapa, required this.slug}); // Constructor
  final DatosMapa mapa; // Formas del mapa
  final String slug; // Territorio a dibujar

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: CustomPaint(painter: _PintorPortada(mapa: mapa, slug: slug), size: Size.infinite), // Dibujo (sin lectura en voz alta)
    );
  }
}

class _PintorPortada extends CustomPainter {
  _PintorPortada({required this.mapa, required this.slug}); // Constructor
  final DatosMapa mapa; // Formas
  final String slug; // Territorio

  @override
  void paint(Canvas canvas, Size size) {
    final ter = mapa.territories.where((t) => t.id == slug).firstOrNull; // Territorio a dibujar
    if (ter == null) return; // Desconocido: nada
    final c = PaletaZona.de(ter.zone); // Colores de su zona
    canvas.drawRect(Offset.zero & size, Paint()..color = c.fondo); // Fondo de la zona

    final caja = ter.path.getBounds().inflate(ter.path.getBounds().longestSide * 0.14); // Silueta con aire alrededor
    final s = (size.width / caja.width) > (size.height / caja.height) ? size.width / caja.width : size.height / caja.height; // Llena la portada (recorta lo que sobre)
    canvas.save(); // Guarda el lienzo
    canvas.clipRect(Offset.zero & size); // Nada fuera de la portada
    canvas.translate(size.width / 2, size.height / 2); // Centro de la portada
    canvas.scale(s); // Escala
    canvas.translate(-caja.center.dx, -caja.center.dy); // Centra la silueta

    final fino = Paint()
      ..style = PaintingStyle.stroke // Solo borde
      ..strokeWidth = 1 / s; // Un píxel en pantalla
    for (final o in mapa.territories) {
      if (o.id != slug) canvas.drawPath(o.path, fino..color = c.curva.withValues(alpha: 0.2)); // Vecinos tenues
    }
    canvas.save(); // Guarda antes de recortar
    canvas.clipPath(ter.path); // Solo dentro del territorio
    canvas.drawPath(ter.path, Paint()..color = c.curva.withValues(alpha: 0.1)); // Tierra del territorio
    for (var i = 0; i < curvasPortada.length; i++) {
      final k = curvasPortada[i]; // Escala de esta curva
      final m = Float64List.fromList([k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1, 0, (1 - k) * ter.label.dx, (1 - k) * ter.label.dy, 0, 1]); // Encoge hacia la cima (matriz por columnas)
      final curva = ter.path.transform(m); // Silueta encogida hacia la cima
      if (i == curvasPortada.length - 1) canvas.drawPath(curva, Paint()..color = c.cima); // La cima, rellena
      canvas.drawPath(curva, Paint()..style = PaintingStyle.stroke..strokeWidth = 1.4 / s..color = c.curva.withValues(alpha: 0.4 + i * 0.09)); // Curva de nivel
    }
    canvas.restore(); // Quita el recorte
    canvas.drawPath(ter.path, Paint()..style = PaintingStyle.stroke..strokeWidth = 2 / s..color = c.cima); // Contorno
    for (final l in mapa.lakes) {
      canvas.drawPath(l.path, Paint()..color = TvColors.bandAnil); // Agua encima: tapa el límite que cruza el lago
      canvas.drawPath(l.path, Paint()..style = PaintingStyle.stroke..strokeWidth = 1 / s..color = TvColors.caribe.withValues(alpha: 0.6)); // Orilla
    }
    canvas.restore(); // Devuelve el lienzo
  }

  @override
  bool shouldRepaint(_PintorPortada old) => old.slug != slug || old.mapa != mapa; // Solo si cambia el territorio
}

/// Tarjeta de un territorio: portada, nombre, zona y estado. Si tiene ficha, se toca para abrirla.
class TarjetaTerritorio extends StatelessWidget {
  const TarjetaTerritorio({super.key, required this.mapa, required this.forma, required this.published, this.onOpen}); // Constructor
  final DatosMapa mapa; // Formas
  final FormaMapa forma; // Territorio
  final bool published; // Si tiene ficha publicada
  final VoidCallback? onOpen; // Qué hacer al tocarla

  @override
  Widget build(BuildContext context) {
    final tv = context.tv; // Colores
    final text = Theme.of(context).textTheme; // Estilos
    final estado = context.t(published ? 'tmap.status_published' : 'tmap.status_pending'); // Estado en texto
    return Semantics(
      button: published, // Se anuncia como botón solo si abre algo
      label: '${forma.name}. ${context.t(zonaTexto(forma.zone))}. $estado', // Todo lo que dice la tarjeta
      excludeSemantics: true, // Evita leerlo dos veces
      child: InkWell(
        onTap: published ? onOpen : null, // Solo abre si está publicado
        borderRadius: BorderRadius.circular(TvSpace.radiusM), // Onda del toque con la misma forma
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
          children: [
            AspectRatio(
              aspectRatio: 4 / 5, // Proporción de portada
              child: ClipRRect(borderRadius: BorderRadius.circular(TvSpace.radiusM), child: PortadaTerritorio(mapa: mapa, slug: forma.id)), // Portada redondeada
            ),
            const SizedBox(height: TvSpace.s2), // Espacio
            Text(forma.name, style: text.titleLarge, maxLines: 1, overflow: TextOverflow.ellipsis), // Nombre
            Text(context.t(zonaTexto(forma.zone)), style: TextStyle(color: tv.inkMuted, fontSize: 14)), // Zona
            Text(estado, style: TextStyle(color: published ? tv.statusVerified : tv.oroText, fontSize: 14)), // Estado
          ],
        ),
      ),
    );
  }
}
