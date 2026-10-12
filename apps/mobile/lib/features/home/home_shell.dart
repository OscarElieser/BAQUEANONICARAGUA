import 'package:flutter/material.dart'; // Componentes visuales de Flutter

import '../community/community_screen.dart'; // Pestaña Comunidad
import '../planner/planner_screen.dart'; // Pestaña Mi aventura
import '../profile/profile_screen.dart'; // Pestaña de perfil con inicio y cierre de sesión
import '../territories/presentation/territories_screen.dart'; // Pestaña Descubrir

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
      body: SafeArea(child: pages[_index]), // Muestra la pestaña elegida respetando las zonas seguras de la pantalla
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index, // Marca la pestaña activa
        onDestinationSelected: (i) => setState(() => _index = i), // Cambia de pestaña al tocar
        destinations: const [
          NavigationDestination(icon: Icon(Icons.explore_outlined), label: 'Descubrir'), // Pestaña Descubrir
          NavigationDestination(icon: Icon(Icons.terrain_outlined), label: 'Mi aventura'), // Pestaña Mi aventura
          NavigationDestination(icon: Icon(Icons.people_outline), label: 'Comunidad'), // Pestaña Comunidad
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Perfil'), // Pestaña Perfil
        ],
      ),
    );
  }
}
