import 'package:flutter/material.dart'; // Componentes visuales de Flutter

import '../../core/i18n/t.dart'; // Textos traducidos

import '../community/community_screen.dart'; // Pestaña Comunidad
import '../planner/planner_screen.dart'; // Pestaña Mi aventura
import '../profile/profile_screen.dart'; // Pestaña de perfil con inicio y cierre de sesión
import '../territories/presentation/territories_screen.dart'; // Pestaña Descubrir

/// Permite que una pantalla cambie de pestaña (por ejemplo, "Crear mi viaje" abre Mi aventura).
class PestanaShell extends InheritedWidget {
  const PestanaShell({super.key, required this.ir, required super.child}); // Constructor
  final void Function(int indice) ir; // Cambia a la pestaña indicada

  static PestanaShell? of(BuildContext context) => context.dependOnInheritedWidgetOfExactType<PestanaShell>(); // La más cercana (o null fuera del menú principal)

  @override
  bool updateShouldNotify(PestanaShell old) => false; // La función no cambia de comportamiento
}

/// Navegación principal: Descubrir, Mi aventura, Comunidad, Perfil.
/// Cada pestaña muestra datos reales o explica por qué aún no están disponibles.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key}); // Constructor constante

  @override
  State<HomeShell> createState() => _HomeShellState(); // Crea el estado de la navegación
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0; // Pestaña seleccionada (0 = Descubrir)

  @override
  Widget build(BuildContext context) {
    final pages = [
      const TerritoriesScreen(), // Descubrir: relieve, búsqueda y territorios
      const PlannerScreen(), // Mi aventura: entiende el viaje y pregunta lo que falta
      const CommunityScreen(), // Comunidad: Vitrina de Nuestra Gente y relatos
      const ProfileScreen(), // Perfil: sesión, mensajes e información legal
    ];

    return Scaffold(
      body: PestanaShell(ir: (i) => setState(() => _index = i), child: SafeArea(child: pages[_index])), // Muestra la pestaña elegida respetando las zonas seguras; las pantallas pueden pedir otra pestaña
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index, // Marca la pestaña activa
        onDestinationSelected: (i) => setState(() => _index = i), // Cambia de pestaña al tocar
        destinations: [
          NavigationDestination(icon: const Icon(Icons.explore_outlined), label: context.t('nav.discover')), // Pestaña Descubrir
          NavigationDestination(icon: const Icon(Icons.terrain_outlined), label: context.t('nav.adventure')), // Pestaña Mi aventura
          NavigationDestination(icon: const Icon(Icons.people_outline), label: context.t('nav.community')), // Pestaña Comunidad
          NavigationDestination(icon: const Icon(Icons.person_outline), label: context.t('nav.profile')), // Pestaña Perfil
        ],
      ),
    );
  }
}
