import 'package:flutter/material.dart'; // Componentes visuales de Flutter

import '../../core/theme.dart'; // Colores y espaciados del sistema de diseño
import '../../core/widgets/franja_tejida.dart'; // Franja tejida para la sección Comunidad
import '../profile/profile_screen.dart'; // Pestaña de perfil con inicio y cierre de sesión
import '../territories/presentation/territories_screen.dart'; // Pestaña Descubrir

/// Navegación principal: Descubrir, Mi aventura, Comunidad, Perfil.
/// Los módulos que aún no existen en Android lo dicen; ningún destino finge funcionar.
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
      const TerritoriesScreen(), // Descubrir: territorios publicados
      const _Proximamente(
        title: 'Mi aventura', // Título de la sección
        body: 'El planificador ya funciona en la web. En Android llega con rutas calculadas y costos con fecha y fuente.', // Qué hará
        phase: 'Fase 7', // Cuándo llega a Android
      ),
      const _Proximamente(
        title: 'Comunidad', // Título de la sección
        body: 'La Vitrina de Nuestra Gente y los relatos ya están en la web. En Android llegan con mensajería y notificaciones.', // Qué hará
        phase: 'Fase 7', // Cuándo llega a Android
        woven: true, // Muestra la franja tejida porque es una sección de personas
      ),
      const ProfileScreen(), // Perfil: iniciar sesión, crear cuenta o cerrar sesión
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

/// Pantalla honesta para secciones que aún no existen en Android.
class _Proximamente extends StatelessWidget {
  const _Proximamente({required this.title, required this.body, required this.phase, this.woven = false}); // Recibe los textos

  final String title, body, phase; // Título, descripción y fase en que llega
  final bool woven; // Si muestra la franja tejida

  @override
  Widget build(BuildContext context) {
    final tv = context.tv; // Colores del tema
    final text = Theme.of(context).textTheme; // Estilos de texto
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch, // Ocupa todo el ancho
      children: [
        if (woven) const FranjaTejida(height: 14), // Franja tejida solo en Comunidad
        Padding(
          padding: const EdgeInsets.all(TvSpace.s6), // Margen
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
            children: [
              Text(title, style: text.displayMedium), // Título
              const SizedBox(height: TvSpace.s3), // Espacio
              Text(body, style: text.bodyMedium?.copyWith(color: tv.inkMuted)), // Descripción
              const SizedBox(height: TvSpace.s6), // Espacio
              Container(
                padding: const EdgeInsets.symmetric(horizontal: TvSpace.s4, vertical: TvSpace.s2), // Relleno de la etiqueta
                decoration: BoxDecoration(color: tv.groundRaised, borderRadius: BorderRadius.circular(999)), // Forma de píldora
                child: Text('No disponible todavía en Android. Llega en la $phase.', style: text.labelLarge), // Estado honesto
              ),
            ],
          ),
        ),
      ],
    );
  }
}
