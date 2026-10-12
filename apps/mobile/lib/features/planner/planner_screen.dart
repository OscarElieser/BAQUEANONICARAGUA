import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:intl/intl.dart'; // Formato de dinero

import '../../core/theme.dart'; // Colores y espaciados
import 'trip_intent.dart'; // Interpretación del viaje (igual que la web)

const _interestLabel = {
  'beach': 'Playa', 'food': 'Comida local', 'small_business': 'Pequeños negocios', 'nature': 'Naturaleza', // Intereses 1 a 4
  'volcano': 'Volcanes', 'culture': 'Cultura', 'history': 'Historia', 'adventure': 'Aventura', // Intereses 5 a 8
  'coffee': 'Café', 'nightlife': 'Vida nocturna', 'family': 'En familia', // Intereses 9 a 11
}; // Nombres visibles (mismos que la web)

const _questions = {
  'travelers': '¿Cuántas personas viajan?', // Falta cuántos son
  'days': '¿Cuántos días dura el viaje?', // Faltan los días
  'budget_currency': '¿Tu presupuesto es en dólares o en córdobas?', // Falta la moneda
  'dates': '¿En qué fechas viajan?', // Faltan las fechas
  'transport': '¿Tendrán vehículo o usarán transporte público?', // Falta el transporte
}; // Preguntas para lo que falta (mismas que la web)

const _example = 'Vamos cinco días, somos cuatro, tenemos 600 dólares y queremos playa, buena comida y conocer pequeños negocios.'; // Ejemplo

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

    return ListView(
      padding: const EdgeInsets.fromLTRB(TvSpace.s6, TvSpace.s6, TvSpace.s6, TvSpace.s12), // Márgenes
      children: [
        Text('Mi aventura', style: text.displayMedium), // Título
        const SizedBox(height: TvSpace.s2), // Espacio
        Text('Escribe con tus palabras: cuántos son, cuántos días, presupuesto y qué les gusta.', style: TextStyle(color: tv.inkMuted)), // Instrucción
        const SizedBox(height: TvSpace.s4), // Espacio
        TextField(
          controller: _controller, // Texto
          minLines: 4, // Cuatro líneas visibles
          maxLines: 8, // Crece hasta ocho
          maxLength: 2000, // Límite
          decoration: const InputDecoration(labelText: 'Cuéntame tu viaje', hintText: _example, alignLabelWithHint: true), // Etiqueta y ejemplo
        ),
        Wrap(
          spacing: TvSpace.s2, // Espacio horizontal
          runSpacing: TvSpace.s2, // Espacio vertical
          crossAxisAlignment: WrapCrossAlignment.center, // Centrado vertical
          children: [
            FilledButton(onPressed: () => _understand(_controller.text), child: const Text('Entender mi viaje')), // Interpreta
            TextButton(
              onPressed: () {
                _controller.text = _example; // Escribe el ejemplo
                _understand(_example); // Y lo interpreta
              },
              child: const Text('Probar con un ejemplo'), // Texto
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
                  Semantics(header: true, child: Text('Esto es lo que entendí', style: text.titleLarge)), // Título
                  const SizedBox(height: TvSpace.s3), // Espacio
                  _Fila('Viajeros', intent.travelers == null ? missing('sin indicar') : Text('${intent.travelers}')), // Personas
                  _Fila('Días', intent.days == null ? missing('sin indicar') : Text('${intent.days}')), // Días
                  _Fila(
                    'Presupuesto', // Etiqueta
                    budget != null
                        ? Text([
                            '${money(budget.total, budget.currency)} en total', // Total
                            if (budget.perPerson != null) '${money(budget.perPerson!, budget.currency)} por persona', // Por persona
                            if (budget.perPersonPerDay != null) '${money(budget.perPersonPerDay!, budget.currency)} por persona al día', // Por persona al día
                          ].join(', '))
                        : intent.budget != null
                            ? missing('${intent.budget!.amount}, falta la moneda') // Hay cantidad pero no moneda
                            : missing('sin indicar'), // Sin presupuesto
                  ),
                  _Fila('Intereses', intent.interests.isEmpty ? missing('sin indicar') : Text(intent.interests.map((i) => _interestLabel[i] ?? i).join(', '))), // Intereses
                  if (intent.accessibilityNeeds) const _Fila('Accesibilidad', Text('Solo sugeriré lugares con accesibilidad comprobada.')), // Necesidades de accesibilidad
                  if (intent.missing.isNotEmpty) ...[
                    const SizedBox(height: TvSpace.s4), // Espacio
                    Text('Para armar rutas reales me falta saber', style: text.titleMedium), // Subtítulo
                    const SizedBox(height: TvSpace.s1), // Espacio
                    for (final m in intent.missing.take(2)) Text('• ${_questions[m]}'), // Máximo dos preguntas a la vez
                  ],
                  const SizedBox(height: TvSpace.s4), // Espacio
                  Text(
                    'Solo uso tarifas verificadas. Lo que no tenga precio confirmado aparecerá como "por cotizar", y los traslados se calculan con un proveedor de mapas.', // Promesa honesta
                    style: TextStyle(color: tv.inkMuted, fontSize: 14),
                  ),
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
