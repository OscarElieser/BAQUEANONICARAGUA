import 'package:flutter/material.dart'; // Componentes visuales de Flutter

import '../data/fotos.dart'; // Fotos reales con licencia libre
import '../i18n/t.dart'; // Textos traducidos
import '../theme.dart'; // Colores y espaciados
import 'mapa_territorios.dart'; // Formas de los territorios
import 'portada_territorio.dart'; // Portadas ilustradas

/// Explorador a pantalla completa: la portada del territorio elegido llena el fondo, el nombre va en grande
/// y las tres siguientes asoman abajo como tarjetas. Datos reales: nombre, zona y si tiene ficha.
class ExploradorTerritorios extends StatefulWidget {
  const ExploradorTerritorios({super.key, required this.mapa, required this.published, required this.onAbrir, required this.onMapa}); // Constructor
  final DatosMapa mapa; // Formas de los 17 territorios
  final Set<String> published; // Slugs con ficha publicada
  final void Function(FormaMapa) onAbrir; // Abre la ficha
  final VoidCallback onMapa; // Baja al mapa (sin ficha todavía)

  @override
  State<ExploradorTerritorios> createState() => _ExploradorTerritoriosState(); // Crea el estado
}

class _ExploradorTerritoriosState extends State<ExploradorTerritorios> {
  int _activo = 0; // Territorio visible

  void _ir(int i) {
    final n = widget.mapa.territories.length; // 17
    setState(() => _activo = ((i % n) + n) % n); // Da la vuelta al llegar al final
  }

  String _dos(int n) => n.toString().padLeft(2, '0'); // 4 → "04"

  @override
  Widget build(BuildContext context) {
    final lista = widget.mapa.territories; // Los 17
    final f = lista[_activo]; // Territorio activo
    final pub = widget.published.contains(f.id); // Si tiene ficha
    final quieto = MediaQuery.of(context).disableAnimations; // Sin animaciones si así se pidió
    final dur = quieto ? Duration.zero : const Duration(milliseconds: 700); // Duración del fundido
    final marca = Theme.of(context).extension<LetrasMundo>()?.marca ?? const TextStyle(); // Letra del nombre grande
    const tenue = Color(0xFFC9D8D0); // Texto secundario sobre la noche

    return ClipRRect(
      borderRadius: BorderRadius.circular(28), // Esquinas suaves
      child: Container(
        color: TvColors.marcaNocturno, // Noche de fondo
        child: Stack(
          children: [
            Positioned.fill(
              child: ExcludeSemantics(
                child: AnimatedSwitcher(
                  duration: dur, // Fundido entre portadas
                  child: SizedBox.expand(key: ValueKey(f.id), child: FittedBox(fit: BoxFit.cover, child: SizedBox(width: 400, height: 500, child: PortadaTerritorio(mapa: widget.mapa, slug: f.id)))), // Portada que llena el fondo
                ),
              ),
            ),
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [TvColors.marcaNocturno.withValues(alpha: 0.88), TvColors.marcaNocturno.withValues(alpha: 0.45), TvColors.marcaNocturno.withValues(alpha: 0.92)]), // Sombra arriba y abajo para el texto
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(TvSpace.s6), // Márgenes
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
                children: [
                  ExcludeSemantics(child: Text('${_dos(_activo + 1)} — ${_dos(lista.length)}', style: const TextStyle(color: tenue, fontSize: 13, fontFeatures: [FontFeature.tabularFigures()]))), // Posición
                  const SizedBox(height: TvSpace.s4), // Espacio
                  Semantics(
                    liveRegion: true, // Se anuncia al cambiar
                    child: AnimatedSwitcher(
                      duration: dur, // Cambio suave del texto
                      child: Column(
                        key: ValueKey(f.id), // Uno por territorio
                        crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
                        children: [
                          Text(context.t(zonaTexto(f.zone)), style: const TextStyle(color: tenue, fontSize: 15)), // Zona
                          Text(f.name.toUpperCase(), style: marca.copyWith(color: TvColors.bandMarfil, fontSize: 46, fontWeight: FontWeight.w900, height: 0.95)), // Nombre en grande
                          const SizedBox(height: TvSpace.s3), // Espacio
                          Text(context.t(pub ? 'tmap.status_published' : 'tmap.status_pending'), style: TextStyle(color: pub ? const Color(0xFF9FD9C2) : const Color(0xFFE9BB74), fontWeight: FontWeight.w700)), // Estado real
                          const SizedBox(height: TvSpace.s1), // Espacio
                          Text(
                            FotosReales.de(f.id) == null
                                ? context.t('tmap.note') // Sin foto: aviso de la ilustración
                                : '${FotosReales.de(f.id)!.lugar}. ${context.t('photo.credit', {'author': FotosReales.de(f.id)!.autor, 'license': FotosReales.de(f.id)!.licencia})}', // Lugar real y crédito de la foto
                            style: const TextStyle(color: tenue, fontSize: 13), // Texto pequeño
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: TvSpace.s4), // Espacio
                  FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: TvColors.bandMarfil, foregroundColor: TvColors.marcaNocturno, minimumSize: const Size(0, 50), shape: const StadiumBorder()), // Botón claro
                    onPressed: pub ? () => widget.onAbrir(f) : widget.onMapa, // Ficha si existe; si no, el mapa
                    child: Text(pub ? context.t('explorer.open', {'name': f.name}) : context.t('explorer.map'), style: const TextStyle(fontWeight: FontWeight.w700)), // Texto del botón
                  ),
                  const SizedBox(height: TvSpace.s6), // Espacio
                  SizedBox(
                    height: 170, // Alto de las tarjetas que asoman
                    child: Row(
                      children: [
                        for (var k = 1; k <= 3; k++) ...[
                          Expanded(
                            child: Transform.translate(
                              offset: Offset(0, (k - 1) * 14.0), // Escalonadas hacia abajo
                              child: Opacity(opacity: 1 - (k - 1) * 0.12, child: _Carta(mapa: widget.mapa, forma: lista[(_activo + k) % lista.length], numero: _dos((_activo + k) % lista.length + 1), onTap: () => _ir(_activo + k))), // Siguiente territorio
                            ),
                          ),
                          if (k < 3) const SizedBox(width: TvSpace.s2), // Espacio entre tarjetas
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: TvSpace.s4), // Espacio
                  Row(
                    children: [
                      IconButton.outlined(onPressed: () => _ir(_activo - 1), tooltip: context.t('gallery.prev'), color: TvColors.bandMarfil, icon: const Icon(Icons.chevron_left)), // Anterior
                      const SizedBox(width: TvSpace.s2), // Espacio
                      IconButton.outlined(onPressed: () => _ir(_activo + 1), tooltip: context.t('gallery.next'), color: TvColors.bandMarfil, icon: const Icon(Icons.chevron_right)), // Siguiente
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Tarjeta pequeña de un territorio siguiente: portada, número y nombre. Al tocarla, pasa a ser el activo.
class _Carta extends StatelessWidget {
  const _Carta({required this.mapa, required this.forma, required this.numero, required this.onTap}); // Constructor
  final DatosMapa mapa; // Formas
  final FormaMapa forma; // Territorio
  final String numero; // "05"
  final VoidCallback onTap; // Qué hacer al tocarla

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true, // Es un botón
      label: context.t('explorer.see', {'name': forma.name}), // "Ver Granada"
      excludeSemantics: true, // Evita leer dos veces
      child: GestureDetector(
        onTap: onTap, // Cambia el activo
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16), // Esquinas suaves
          child: Stack(
            fit: StackFit.expand, // Llena la tarjeta
            children: [
              FittedBox(fit: BoxFit.cover, child: SizedBox(width: 160, height: 200, child: PortadaTerritorio(mapa: mapa, slug: forma.id))), // Portada
              const DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.center, colors: [TvColors.marcaNocturno, Color(0x000D1B2A)]))), // Sombra para el nombre
              Positioned(top: 8, right: 10, child: Text(numero, style: const TextStyle(color: TvColors.bandMarfil, fontSize: 12))), // Número
              Positioned(left: 10, right: 10, bottom: 10, child: Text(forma.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: TvColors.bandMarfil, fontWeight: FontWeight.w700, fontSize: 14))), // Nombre
            ],
          ),
        ),
      ),
    );
  }
}
