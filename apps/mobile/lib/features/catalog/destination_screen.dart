import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod
import 'package:url_launcher/url_launcher.dart'; // Abrir la fuente

import '../../core/data/models.dart'; // Datos del catálogo
import '../../core/data/repositories.dart'; // Acceso al catálogo
import '../../core/data/verification.dart'; // Reglas de verificación
import '../../core/i18n/t.dart'; // Textos traducidos
import '../../core/theme.dart'; // Colores y espaciados
import '../../core/widgets/estado_verificacion.dart'; // "Qué está comprobado"
import '../../core/widgets/estados.dart'; // Cargando, error y vacío
import '../../core/widgets/mapa_territorios.dart'; // Formas del mapa
import '../../core/widgets/portada_territorio.dart'; // Portada del territorio
import '../planner/mis_viajes.dart'; // Botón de favoritos
import '../territories/presentation/territories_screen.dart'; // Territorios publicados (para saber el del destino)
import '../territories/presentation/territory_screen.dart'; // Ficha del territorio
import 'ficha_widgets.dart'; // Horarios y tarifas

/// Ficha de destino por su dirección.
final destinationProvider = FutureProvider.family<DestinationDetail?, String>((ref, slug) => ref.watch(catalogRepositoryProvider).destination(slug)); // Pide la ficha

/// Ficha de destino: primero qué está comprobado, después la descripción.
class DestinationScreen extends ConsumerWidget {
  const DestinationScreen({super.key, required this.slug, required this.name}); // Recibe dirección y nombre
  final String slug; // Dirección
  final String name; // Nombre (para la barra mientras carga)

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(destinationProvider(slug)); // Ficha (o cargando)
    final text = Theme.of(context).textTheme; // Estilos
    return Scaffold(
      appBar: AppBar(title: Text(name)), // Barra con el nombre
      body: data.when(
        loading: () => const Cargando(), // Mientras carga
        error: (e, _) => ErrorConReintento(error: e, onRetry: () => ref.invalidate(destinationProvider(slug))), // Error claro
        data: (d) => d == null
            ? Vacio(text: context.t('destination.not_published')) // No existe
            : ListView(
                padding: const EdgeInsets.fromLTRB(TvSpace.s6, TvSpace.s4, TvSpace.s6, TvSpace.s12), // Márgenes
                children: [
                  _Boleto(destino: d), // Cabecera en forma de boleto con el talón de su territorio
                  const SizedBox(height: TvSpace.s6), // Espacio
                  EstadoVerificacion(
                    rows: destinationRows(d), // Ubicación, horarios, tarifas y seguridad
                    onOpenSource: d.sourceUrl == null ? null : () => launchUrl(Uri.parse(d.sourceUrl!), mode: LaunchMode.externalApplication), // Abre la fuente
                  ),
                  if (d.data['access_notes'] != null) ...[
                    const SizedBox(height: TvSpace.s6), // Espacio
                    Semantics(header: true, child: Text(context.t('destination.access'), style: text.titleLarge)), // Título
                    const SizedBox(height: TvSpace.s2), // Espacio
                    Text(d.data['access_notes'] as String), // Indicaciones de acceso
                  ],
                  const SizedBox(height: TvSpace.s6), // Espacio
                  Horarios(hours: d.hours), // Horarios
                  const SizedBox(height: TvSpace.s6), // Espacio
                  Tarifas(prices: d.prices, estilo: EstiloTarifas.talones), // Tarifas como talones de boleto
                  if (d.data['description_md'] != null) ...[
                    const SizedBox(height: TvSpace.s6), // Espacio
                    Semantics(header: true, child: Text(context.t('destination.about'), style: text.titleLarge)), // Título
                    const SizedBox(height: TvSpace.s2), // Espacio
                    Text(d.data['description_md'] as String, style: text.bodyLarge), // Descripción
                  ],
                  if (d.data['environmental_notes'] != null) ...[
                    const SizedBox(height: TvSpace.s6), // Espacio
                    Semantics(header: true, child: Text(context.t('destination.care'), style: text.titleLarge)), // Título
                    const SizedBox(height: TvSpace.s2), // Espacio
                    Text(d.data['environmental_notes'] as String), // Recomendaciones ambientales
                  ],
                ],
              ),
      ),
    );
  }
}

/// Boleto de viaje: nombre y resumen del destino y, en el talón, la portada de su territorio (si está publicado).
class _Boleto extends ConsumerWidget {
  const _Boleto({required this.destino}); // Constructor
  final DestinationDetail destino; // Ficha

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tv = context.tv; // Colores
    final text = Theme.of(context).textTheme; // Estilos
    final depto = destino.data['department_id']; // Territorio del destino (id)
    final ter = ref.watch(territoriesProvider).valueOrNull?.where((t) => t.id == depto).firstOrNull; // Territorio publicado (o nada)
    final mapa = ref.watch(datosMapaProvider).valueOrNull; // Formas del mapa (o null mientras carga)
    return Container(
      decoration: BoxDecoration(color: tv.groundRaised, borderRadius: BorderRadius.circular(TvSpace.radiusM)), // Papel del boleto
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch, // Talón del mismo alto
          children: [
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(TvSpace.s4 + 4), // Relleno
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
                  children: [
                    Text(destino.name, style: text.displayMedium), // Nombre
                    if (destino.summary != null) Padding(padding: const EdgeInsets.only(top: TvSpace.s2), child: Text(destino.summary!, style: text.bodyLarge?.copyWith(color: tv.inkMuted))), // Resumen
                    Padding(padding: const EdgeInsets.only(top: TvSpace.s3), child: BotonFavorito(tipo: 'destino', id: destino.id)), // Guardar en favoritos (misma lista que la web)
                  ],
                ),
              ),
            ),
            if (ter != null && mapa != null) ...[
              VerticalDivider(width: 2, thickness: 2, color: tv.controlBorder), // Línea donde se corta el talón
              SizedBox(
                width: 112, // Ancho del talón
                child: InkWell(
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => TerritoryScreen(slug: ter.slug, name: ter.shortName))), // Abre su territorio
                  child: Padding(
                    padding: const EdgeInsets.all(TvSpace.s3), // Relleno
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
                      children: [
                        AspectRatio(aspectRatio: 4 / 5, child: ClipRRect(borderRadius: BorderRadius.circular(TvSpace.radiusS), child: PortadaTerritorio(mapa: mapa, slug: ter.slug))), // Su territorio
                        const SizedBox(height: TvSpace.s2), // Espacio
                        Text(context.t('territory.in', {'name': ter.shortName}), style: text.titleSmall), // En qué territorio está
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
