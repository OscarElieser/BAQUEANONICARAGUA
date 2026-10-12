import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod
import 'package:intl/intl.dart'; // Formato de fechas
import 'package:url_launcher/url_launcher.dart'; // Abrir el registro en la web

import '../../core/data/models.dart'; // Datos de la comunidad
import '../../core/data/repositories.dart'; // Acceso al catálogo
import '../../core/env.dart'; // Dirección de la web
import '../../core/theme.dart'; // Colores y espaciados
import '../../core/widgets/estados.dart'; // Cargando, error y vacío
import '../../core/widgets/franja_tejida.dart'; // Franja tejida de la comunidad
import '../catalog/search_screen.dart'; // Negocios del catálogo

/// Relatos recientes en orden cronológico (no por interacción).
final feedProvider = FutureProvider.autoDispose<List<FeedPost>>((ref) => ref.watch(catalogRepositoryProvider).feed()); // Pide el feed

/// Comunidad: la Vitrina de Nuestra Gente y los relatos.
class CommunityScreen extends ConsumerWidget {
  const CommunityScreen({super.key}); // Constructor constante

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feed = ref.watch(feedProvider); // Relatos (o cargando)
    final tv = context.tv; // Colores
    final text = Theme.of(context).textTheme; // Estilos
    final locale = Localizations.localeOf(context).toLanguageTag(); // Idioma para las fechas

    return RefreshIndicator(
      onRefresh: () => ref.refresh(feedProvider.future), // Deslizar hacia abajo recarga
      child: ListView(
        padding: const EdgeInsets.only(bottom: TvSpace.s12), // Espacio al final
        children: [
          const FranjaTejida(height: 22), // Franja tejida: sección de personas
          Padding(
            padding: const EdgeInsets.fromLTRB(TvSpace.s6, TvSpace.s8, TvSpace.s6, 0), // Márgenes
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
              children: [
                Text('Detrás de cada viaje hay alguien con nombre', style: text.displayMedium), // Título
                const SizedBox(height: TvSpace.s3), // Espacio
                Text(
                  'La Vitrina de Nuestra Gente da visibilidad gratuita a comedores, guías, artesanos y fincas de todo el país. Escríbeles directo, sin intermediarios ni comisiones.', // Qué es
                  style: text.bodyLarge?.copyWith(color: tv.inkMuted),
                ),
                const SizedBox(height: TvSpace.s6), // Espacio
                Wrap(
                  spacing: TvSpace.s2, // Espacio horizontal
                  runSpacing: TvSpace.s2, // Espacio vertical
                  children: [
                    FilledButton(
                      onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SearchScreen(query: '', kind: 'business', title: 'Nuestra gente'))), // Lista de negocios publicados
                      child: const Text('Conocer a la gente'), // Texto
                    ),
                    OutlinedButton(
                      onPressed: Env.webUrl.isEmpty
                          ? () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('El registro de negocios aún no está disponible en Android. No disponible todavía.'))) // Honesto si no hay web configurada
                          : () => launchUrl(Uri.parse('${Env.webUrl}/es/comunidad/registrar'), mode: LaunchMode.externalApplication), // Abre el registro en la web
                      child: const Text('Publicar mi negocio'), // Texto
                    ),
                  ],
                ),
                const SizedBox(height: TvSpace.s8), // Espacio
                Semantics(header: true, child: Text('Relatos recientes', style: text.headlineSmall)), // Título
                const SizedBox(height: TvSpace.s1), // Espacio
                Text('En orden cronológico. No ordenamos por interacción ni vendemos posiciones.', style: TextStyle(color: tv.inkMuted, fontSize: 14)), // Regla del feed
              ],
            ),
          ),
          feed.when(
            loading: () => const Cargando(), // Mientras carga
            error: (e, _) => ErrorConReintento(error: e, onRetry: () => ref.invalidate(feedProvider)), // Error claro
            data: (posts) => posts.isEmpty
                ? const Vacio(text: 'Todavía no hay relatos publicados. Sé la primera persona en compartir uno desde la web.') // Sin relatos
                : Column(
                    children: [
                      for (final p in posts)
                        Container(
                          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: tv.line))), // Línea inferior
                          padding: const EdgeInsets.symmetric(horizontal: TvSpace.s6, vertical: TvSpace.s4), // Márgenes
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
                            children: [
                              Text(
                                [p.authorName ?? 'Viajero', DateFormat.yMMMd(locale).format(p.createdAt.toLocal()), if (p.isPromotional) 'Promocional'].join(', '), // Autor, fecha y aviso promocional
                                style: TextStyle(color: tv.inkMuted, fontSize: 14),
                              ),
                              if (p.title != null) Padding(padding: const EdgeInsets.only(top: TvSpace.s1), child: Text(p.title!, style: text.titleMedium)), // Título del relato
                              const SizedBox(height: TvSpace.s1), // Espacio
                              Text(p.body, maxLines: 4, overflow: TextOverflow.ellipsis), // Texto (resumido)
                              const SizedBox(height: TvSpace.s1), // Espacio
                              Text('${p.reactions} reacciones, ${p.comments} comentarios', style: TextStyle(color: tv.inkMuted, fontSize: 14)), // Interacción (solo informativa)
                            ],
                          ),
                        ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}
