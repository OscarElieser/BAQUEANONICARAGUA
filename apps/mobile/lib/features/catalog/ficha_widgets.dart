import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:intl/intl.dart'; // Formato de dinero y fechas

import '../../core/data/models.dart'; // Datos del catálogo
import '../../core/theme.dart'; // Colores y espaciados

const _weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']; // Días ISO 8601 (1 = lunes, 7 = domingo), como en la base de datos

/// Hora en formato HH:MM ("08:00:00" -> "08:00"); "?" si falta.
String _hhmm(String? t) => t == null ? '?' : (t.length >= 5 ? t.substring(0, 5) : t); // Recorta los segundos sin fallar

/// Horarios comprobados; si no hay, lo dice en lugar de inventarlos.
class Horarios extends StatelessWidget {
  const Horarios({super.key, required this.hours}); // Recibe los horarios
  final List<OpeningHours> hours; // Horarios

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme; // Estilos
    final sorted = [...hours]..sort((a, b) => a.weekday.compareTo(b.weekday)); // De lunes a domingo
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
      children: [
        Semantics(header: true, child: Text('Horarios', style: text.titleLarge)), // Título
        const SizedBox(height: TvSpace.s2), // Espacio
        if (sorted.isEmpty)
          Text('Sin confirmar. Consulta antes de ir.', style: TextStyle(color: context.tv.inkMuted)) // Sin horarios
        else
          for (final h in sorted)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 3), // Separación entre días
              child: Row(
                children: [
                  SizedBox(width: 110, child: Text(_weekdays[(h.weekday - 1).clamp(0, 6)])), // Día (1 = lunes)
                  Expanded(child: Text(h.closed ? 'Cerrado' : '${_hhmm(h.opensAt)} a ${_hhmm(h.closesAt)}')), // Horario o cerrado
                ],
              ),
            ),
      ],
    );
  }
}

/// Tarifas observadas, cada una con su fecha y quién la informó.
class Tarifas extends StatelessWidget {
  const Tarifas({super.key, required this.prices}); // Recibe las tarifas
  final List<PriceObservation> prices; // Tarifas

  @override
  Widget build(BuildContext context) {
    final tv = context.tv; // Colores
    final text = Theme.of(context).textTheme; // Estilos
    final locale = Localizations.localeOf(context).toLanguageTag(); // Idioma para el formato
    String who(String r) => switch (r) {
          'owner' => 'informado por el negocio', // Lo dijo el negocio
          'official_source' => 'fuente oficial', // Fuente oficial
          _ => 'equipo editorial', // Lo comprobó el equipo
        };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
      children: [
        Semantics(header: true, child: Text('Tarifas', style: text.titleLarge)), // Título
        const SizedBox(height: TvSpace.s2), // Espacio
        if (prices.isEmpty)
          Text('Por cotizar. Consulta al prestador.', style: TextStyle(color: tv.inkMuted)) // Sin precios: no se inventan
        else
          for (final p in prices)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: TvSpace.s1), // Separación
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
                children: [
                  Text('${p.label}: ${NumberFormat.simpleCurrency(locale: locale, name: p.currency).format(p.amount)}${p.unit != null ? ' ${p.unit}' : ''}'), // Concepto y precio
                  Text('Observado el ${DateFormat.yMMMd(locale).format(p.observedAt)}, ${who(p.reportedBy)}', style: TextStyle(color: tv.inkMuted, fontSize: 14)), // Fecha y fuente
                ],
              ),
            ),
      ],
    );
  }
}
