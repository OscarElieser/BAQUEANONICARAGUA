import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod

import '../../core/data/models.dart'; // Datos del catálogo
import '../../core/data/repositories.dart'; // Acceso al catálogo
import '../../core/i18n/t.dart'; // Textos traducidos
import '../../core/theme.dart'; // Colores y espaciados
import '../../core/widgets/estados.dart'; // Cargando, error y vacío
import 'business_screen.dart'; // Ficha de negocio
import 'destination_screen.dart'; // Ficha de destino

/// Resultados de búsqueda por texto y territorio.
final searchProvider = FutureProvider.family<List<CatalogItem>, (String, int?, String?)>(
  (ref, args) => ref.watch(catalogRepositoryProvider).search(args.$1, departmentId: args.$2, kind: args.$3), // Pide la búsqueda
);

/// Lista de destinos y negocios. A igual relevancia el orden rota cada día; lo patrocinado nunca sube por pagar.
class SearchScreen extends ConsumerWidget {
  const SearchScreen({super.key, required this.query, this.departmentId, this.kind, this.title}); // Recibe la búsqueda
  final String query; // Texto buscado
  final int? departmentId; // Territorio (opcional)
  final String? kind; // Solo destinos o solo negocios (opcional)
  final String? title; // Título de la barra (opcional)

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final args = (query, departmentId, kind); // Parámetros
    final results = ref.watch(searchProvider(args)); // Resultados (o cargando)
    final tv = context.tv; // Colores

    return Scaffold(
      appBar: AppBar(title: Text(title ?? context.t('search.results_for', {'q': query}))), // Barra con lo buscado
      body: results.when(
        loading: () => const Cargando(), // Mientras busca
        error: (e, _) => ErrorConReintento(error: e, onRetry: () => ref.invalidate(searchProvider(args))), // Error claro
        data: (items) => items.isEmpty
            ? Vacio(text: context.t('search.empty')) // Sin resultados
            : ListView.separated(
                padding: const EdgeInsets.symmetric(vertical: TvSpace.s2), // Margen vertical
                itemCount: items.length, // Cantidad
                separatorBuilder: (_, __) => const Divider(indent: 20, endIndent: 20), // Línea entre filas
                itemBuilder: (_, i) {
                  final it = items[i]; // Resultado
                  final isBusiness = it.kind == 'business'; // Si es un negocio
                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: TvSpace.s1), // Área táctil
                    leading: Icon(isBusiness ? Icons.storefront_outlined : Icons.landscape_outlined, color: tv.accent), // Tipo de ficha
                    title: Text(it.name), // Nombre
                    subtitle: Text(
                      [isBusiness ? context.t('search.business') : context.t('search.destination'), if (it.verification == 'verified') context.t('search.verified'), if (it.summary != null) it.summary!].join('. '), // Tipo, verificación y resumen
                      maxLines: 2, // Máximo dos líneas
                      overflow: TextOverflow.ellipsis, // Puntos suspensivos si es largo
                    ),
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => isBusiness ? BusinessScreen(slug: it.slug, name: it.name) : DestinationScreen(slug: it.slug, name: it.name), // Abre la ficha correspondiente
                    )),
                  );
                },
              ),
      ),
    );
  }
}
