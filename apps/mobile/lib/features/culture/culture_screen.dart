import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod

import '../../core/data/models.dart'; // Hechos y patrimonio
import '../../core/data/repositories.dart'; // Acceso a los datos
import '../../core/i18n/t.dart'; // Textos traducidos
import '../../core/theme.dart'; // Colores, letras y espaciados
import '../../core/widgets/estados.dart'; // Cargando, error y vacío
import '../../core/widgets/greca.dart'; // Friso de greca

/// Línea de tiempo y patrimonio publicados.
final cultureProvider = FutureProvider<(List<HistoryEvent>, List<HeritageItem>)>((ref) => ref.watch(catalogRepositoryProvider).culture()); // Datos de Cultura

const _eras = {'prehispanic': 'era.prehispanic', 'colonial': 'era.colonial', 'republican': 'era.republican', 'contemporary': 'era.contemporary'}; // Clave del nombre de cada época

/// Mundo de Cultura: barro de San Juan de Oriente, greca y letra rotunda (igual que la web).
class CultureScreen extends ConsumerWidget {
  const CultureScreen({super.key}); // Constructor

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(cultureProvider); // Datos (o cargando)
    final tv = context.tv; // Colores
    final text = Theme.of(context).textTheme; // Estilos
    final letra = Theme.of(context).extension<LetrasMundo>()?.cultura; // Letra de Cultura (Caprasimo)
    const marfil = TvColors.bandMarfil; // Texto sobre el barro (5.38:1)
    String year(int y) => y < 0 ? context.t('culture.bce', {'year': -y}) : '$y'; // Año, con "a. C." si es antes de Cristo

    return Scaffold(
      appBar: AppBar(title: Text(context.t('culture.title'))), // Barra con el título
      body: ListView(
        padding: const EdgeInsets.only(bottom: TvSpace.s12), // Espacio al final
        children: [
          ColoredBox(
            color: TvColors.barro, // Fondo de barro
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(TvSpace.s6, TvSpace.s8, TvSpace.s6, TvSpace.s6), // Márgenes
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
                    children: [
                      Semantics(header: true, child: Text(context.t('culture.title'), style: (letra ?? text.displayMedium)?.copyWith(fontSize: 40, color: marfil))), // Titular del mundo
                      const SizedBox(height: TvSpace.s4), // Espacio
                      Text(context.t('culture.intro'), style: text.bodyLarge?.copyWith(color: marfil)), // Cómo se trata el contenido
                    ],
                  ),
                ),
                const Greca(color: marfil), // Friso que se traza al llegar
                const SizedBox(height: TvSpace.s3), // Respiro bajo el friso
              ],
            ),
          ),
          data.when(
            loading: () => const Cargando(), // Mientras carga
            error: (e, _) => ErrorConReintento(error: e, onRetry: () => ref.invalidate(cultureProvider)), // Error claro
            data: (result) {
              final (events, items) = result; // Hechos y piezas
              return Padding(
                padding: const EdgeInsets.fromLTRB(TvSpace.s6, TvSpace.s8, TvSpace.s6, 0), // Márgenes
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
                  children: [
                    Semantics(header: true, child: Text(context.t('culture.timeline'), style: (letra ?? text.headlineMedium)?.copyWith(fontSize: 28))), // Línea de tiempo
                    const SizedBox(height: TvSpace.s4), // Espacio
                    if (events.isEmpty) Text(context.t('culture.timeline_empty'), style: TextStyle(color: tv.inkMuted)), // Aún vacía
                    for (final e in events)
                      Padding(
                        padding: const EdgeInsets.only(bottom: TvSpace.s6), // Espacio entre hechos
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start, // Alineado arriba
                          children: [
                            Container(
                              margin: const EdgeInsets.only(top: 4, right: TvSpace.s4), // Separación del texto
                              width: 16, // Tamaño del sello
                              height: 16, // Tamaño del sello
                              decoration: BoxDecoration(shape: BoxShape.circle, color: TvColors.barro, border: Border.all(color: TvColors.bandMarfil, width: 2)), // Sello de barro con anillo
                            ),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
                                children: [
                                  Text(
                                    '${_eras[e.era] == null ? e.era : context.t(_eras[e.era]!)}: ${e.approximate ? context.t('culture.around', {'year': year(e.startYear)}) : year(e.startYear)}${e.endYear == null ? '' : '–${year(e.endYear!)}'}', // Época y fecha
                                    style: TextStyle(color: tv.inkMuted, fontSize: 14), // Metadato
                                  ),
                                  Text(e.title, style: (letra ?? text.titleLarge)?.copyWith(fontSize: 21)), // Hecho
                                  if (e.summary != null) Text(e.summary!), // Resumen
                                  if (e.contested) Text(context.t('culture.contested'), style: TextStyle(color: tv.oroText, fontSize: 14)), // Aviso de perspectivas
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: TvSpace.s6), // Espacio
                    Semantics(header: true, child: Text(context.t('culture.heritage'), style: (letra ?? text.headlineMedium)?.copyWith(fontSize: 28))), // Patrimonio
                    const SizedBox(height: TvSpace.s4), // Espacio
                    if (items.isEmpty) Text(context.t('culture.heritage_empty'), style: TextStyle(color: tv.inkMuted)), // Aún vacío
                    for (final h in items)
                      Padding(
                        padding: const EdgeInsets.only(bottom: TvSpace.s4), // Espacio entre piezas
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(TvSpace.radiusM), // Esquinas redondeadas
                          child: ColoredBox(
                            color: TvColors.barro, // Pieza de barro
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
                              children: [
                                const Opacity(opacity: 0.6, child: Greca(color: marfil, height: 20)), // Borde de greca
                                Padding(
                                  padding: const EdgeInsets.fromLTRB(TvSpace.s4 + 4, TvSpace.s2, TvSpace.s4 + 4, TvSpace.s4 + 4), // Márgenes
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
                                    children: [
                                      Text(h.title, style: (letra ?? text.titleLarge)?.copyWith(fontSize: 21, color: marfil)), // Nombre de la pieza
                                      if (h.unesco) Text(context.t('culture.unesco'), style: const TextStyle(color: marfil, fontSize: 14)), // Reconocimiento
                                      if (h.summary != null) Text(h.summary!, style: const TextStyle(color: marfil)), // Resumen
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
