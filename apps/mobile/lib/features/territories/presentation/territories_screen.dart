import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Lee los territorios publicados (RLS filtra los borradores).
final territoriesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final rows = await Supabase.instance.client
      .from('departments')
      .select('id, slug, name, kind')
      .order('name');
  return List<Map<String, dynamic>>.from(rows);
});

class TerritoriesScreen extends ConsumerWidget {
  const TerritoriesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final territories = ref.watch(territoriesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Territorios')),
      body: territories.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('No se pudo cargar el catálogo territorial.'),
            TextButton(
              onPressed: () => ref.invalidate(territoriesProvider),
              child: const Text('Reintentar'),
            ),
          ]),
        ),
        data: (items) => items.isEmpty
            ? const Center(child: Text('Aún no hay territorios publicados.'))
            : ListView.builder(
                itemCount: items.length,
                itemBuilder: (_, i) => ListTile(title: Text(items[i]['name'] as String)),
              ),
      ),
    );
  }
}
