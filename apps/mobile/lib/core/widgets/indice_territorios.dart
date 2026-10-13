import 'package:flutter/material.dart'; // Componentes visuales de Flutter

import '../data/fotos.dart'; // Fotos reales con licencia libre
import '../i18n/t.dart'; // Textos traducidos
import '../theme.dart'; // Colores y espaciados
import 'mapa_territorios.dart'; // Formas y nombres de los 17

/// "17 territorios" e índice con foto redonda, tipo y estado real de la ficha. Solo los publicados se abren.
class IndiceTerritorios extends StatelessWidget {
  const IndiceTerritorios({super.key, required this.mapa, required this.published, required this.onAbrir}); // Constructor
  final DatosMapa mapa; // Los 17 territorios
  final Set<String> published; // Slugs con ficha publicada
  final void Function(FormaMapa) onAbrir; // Abre la ficha

  @override
  Widget build(BuildContext context) {
    final tv = context.tv; // Colores del tema
    final marca = Theme.of(context).extension<LetrasMundo>()?.marca ?? const TextStyle(); // Letra de la marca
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
      children: [
        Semantics(header: true, child: Text(context.t('index.count'), style: marca.copyWith(fontSize: 36, fontWeight: FontWeight.w800, height: 1, color: tv.ink))), // "17 territorios"
        const SizedBox(height: TvSpace.s1), // Espacio
        Text(context.t('index.count_detail'), style: TextStyle(color: tv.inkMuted, fontSize: 15)), // "15 departamentos y 2 regiones autónomas"
        const SizedBox(height: TvSpace.s4), // Espacio
        for (final f in mapa.territories) ...[
          _Fila(forma: f, publicada: published.contains(f.id), onTap: () => onAbrir(f)), // Un territorio
          const SizedBox(height: TvSpace.s2), // Espacio entre filas
        ],
      ],
    );
  }
}

/// Una fila del índice: foto redonda, nombre, tipo y estado.
class _Fila extends StatelessWidget {
  const _Fila({required this.forma, required this.publicada, required this.onTap}); // Constructor
  final FormaMapa forma; // Territorio
  final bool publicada; // Si tiene ficha
  final VoidCallback onTap; // Abre la ficha

  @override
  Widget build(BuildContext context) {
    final tv = context.tv; // Colores del tema
    final foto = FotosReales.de(forma.id); // Foto real (o null en pruebas)
    final region = forma.id.startsWith('costa-caribe'); // Las dos regiones autónomas
    return Material(
      color: tv.groundRaised, // Fondo de la píldora
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: tv.line)), // Borde fino
      clipBehavior: Clip.antiAlias, // Recorta el toque
      child: InkWell(
        onTap: publicada ? onTap : null, // Solo se abre si tiene ficha
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 12, 8), // Relleno
          child: Row(
            children: [
              ClipOval(child: SizedBox(width: 44, height: 44, child: foto != null ? Image.asset(foto.asset, fit: BoxFit.cover, excludeFromSemantics: true) : const ColoredBox(color: TvColors.marcaProfundo))), // Foto redonda decorativa
              const SizedBox(width: TvSpace.s3), // Espacio
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
                  children: [
                    Text(forma.name, style: TextStyle(color: tv.ink, fontWeight: FontWeight.w700, fontSize: 16)), // Nombre
                    Text.rich(
                      TextSpan(
                        text: '${context.t(region ? 'index.region' : 'index.department')} · ', // Departamento o región autónoma
                        children: [TextSpan(text: context.t(publicada ? 'tmap.status_published' : 'tmap.status_pending'), style: publicada ? TextStyle(color: tv.statusVerified, fontWeight: FontWeight.w700) : null)], // Estado real
                      ),
                      style: TextStyle(color: tv.inkMuted, fontSize: 13), // Texto pequeño
                    ),
                  ],
                ),
              ),
              if (publicada) Icon(Icons.chevron_right, color: tv.inkMuted), // Indica que se abre
            ],
          ),
        ),
      ),
    );
  }
}
