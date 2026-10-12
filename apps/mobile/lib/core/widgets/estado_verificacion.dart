import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../theme.dart';

sealed class FieldState {
  const FieldState();
}

class Verified extends FieldState {
  const Verified(this.date);
  final DateTime date;
}

class Approximate extends FieldState {
  const Approximate();
}

class Pending extends FieldState {
  const Pending();
}

class Unconfirmed extends FieldState {
  const Unconfirmed();
}

class AskProvider extends FieldState {
  const AskProvider();
}

class Restricted extends FieldState {
  const Restricted(this.note);
  final String note;
}

/// "Qué está comprobado". El color acompaña al texto; nunca lo sustituye.
class EstadoVerificacion extends StatelessWidget {
  const EstadoVerificacion({super.key, required this.rows, this.onOpenSource});

  final List<(String, FieldState)> rows;
  final VoidCallback? onOpenSource;

  @override
  Widget build(BuildContext context) {
    final tv = context.tv;
    final locale = Localizations.localeOf(context).toLanguageTag();

    (String, Color) describe(FieldState s) => switch (s) {
          Verified(:final date) => ('Comprobado el ${DateFormat.yMMMMd(locale).format(date)}', tv.statusVerified),
          Approximate() => ('Aproximada', tv.oroText),
          Pending() => ('Pendiente', tv.oroText),
          Unconfirmed() => ('Sin confirmar', tv.inkMuted),
          AskProvider() => ('Consulta al prestador', tv.inkMuted),
          Restricted(:final note) => (note, tv.statusAlert),
        };

    Widget row(String field, Widget trailing) => Container(
          decoration: BoxDecoration(border: Border(top: BorderSide(color: tv.line))),
          constraints: const BoxConstraints(minHeight: TvSpace.touchMin),
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            children: [
              Expanded(child: Text(field, style: const TextStyle(fontSize: 15))),
              const SizedBox(width: TvSpace.s3),
              Flexible(child: trailing),
            ],
          ),
        );

    return Container(
      padding: const EdgeInsets.fromLTRB(TvSpace.s4, TvSpace.s4, TvSpace.s4, 6),
      decoration: BoxDecoration(color: tv.groundRaised, borderRadius: BorderRadius.circular(TvSpace.radiusM)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            header: true,
            child: const Padding(
              padding: EdgeInsets.only(bottom: TvSpace.s2),
              child: Text('Qué está comprobado', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            ),
          ),
          for (final (field, state) in rows)
            row(field, Builder(builder: (_) {
              final (label, color) = describe(state);
              return Text(label, textAlign: TextAlign.end, style: TextStyle(fontSize: 15, color: color));
            })),
          row(
            'Fuente',
            onOpenSource == null
                ? Text('Pendiente de citar', textAlign: TextAlign.end, style: TextStyle(fontSize: 15, color: tv.oroText))
                : Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(onPressed: onOpenSource, child: Text('Ver fuente', style: TextStyle(color: tv.accent))),
                  ),
          ),
        ],
      ),
    );
  }
}
