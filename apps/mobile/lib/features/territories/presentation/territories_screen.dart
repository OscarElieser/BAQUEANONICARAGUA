import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod

import '../../../core/data/models.dart'; // Datos del catálogo
import '../../../core/data/repositories.dart'; // Acceso al catálogo
import '../../../core/i18n/t.dart'; // Textos traducidos
import '../../../core/theme.dart'; // Colores y espaciados
import '../../../core/widgets/estados.dart'; // Cargando, error y vacío
import '../../../core/widgets/galeria_arco.dart'; // Galería en arco 3D
import '../../../core/widgets/mapa_territorios.dart'; // Mapa ilustrado de los 17 territorios
import '../../../core/widgets/portada_territorio.dart'; // Portadas y tarjetas de cada territorio
import '../../../core/widgets/portada_baqueano.dart'; // Portada con ventana pintada
import '../../../core/widgets/relieve_3d.dart'; // Relieve 3D interactivo
import '../../home/home_shell.dart'; // Para pasar a la pestaña Mi aventura
import '../../planner/planner_screen.dart'; // Mi aventura (si se abre fuera del menú principal)
import '../../catalog/search_screen.dart'; // Resultados de búsqueda
import '../../culture/culture_screen.dart'; // Mundo de Cultura
import 'territory_screen.dart'; // Ficha de territorio

/// Territorios publicados (RLS filtra los borradores).
final territoriesProvider = FutureProvider<List<Territory>>((ref) => ref.watch(catalogRepositoryProvider).territories()); // Lista de territorios

/// Pestaña Descubrir: portada de BAQUEANO, búsqueda, mapa, territorios y relieve 3D.
class TerritoriesScreen extends ConsumerStatefulWidget {
  const TerritoriesScreen({super.key}); // Constructor constante

  @override
  ConsumerState<TerritoriesScreen> createState() => _TerritoriesScreenState(); // Crea el estado
}

class _TerritoriesScreenState extends ConsumerState<TerritoriesScreen> {
  final _mapa = GlobalKey(); // Para bajar hasta el mapa con "Explorar Nicaragua"

  void _viaje() {
    final shell = PestanaShell.of(context); // Menú principal, si existe
    if (shell != null) {
      shell.ir(1); // Pasa a la pestaña Mi aventura
    } else {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PlannerScreen())); // Fuera del menú: la abre encima
    }
  }

  @override
  Widget build(BuildContext context) {
    final territories = ref.watch(territoriesProvider); // Territorios (o cargando)
    final tv = context.tv; // Colores
    final text = Theme.of(context).textTheme; // Estilos de texto

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: PortadaBaqueano(
            onExplorar: () {
              final ctx = _mapa.currentContext; // Mapa en pantalla
              if (ctx != null) Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 500), curve: Curves.easeOutCubic); // Baja hasta el mapa
            },
            onViaje: _viaje, // Abre Mi aventura
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(TvSpace.s4 + 4, TvSpace.s6, TvSpace.s4 + 4, TvSpace.s2), // Márgenes
          sliver: SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
              children: [
                Text(context.t('discover.intro'), style: text.bodyMedium?.copyWith(color: tv.inkMuted)), // Explicación
                const SizedBox(height: TvSpace.s4), // Espacio
                _Buscador(onSearch: (q) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => SearchScreen(query: q)))), // Busca y abre resultados
                const SizedBox(height: TvSpace.s4), // Espacio
                Material(
                  color: TvColors.barro, // Barro de San Juan de Oriente: puerta al mundo de Cultura
                  borderRadius: BorderRadius.circular(TvSpace.radiusM), // Esquinas redondeadas
                  child: ListTile(
                    minTileHeight: TvSpace.touchMin + 12, // Área táctil cómoda
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(TvSpace.radiusM)), // Onda del toque redondeada
                    title: Text(context.t('culture.title'), style: (Theme.of(context).extension<LetrasMundo>()?.cultura ?? const TextStyle()).copyWith(color: TvColors.bandMarfil, fontSize: 20)), // Nombre del mundo
                    trailing: const Icon(Icons.chevron_right, color: TvColors.bandMarfil), // Indica que se abre
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CultureScreen())), // Abre Cultura
                  ),
                ),
              ],
            ),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(TvSpace.s4 + 4, TvSpace.s4, TvSpace.s4 + 4, TvSpace.s4), // Márgenes
          sliver: SliverToBoxAdapter(child: KeyedSubtree(key: _mapa, child: _MapaConDatos(territories: territories.valueOrNull ?? const []))), // Mapa (los publicados se abren)
        ),
        territories.when(
          loading: () => const SliverToBoxAdapter(child: Cargando()), // Mientras carga
          error: (e, _) => SliverToBoxAdapter(child: ErrorConReintento(error: e, onRetry: () => ref.invalidate(territoriesProvider))), // Error claro
          data: (items) => items.isEmpty
              ? SliverToBoxAdapter(child: Vacio(text: context.t('home.empty'))) // Aún nada publicado
              : SliverList.separated(
                  itemCount: items.length, // Cantidad de territorios
                  separatorBuilder: (_, __) => const Divider(indent: 20, endIndent: 20), // Línea entre filas
                  itemBuilder: (_, i) => ListTile(
                    minTileHeight: TvSpace.touchMin + 8, // Área táctil cómoda
                    contentPadding: const EdgeInsets.symmetric(horizontal: 20), // Margen lateral
                    title: Text(items[i].shortName, style: const TextStyle(fontSize: 17)), // Nombre
                    trailing: Icon(Icons.chevron_right, color: tv.inkMuted), // Indica que se abre
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => TerritoryScreen(slug: items[i].slug, name: items[i].shortName))), // Abre la ficha
                  ),
                ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.only(top: TvSpace.s6), // Separación de la lista
            child: Container(height: 280, color: tv.groundRaised, child: const RelieveVivo3D()), // Relieve 3D de Ometepe, que se gira con el dedo
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: TvSpace.s8)), // Espacio al final
      ],
    );
  }
}

/// Mapa ilustrado cuando su archivo ya cargó; mientras tanto no ocupa espacio (la lista sigue disponible).
class _MapaConDatos extends ConsumerWidget {
  const _MapaConDatos({required this.territories}); // Recibe los territorios publicados
  final List<Territory> territories; // Publicados

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mapa = ref.watch(datosMapaProvider).valueOrNull; // Formas del mapa (o null mientras carga)
    if (mapa == null) return const SizedBox.shrink(); // Sin mapa todavía: no se muestra nada
    final bySlug = {for (final t in territories) t.slug: t}; // Territorios publicados por slug
    void abrir(FormaMapa f) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => TerritoryScreen(slug: f.id, name: bySlug[f.id]?.shortName ?? f.name))); // Abre la ficha
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
      children: [
        MapaTerritorios(mapa: mapa, published: bySlug.keys.toSet(), onOpen: abrir), // Mapa (los publicados se abren)
        const SizedBox(height: TvSpace.s8), // Espacio
        GaleriaArco(
          titulo: context.t('gallery.title'), // "Los 17, uno por uno"
          intro: context.t('gallery.intro'), // Aclara que son ilustraciones
          cantidad: mapa.territories.length, // Los 17
          constructor: (_, i) {
            final f = mapa.territories[i]; // Territorio
            return TarjetaTerritorio(mapa: mapa, forma: f, published: bySlug.containsKey(f.id), onOpen: () => abrir(f)); // Tarjeta real
          },
        ),
      ],
    );
  }
}

/// Campo de búsqueda con forma de píldora.
class _Buscador extends StatefulWidget {
  const _Buscador({required this.onSearch}); // Recibe qué hacer al buscar
  final void Function(String) onSearch; // Acción de búsqueda

  @override
  State<_Buscador> createState() => _BuscadorState(); // Crea el estado
}

class _BuscadorState extends State<_Buscador> {
  final _controller = TextEditingController(); // Texto escrito

  @override
  void dispose() {
    _controller.dispose(); // Libera el controlador
    super.dispose(); // Libera el resto
  }

  void _submit() {
    final q = _controller.text.trim(); // Texto sin espacios sobrantes
    if (q.length >= 2) widget.onSearch(q); // Busca solo con al menos 2 letras
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller, // Texto escrito
      textInputAction: TextInputAction.search, // Botón "buscar" en el teclado
      onSubmitted: (_) => _submit(), // Busca al confirmar
      decoration: InputDecoration(
        labelText: context.t('discover.search_label'), // Etiqueta accesible
        hintText: context.t('home.search_placeholder'), // Ejemplo
        suffixIcon: IconButton(icon: const Icon(Icons.search), tooltip: context.t('discover.search_button'), onPressed: _submit), // Botón de búsqueda
      ),
    );
  }
}
