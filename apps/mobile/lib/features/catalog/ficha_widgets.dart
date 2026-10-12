import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:intl/intl.dart'; // Formato de dinero y fechas

import '../../core/data/models.dart'; // Datos del catálogo
import '../../core/i18n/t.dart'; // Textos traducidos
import '../../core/theme.dart'; // Colores y espaciados

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
        Semantics(header: true, child: Text(context.t('field.hours'), style: text.titleLarge)), // Título
        const SizedBox(height: TvSpace.s2), // Espacio
        if (sorted.isEmpty)
          Text(context.t('hours.none'), style: TextStyle(color: context.tv.inkMuted)) // Sin horarios
        else
          for (final h in sorted)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 3), // Separación entre días
              child: Row(
                children: [
                  SizedBox(width: 110, child: Text(context.t('weekday.${h.weekday.clamp(1, 7)}'))), // Día ISO 8601 (1 = lunes, 7 = domingo)
                  Expanded(child: Text(h.closed ? context.t('hours.closed') : context.t('hours.range', {'open': _hhmm(h.opensAt), 'close': _hhmm(h.closesAt)}))), // Horario o cerrado
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
          'owner' => context.t('prices.by_owner'), // Lo dijo el negocio
          'official_source' => context.t('prices.by_official'), // Fuente oficial
          _ => context.t('prices.by_editor'), // Lo comprobó el equipo
        };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
      children: [
        Semantics(header: true, child: Text(context.t('field.prices'), style: text.titleLarge)), // Título
        const SizedBox(height: TvSpace.s2), // Espacio
        if (prices.isEmpty)
          Text(context.t('prices.none'), style: TextStyle(color: tv.inkMuted)) // Sin precios: no se inventan
        else
          for (final p in prices)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: TvSpace.s1), // Separación
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
                children: [
                  Text('${p.label}: ${NumberFormat.simpleCurrency(locale: locale, name: p.currency).format(p.amount)}${p.unit != null ? ' ${p.unit}' : ''}'), // Concepto y precio
                  Text(context.t('prices.observed', {'date': DateFormat.yMMMd(locale).format(p.observedAt), 'who': who(p.reportedBy)}), style: TextStyle(color: tv.inkMuted, fontSize: 14)), // Fecha y fuente
                ],
              ),
            ),
      ],
    );
  }
}
