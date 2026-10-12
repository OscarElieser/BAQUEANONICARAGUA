import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:intl/intl.dart'; // Formato de fechas

import '../i18n/strings.g.dart'; // Para saber si un texto es una clave traducible
import '../i18n/t.dart'; // Textos traducidos
import '../theme.dart'; // Colores y espaciados

/// Estado de un campo de la ficha.
sealed class FieldState {
  const FieldState(); // Constructor base
}

/// Comprobado en una fecha.
class Verified extends FieldState {
  const Verified(this.date); // Recibe la fecha
  final DateTime date; // Cuándo se comprobó
}

/// Ubicación aproximada.
class Approximate extends FieldState {
  const Approximate(); // Sin datos extra
}

/// Pendiente de comprobar.
class Pending extends FieldState {
  const Pending(); // Sin datos extra
}

/// Sin confirmar.
class Unconfirmed extends FieldState {
  const Unconfirmed(); // Sin datos extra
}

/// Hay que consultar al prestador.
class AskProvider extends FieldState {
  const AskProvider(); // Sin datos extra
}

/// Restringido o con aviso (la nota puede ser una clave de traducción o un texto de la base de datos).
class Restricted extends FieldState {
  const Restricted(this.note); // Recibe la nota
  final String note; // Texto o clave
}

/// Traduce si el texto es una clave conocida; si no, lo deja tal cual (por ejemplo, avisos escritos por el equipo).
String _label(BuildContext context, String s) => i18nStrings['es']!.containsKey(s) ? context.t(s) : s; // Clave o texto

/// "Qué está comprobado". El color acompaña al texto; nunca lo sustituye.
class EstadoVerificacion extends StatelessWidget {
  const EstadoVerificacion({super.key, required this.rows, this.onOpenSource}); // Recibe filas y acción de la fuente

  final List<(String, FieldState)> rows; // Campo (clave) y su estado
  final VoidCallback? onOpenSource; // Abre la fuente (null si aún no se cita)

  @override
  Widget build(BuildContext context) {
    final tv = context.tv; // Colores
    final locale = Localizations.localeOf(context).toLanguageTag(); // Idioma para las fechas

    (String, Color) describe(FieldState s) => switch (s) {
          Verified(:final date) => (context.t('ficha.checked_on', {'date': DateFormat.yMMMMd(locale).format(date)}), tv.statusVerified), // Comprobado
          Approximate() => (context.t('ficha.approximate'), tv.oroText), // Aproximada
          Pending() => (context.t('ficha.pending'), tv.oroText), // Pendiente
          Unconfirmed() => (context.t('ficha.unconfirmed'), tv.inkMuted), // Sin confirmar
          AskProvider() => (context.t('ficha.ask_provider'), tv.inkMuted), // Consultar
          Restricted(:final note) => (_label(context, note), tv.statusAlert), // Aviso
        }; // Texto y color de cada estado

    Widget row(String field, Widget trailing) => Container(
          decoration: BoxDecoration(border: Border(top: BorderSide(color: tv.line))), // Línea superior
          constraints: const BoxConstraints(minHeight: TvSpace.touchMin), // Alto mínimo táctil
          padding: const EdgeInsets.symmetric(vertical: 10), // Relleno vertical
          child: Row(
            children: [
              Expanded(child: Text(_label(context, field), style: const TextStyle(fontSize: 15))), // Nombre del campo
              const SizedBox(width: TvSpace.s3), // Espacio
              Flexible(child: trailing), // Estado
            ],
          ),
        ); // Fila de la tabla

    return Container(
      padding: const EdgeInsets.fromLTRB(TvSpace.s4, TvSpace.s4, TvSpace.s4, 6), // Relleno
      decoration: BoxDecoration(color: tv.groundRaised, borderRadius: BorderRadius.circular(TvSpace.radiusM)), // Tarjeta
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch, // Ocupa el ancho
        children: [
          Semantics(
            header: true, // Encabezado para lectores de pantalla
            child: Padding(
              padding: const EdgeInsets.only(bottom: TvSpace.s2), // Espacio inferior
              child: Text(context.t('ficha.verified_title'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)), // Título
            ),
          ),
          for (final (field, state) in rows)
            row(field, Builder(builder: (_) {
              final (label, color) = describe(state); // Texto y color del estado
              return Text(label, textAlign: TextAlign.end, style: TextStyle(fontSize: 15, color: color)); // Estado
            })),
          row(
            'ficha.source', // Fila de la fuente
            onOpenSource == null
                ? Text(context.t('ficha.source_pending'), textAlign: TextAlign.end, style: TextStyle(fontSize: 15, color: tv.oroText)) // Aún sin citar
                : Align(
                    alignment: Alignment.centerRight, // A la derecha
                    child: TextButton(onPressed: onOpenSource, child: Text(context.t('ficha.see_source'), style: TextStyle(color: tv.accent))), // Abre la fuente
                  ),
          ),
        ],
      ),
    );
  }
}
