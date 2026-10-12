import 'package:flutter/material.dart';

import '../../core/theme.dart';
import '../../core/widgets/franja_tejida.dart';
import '../territories/presentation/territories_screen.dart';

/// Navegación principal: Descubrir, Mi aventura, Comunidad, Perfil.
/// Los módulos no construidos lo dicen; ningún destino finge funcionar.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      const TerritoriesScreen(),
      const _Proximamente(
        title: 'Mi aventura',
        body: 'Aquí armarás tu viaje con el asistente: días, rutas calculadas por un proveedor de mapas y costos con fecha y fuente.',
        phase: 'Fase 5',
      ),
      const _Proximamente(
        title: 'Comunidad',
        body: 'La Vitrina de Nuestra Gente dará visibilidad gratuita a comedores, guías, artesanos y fincas, con contacto directo.',
        phase: 'Fase 4',
        woven: true,
      ),
      const _Proximamente(
        title: 'Perfil',
        body: 'Podrás entrar con tu correo o con Google y ver tus favoritos e itinerarios, los mismos que en la web.',
        phase: 'Fase 2',
      ),
    ];

    return Scaffold(
      body: SafeArea(child: pages[_index]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.explore_outlined), label: 'Descubrir'),
          NavigationDestination(icon: Icon(Icons.terrain_outlined), label: 'Mi aventura'),
          NavigationDestination(icon: Icon(Icons.people_outline), label: 'Comunidad'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Perfil'),
        ],
      ),
    );
  }
}

class _Proximamente extends StatelessWidget {
  const _Proximamente({required this.title, required this.body, required this.phase, this.woven = false});

  final String title, body, phase;
  final bool woven;

  @override
  Widget build(BuildContext context) {
    final tv = context.tv;
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (woven) const FranjaTejida(height: 14),
        Padding(
          padding: const EdgeInsets.all(TvSpace.s6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: text.displayMedium),
              const SizedBox(height: TvSpace.s3),
              Text(body, style: text.bodyMedium?.copyWith(color: tv.inkMuted)),
              const SizedBox(height: TvSpace.s6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: TvSpace.s4, vertical: TvSpace.s2),
                decoration: BoxDecoration(color: tv.groundRaised, borderRadius: BorderRadius.circular(999)),
                child: Text('No disponible todavía. Llega en la $phase.', style: text.labelLarge),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
