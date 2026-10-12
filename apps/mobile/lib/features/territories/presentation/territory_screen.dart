import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod
import 'package:url_launcher/url_launcher.dart'; // Abrir la fuente en el navegador

import '../../../core/data/models.dart'; // Datos del catálogo
import '../../../core/data/repositories.dart'; // Acceso al catálogo
import '../../../core/i18n/t.dart'; // Textos traducidos
import '../../../core/theme.dart'; // Colores y espaciados
import '../../../core/widgets/curvas_de_nivel.dart'; // Motivo de relieve
import '../../../core/widgets/estado_verificacion.dart'; // "Qué está comprobado"
import '../../../core/widgets/estados.dart'; // Cargando, error y vacío
import '../../catalog/search_screen.dart'; // Destinos y negocios del territorio

const _sectionOrder = ['overview', 'geography', 'history', 'culture', 'gastronomy', 'peoples', 'nature', 'heritage', 'festivities', 'climate', 'transport', 'routes', 'community']; // Mismo orden que la web

/// Territorio y sus secciones en el idioma del teléfono.
final territoryProvider = FutureProvider.family<(Territory?, List<TerritorySection>), (String, String)>(
  (ref, args) => ref.watch(catalogRepositoryProvider).territory(args.$1, args.$2), // Pide territorio y secciones
);

/// Ficha de territorio.
class TerritoryScreen extends ConsumerWidget {
  const TerritoryScreen({super.key, required this.slug, required this.name}); // Recibe la dirección y el nombre
  final String slug; // Dirección del territorio
  final String name; // Nombre (para la barra mientras carga)

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = Localizations.localeOf(context).languageCode; // Idioma del teléfono
    final args = (slug, locale); // Parámetros de la consulta
    final data = ref.watch(territoryProvider(args)); // Datos (o cargando)
    final tv = context.tv; // Colores
    final text = Theme.of(context).textTheme; // Estilos

    return Scaffold(
      appBar: AppBar(title: Text(name)), // Barra con el nombre
      body: data.when(
        loading: () => const Cargando(), // Mientras carga
        error: (e, _) => ErrorConReintento(error: e, onRetry: () => ref.invalidate(territoryProvider(args))), // Error claro
        data: (result) {
          final (territory, sections) = result; // Separa territorio y secciones
          if (territory == null) return Vacio(text: context.t('territory.not_published')); // No existe o es borrador
          final sorted = [...sections]..sort((a, b) => _sectionOrder.indexOf(a.section).compareTo(_sectionOrder.indexOf(b.section))); // Orden editorial
          final verified = sorted.where((s) => s.verifiedAt != null).map((s) => s.verifiedAt!).toList(); // Secciones comprobadas
          return ListView(
            padding: const EdgeInsets.fromLTRB(TvSpace.s6, TvSpace.s4, TvSpace.s6, TvSpace.s12), // Márgenes
            children: [
              SizedBox(height: 140, child: CurvasDeNivel(semanticLabel: context.t('territory.contours', {'name': territory.shortName}))), // Motivo de relieve
              const SizedBox(height: TvSpace.s4), // Espacio
              Text(territory.name, style: text.displayMedium), // Nombre oficial
              if (territory.capitalName != null)
                Padding(padding: const EdgeInsets.only(top: TvSpace.s2), child: Text(context.t('territory.capital', {'name': territory.capitalName!}), style: TextStyle(color: tv.inkMuted))), // Cabecera
              const SizedBox(height: TvSpace.s6), // Espacio
              EstadoVerificacion(
                rows: [
                  ('field.boundaries', const Pending()), // Aún sin capa oficial de límites
                  ('field.editorial', verified.isEmpty ? const Unconfirmed() : Verified(verified.first)), // Fecha de comprobación
                ],
                onOpenSource: territory.sourceUrl == null ? null : () => launchUrl(Uri.parse(territory.sourceUrl!), mode: LaunchMode.externalApplication), // Abre la fuente
              ),
              const SizedBox(height: TvSpace.s4), // Espacio
              OutlinedButton.icon(
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => SearchScreen(query: '', departmentId: territory.id, title: context.t('territory.in', {'name': territory.shortName})))), // Destinos y negocios del territorio
                icon: const Icon(Icons.place_outlined), // Icono de lugar
                label: Text(context.t('territory.see_places')), // Texto
              ),
              const SizedBox(height: TvSpace.s8), // Espacio
              if (sorted.isEmpty)
                Vacio(text: context.t('territory.no_content')) // Sin secciones
              else
                for (final s in sorted) ...[
                  Semantics(header: true, child: Text(s.title, style: text.headlineSmall)), // Título de la sección
                  if (s.machineTranslated)
                    Padding(padding: const EdgeInsets.only(top: TvSpace.s1), child: Text(context.t('territory.machine'), style: TextStyle(color: tv.oroText, fontSize: 14))), // Aviso de traducción
                  const SizedBox(height: TvSpace.s2), // Espacio
                  Text(s.body, style: text.bodyLarge), // Texto
                  const SizedBox(height: TvSpace.s8), // Espacio entre secciones
                ],
            ],
          );
        },
      ),
    );
  }
}
