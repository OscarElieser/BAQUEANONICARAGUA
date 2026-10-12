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

/// Cómo se presentan las tarifas: lista simple, talones de boleto (destinos) o pizarra de pulpería (negocios).
enum EstiloTarifas { lista, talones, pizarra }

/// Tarifas observadas, cada una con su fecha y quién la informó.
class Tarifas extends StatelessWidget {
  const Tarifas({super.key, required this.prices, this.estilo = EstiloTarifas.lista, this.titleKey = 'field.prices'}); // Recibe las tarifas y su estilo
  final List<PriceObservation> prices; // Tarifas
  final EstiloTarifas estilo; // Presentación
  final String titleKey; // Clave del título

  @override
  Widget build(BuildContext context) {
    final tv = context.tv; // Colores
    final text = Theme.of(context).textTheme; // Estilos
    final locale = Localizations.localeOf(context).toLanguageTag(); // Idioma para el formato
    final pizarra = estilo == EstiloTarifas.pizarra; // Si va en pizarra oscura
    const marfil = TvColors.bandMarfil; // Tinta de la pizarra
    final muted = pizarra ? const Color(0xFFC9D8D0) : tv.inkMuted; // Texto secundario (en la pizarra, el de tema oscuro)
    String who(String r) => switch (r) {
          'owner' => context.t('prices.by_owner'), // Lo dijo el negocio
          'official_source' => context.t('prices.by_official'), // Fuente oficial
          _ => context.t('prices.by_editor'), // Lo comprobó el equipo
        };
    String monto(PriceObservation p) => '${NumberFormat.simpleCurrency(locale: locale, name: p.currency).format(p.amount)}${p.unit != null ? ' ${p.unit}' : ''}'; // Precio con moneda y unidad
    Widget nota(PriceObservation p) => Text(context.t('prices.observed', {'date': DateFormat.yMMMd(locale).format(p.observedAt), 'who': who(p.reportedBy)}), style: TextStyle(color: muted, fontSize: 14)); // Fecha y fuente

    Widget fila(PriceObservation p) => switch (estilo) {
          EstiloTarifas.lista => Padding(
              padding: const EdgeInsets.symmetric(vertical: TvSpace.s1), // Separación
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('${p.label}: ${monto(p)}'), nota(p)]), // Concepto, precio y fuente
            ),
          EstiloTarifas.talones => Container(
              margin: const EdgeInsets.only(bottom: TvSpace.s2 + 2), // Separación entre talones
              padding: const EdgeInsets.fromLTRB(TvSpace.s4, TvSpace.s3, TvSpace.s4, TvSpace.s3), // Relleno
              decoration: BoxDecoration(
                color: tv.groundRaised, // Papel del talón
                borderRadius: BorderRadius.circular(TvSpace.radiusS), // Esquinas
                border: const Border(left: BorderSide(color: TvColors.oro, width: 6)), // Borde de corte, en oro
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
                children: [
                  Text(p.label, style: const TextStyle(fontWeight: FontWeight.w700)), // Concepto
                  Text(monto(p), style: text.headlineSmall), // Monto grande
                  nota(p), // Fecha y fuente
                ],
              ),
            ),
          EstiloTarifas.pizarra => Padding(
              padding: const EdgeInsets.symmetric(vertical: TvSpace.s2), // Separación
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end, // Puntos a la altura del texto
                    children: [
                      Flexible(child: Text(p.label, style: const TextStyle(color: marfil, fontWeight: FontWeight.w700))), // Oferta
                      const Expanded(child: Padding(padding: EdgeInsets.fromLTRB(8, 0, 8, 5), child: _Puntos())), // Puntos guía
                      Text(monto(p), style: const TextStyle(color: marfil, fontWeight: FontWeight.w800, fontSize: 18)), // Precio
                    ],
                  ),
                  nota(p), // Fecha y fuente
                ],
              ),
            ),
        }; // Una tarifa según el estilo

    final contenido = Column(
      crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
      children: [
        Semantics(header: true, child: Text(context.t(titleKey), style: text.titleLarge?.copyWith(color: pizarra ? marfil : null))), // Título
        const SizedBox(height: TvSpace.s2), // Espacio
        if (prices.isEmpty)
          Text(context.t('prices.none'), style: TextStyle(color: muted)) // Sin precios: no se inventan
        else
          for (final p in prices) fila(p), // Cada tarifa
      ],
    );
    if (!pizarra) return contenido; // Lista o talones: sin marco
    return Container(
      width: double.infinity, // Todo el ancho
      padding: const EdgeInsets.all(TvSpace.s4 + 4), // Relleno
      decoration: BoxDecoration(
        color: TvColors.onOro, // Pizarra oscura en los dos temas (#071C1B)
        borderRadius: BorderRadius.circular(TvSpace.radiusM), // Esquinas
        border: Border.all(color: TvColors.dark.groundRaised, width: 6), // Marco de la pizarra
      ),
      child: contenido, // Lo que ofrece
    );
  }
}

/// Línea de puntos entre la oferta y su precio, como en un menú escrito a mano.
class _Puntos extends StatelessWidget {
  const _Puntos(); // Constructor

  @override
  Widget build(BuildContext context) => CustomPaint(size: const Size(double.infinity, 2), painter: _PintorPuntos()); // Ocupa el espacio libre
}

class _PintorPuntos extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final punto = Paint()..color = const Color(0xFF7DB0A4); // Color de los puntos (borde de control del tema oscuro)
    for (var x = 1.0; x < size.width; x += 5) {
      canvas.drawCircle(Offset(x, size.height / 2), 1, punto); // Un punto cada 5 píxeles
    }
  }

  @override
  bool shouldRepaint(_PintorPuntos old) => false; // Nunca cambia
}
