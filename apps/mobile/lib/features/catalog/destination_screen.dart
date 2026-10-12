import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod
import 'package:url_launcher/url_launcher.dart'; // Abrir la fuente

import '../../core/data/models.dart'; // Datos del catálogo
import '../../core/data/repositories.dart'; // Acceso al catálogo
import '../../core/data/verification.dart'; // Reglas de verificación
import '../../core/theme.dart'; // Colores y espaciados
import '../../core/widgets/estado_verificacion.dart'; // "Qué está comprobado"
import '../../core/widgets/estados.dart'; // Cargando, error y vacío
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
    final tv = context.tv; // Colores
    return Scaffold(
      appBar: AppBar(title: Text(name)), // Barra con el nombre
      body: data.when(
        loading: () => const Cargando(), // Mientras carga
        error: (e, _) => ErrorConReintento(error: e, onRetry: () => ref.invalidate(destinationProvider(slug))), // Error claro
        data: (d) => d == null
            ? const Vacio(text: 'Este destino no está publicado todavía.') // No existe
            : ListView(
                padding: const EdgeInsets.fromLTRB(TvSpace.s6, TvSpace.s4, TvSpace.s6, TvSpace.s12), // Márgenes
                children: [
                  Text(d.name, style: text.displayMedium), // Nombre
                  if (d.summary != null) Padding(padding: const EdgeInsets.only(top: TvSpace.s2), child: Text(d.summary!, style: text.bodyLarge?.copyWith(color: tv.inkMuted))), // Resumen
                  const SizedBox(height: TvSpace.s6), // Espacio
                  EstadoVerificacion(
                    rows: destinationRows(d), // Ubicación, horarios, tarifas y seguridad
                    onOpenSource: d.sourceUrl == null ? null : () => launchUrl(Uri.parse(d.sourceUrl!), mode: LaunchMode.externalApplication), // Abre la fuente
                  ),
                  if (d.data['access_notes'] != null) ...[
                    const SizedBox(height: TvSpace.s6), // Espacio
                    Semantics(header: true, child: Text('Cómo llegar', style: text.titleLarge)), // Título
                    const SizedBox(height: TvSpace.s2), // Espacio
                    Text(d.data['access_notes'] as String), // Indicaciones de acceso
                  ],
                  const SizedBox(height: TvSpace.s6), // Espacio
                  Horarios(hours: d.hours), // Horarios
                  const SizedBox(height: TvSpace.s6), // Espacio
                  Tarifas(prices: d.prices), // Tarifas
                  if (d.data['description_md'] != null) ...[
                    const SizedBox(height: TvSpace.s6), // Espacio
                    Semantics(header: true, child: Text('Sobre este lugar', style: text.titleLarge)), // Título
                    const SizedBox(height: TvSpace.s2), // Espacio
                    Text(d.data['description_md'] as String, style: text.bodyLarge), // Descripción
                  ],
                  if (d.data['environmental_notes'] != null) ...[
                    const SizedBox(height: TvSpace.s6), // Espacio
                    Semantics(header: true, child: Text('Cuidado del lugar', style: text.titleLarge)), // Título
                    const SizedBox(height: TvSpace.s2), // Espacio
                    Text(d.data['environmental_notes'] as String), // Recomendaciones ambientales
                  ],
                ],
              ),
      ),
    );
  }
}
