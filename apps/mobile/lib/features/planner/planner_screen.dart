import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:intl/intl.dart'; // Formato de dinero

import '../../core/i18n/t.dart'; // Textos traducidos
import '../../core/theme.dart'; // Colores y espaciados
import 'trip_intent.dart'; // Interpretación del viaje (igual que la web)

/// Mi aventura: entiende el viaje en el propio teléfono (funciona sin conexión) y pregunta solo lo que falta.
class PlannerScreen extends StatefulWidget {
  const PlannerScreen({super.key}); // Constructor constante

  @override
  State<PlannerScreen> createState() => _PlannerScreenState(); // Crea el estado
}

class _PlannerScreenState extends State<PlannerScreen> {
  final _controller = TextEditingController(); // Texto del viaje
  TripIntent? _intent; // Lo entendido (o null si aún no se envió)

  @override
  void dispose() {
    _controller.dispose(); // Libera el controlador
    super.dispose(); // Libera el resto
  }

  void _understand(String text) {
    if (text.trim().length < 2) return; // Texto demasiado corto
    FocusScope.of(context).unfocus(); // Cierra el teclado
    setState(() => _intent = parseTripIntent(text.trim())); // Interpreta el viaje
  }

  @override
  Widget build(BuildContext context) {
    final tv = context.tv; // Colores
    final text = Theme.of(context).textTheme; // Estilos
    final locale = Localizations.localeOf(context).toLanguageTag(); // Idioma para el dinero
    final intent = _intent; // Copia local
    final budget = intent == null ? null : budgetBreakdown(intent); // Desglose del presupuesto
    String money(num n, String c) => NumberFormat.simpleCurrency(locale: locale, name: c).format(n); // Dinero con su moneda
    Widget missing(String label) => Text(label, style: TextStyle(color: tv.oroText)); // Dato que falta, en oro
    final example = context.t('planner.example'); // Ejemplo en un idioma que el intérprete entiende
    final understoodLanguage = context.langCode == 'es' || context.langCode == 'en'; // El intérprete entiende español e inglés
    final notGiven = context.t('planner.not_given'); // Texto de dato faltante

    return ListView(
      padding: const EdgeInsets.fromLTRB(TvSpace.s6, TvSpace.s6, TvSpace.s6, TvSpace.s12), // Márgenes
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(TvSpace.radiusM), // Esquinas redondeadas
          child: ColoredBox(
            color: TvColors.bandAnil, // Añil de los buses pintados
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(TvSpace.s4 + 4, TvSpace.s6, TvSpace.s4 + 4, TvSpace.s4), // Márgenes
                  child: Text(context.t('nav.adventure'), style: Theme.of(context).extension<LetrasMundo>()?.aventura.copyWith(fontSize: (text.displayMedium?.fontSize ?? 34) + 6) ?? text.displayMedium), // Rótulo en maíz
                ),
                const SizedBox(height: 6, width: double.infinity, child: ColoredBox(color: TvColors.bandMaiz)), // Franja de maíz
                const SizedBox(height: 6, width: double.infinity, child: ColoredBox(color: TvColors.bandAchiote)), // Franja de achiote
                const SizedBox(height: 6, width: double.infinity, child: ColoredBox(color: TvColors.bandMarfil)), // Franja de marfil
              ],
            ),
          ),
        ), // Rótulo de bus pintado
        const SizedBox(height: TvSpace.s2), // Espacio
        Text(context.t('planner.hint'), style: TextStyle(color: tv.inkMuted)), // Instrucción
        if (!understoodLanguage)
          Padding(padding: const EdgeInsets.only(top: TvSpace.s2), child: Text(context.t('planner.languages_note'), style: TextStyle(color: tv.oroText))), // Aviso honesto de idiomas
        const SizedBox(height: TvSpace.s4), // Espacio
        TextField(
          controller: _controller, // Texto
          minLines: 4, // Cuatro líneas visibles
          maxLines: 8, // Crece hasta ocho
          maxLength: 2000, // Límite
          decoration: InputDecoration(labelText: context.t('planner.label'), hintText: example, alignLabelWithHint: true), // Etiqueta y ejemplo
        ),
        Wrap(
          spacing: TvSpace.s2, // Espacio horizontal
          runSpacing: TvSpace.s2, // Espacio vertical
          crossAxisAlignment: WrapCrossAlignment.center, // Centrado vertical
          children: [
            FilledButton(onPressed: () => _understand(_controller.text), child: Text(context.t('planner.understand'))), // Interpreta
            TextButton(
              onPressed: () {
                _controller.text = example; // Escribe el ejemplo
                _understand(example); // Y lo interpreta
              },
              child: Text(context.t('planner.try_example')), // Texto
            ),
          ],
        ),
        const SizedBox(height: TvSpace.s6), // Espacio
        if (intent != null)
          Semantics(
            liveRegion: true, // Se anuncia al aparecer
            child: Container(
              padding: const EdgeInsets.all(TvSpace.s4), // Relleno
              decoration: BoxDecoration(color: tv.groundRaised, borderRadius: BorderRadius.circular(TvSpace.radiusM)), // Tarjeta
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
                children: [
                  Semantics(header: true, child: Text(context.t('planner.understood'), style: text.titleLarge)), // Título
                  const SizedBox(height: TvSpace.s3), // Espacio
                  _Fila(context.t('planner.travelers'), intent.travelers == null ? missing(notGiven) : Text('${intent.travelers}')), // Personas
                  _Fila(context.t('planner.days'), intent.days == null ? missing(notGiven) : Text('${intent.days}')), // Días
                  _Fila(
                    context.t('planner.budget'), // Etiqueta
                    budget != null
                        ? Text([
                            context.t('planner.total', {'amount': money(budget.total, budget.currency)}), // Total
                            if (budget.perPerson != null) context.t('planner.per_person', {'amount': money(budget.perPerson!, budget.currency)}), // Por persona
                            if (budget.perPersonPerDay != null) context.t('planner.per_person_day', {'amount': money(budget.perPersonPerDay!, budget.currency)}), // Por persona al día
                          ].join(', '))
                        : intent.budget != null
                            ? missing(context.t('planner.currency_missing', {'amount': intent.budget!.amount})) // Hay cantidad pero no moneda
                            : missing(notGiven), // Sin presupuesto
                  ),
                  _Fila(context.t('planner.interests'), intent.interests.isEmpty ? missing(notGiven) : Text(intent.interests.map((i) => context.t('interest.$i')).join(', '))), // Intereses
                  if (intent.accessibilityNeeds) _Fila(context.t('planner.accessibility'), Text(context.t('planner.accessibility_note'))), // Necesidades de accesibilidad
                  if (intent.missing.isNotEmpty) ...[
                    const SizedBox(height: TvSpace.s4), // Espacio
                    Text(context.t('planner.missing_title'), style: text.titleMedium), // Subtítulo
                    const SizedBox(height: TvSpace.s1), // Espacio
                    for (final m in intent.missing.take(2)) Text('• ${context.t('question.$m')}'), // Máximo dos preguntas a la vez
                  ],
                  const SizedBox(height: TvSpace.s4), // Espacio
                  Text(context.t('planner.promise'), style: TextStyle(color: tv.inkMuted, fontSize: 14)), // Promesa honesta
                ],
              ),
            ),
          ),
      ],
    );
  }
}

/// Fila "etiqueta: valor" de la tarjeta.
class _Fila extends StatelessWidget {
  const _Fila(this.label, this.value); // Recibe etiqueta y valor
  final String label; // Etiqueta
  final Widget value; // Valor

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4), // Separación
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start, // Alineado arriba
          children: [
            SizedBox(width: 110, child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700))), // Etiqueta
            Expanded(child: value), // Valor
          ],
        ),
      );
}
