import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme.dart';
import '../../../core/widgets/curvas_de_nivel.dart';

/// Territorios publicados (RLS filtra los borradores).
final territoriesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final rows = await Supabase.instance.client.from('departments').select('id, slug, name, kind').order('name');
  return List<Map<String, dynamic>>.from(rows);
});

String _shortName(Map<String, dynamic> t) {
  final name = t['name'] as String;
  return t['kind'] == 'autonomous_region' ? name.replaceFirst('Región Autónoma de la ', '') : name;
}

class TerritoriesScreen extends ConsumerWidget {
  const TerritoriesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final territories = ref.watch(territoriesProvider);
    final tv = context.tv;
    final text = Theme.of(context).textTheme;

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Container(
            height: 220,
            color: tv.groundRaised,
            child: const CurvasDeNivel(semanticLabel: 'Curvas de nivel de un volcán'),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(TvSpace.s4 + 4, TvSpace.s6, TvSpace.s4 + 4, TvSpace.s2),
          sliver: SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Nicaragua, curva por curva', style: text.displayLarge),
                const SizedBox(height: TvSpace.s3),
                Text(
                  'Elige un territorio. Cada ficha indica su fuente y la fecha en que se comprobó.',
                  style: text.bodyMedium?.copyWith(color: tv.inkMuted),
                ),
              ],
            ),
          ),
        ),
        territories.when(
          loading: () => const SliverFillRemaining(child: Center(child: CircularProgressIndicator())),
          error: (e, _) => SliverFillRemaining(
            child: Padding(
              padding: const EdgeInsets.all(TvSpace.s6),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('No se pudo cargar el catálogo territorial.', style: TextStyle(color: tv.statusAlert)),
                  const SizedBox(height: TvSpace.s3),
                  OutlinedButton(onPressed: () => ref.invalidate(territoriesProvider), child: const Text('Reintentar')),
                ],
              ),
            ),
          ),
          data: (items) => items.isEmpty
              ? SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(TvSpace.s6),
                    child: Text(
                      'Los territorios se publican a medida que el equipo editorial verifica sus fuentes. Vuelve pronto.',
                      style: text.bodyMedium?.copyWith(color: tv.inkMuted),
                    ),
                  ),
                )
              : SliverList.separated(
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const Divider(indent: 20, endIndent: 20),
                  itemBuilder: (_, i) => ListTile(
                    minTileHeight: TvSpace.touchMin + 8,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 20),
                    title: Text(_shortName(items[i]), style: const TextStyle(fontSize: 17)),
                    trailing: Icon(Icons.chevron_right, color: tv.inkMuted),
                    onTap: () {
                      // La ficha de territorio llega en la Fase 3; mientras tanto se informa sin fingir.
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('La ficha del territorio estará disponible en la Fase 3.')),
                      );
                    },
                  ),
                ),
        ),
      ],
    );
  }
}
