import 'package:flutter/material.dart'; // Componentes visuales de Flutter

import '../data/repositories.dart'; // Mensajes de error claros
import '../theme.dart'; // Colores y espaciados

/// Cargando: indicador con descripción para lectores de pantalla.
class Cargando extends StatelessWidget {
  const Cargando({super.key}); // Constructor constante

  @override
  Widget build(BuildContext context) => const Center(
        child: Padding(
          padding: EdgeInsets.all(TvSpace.s8), // Margen
          child: CircularProgressIndicator(semanticsLabel: 'Cargando'), // Indicador accesible
        ),
      );
}

/// Error con explicación y botón para reintentar (nunca se oculta el fallo).
class ErrorConReintento extends StatelessWidget {
  const ErrorConReintento({super.key, required this.error, required this.onRetry}); // Recibe el error y la acción
  final Object error; // Error ocurrido
  final VoidCallback onRetry; // Qué hacer al reintentar

  @override
  Widget build(BuildContext context) {
    final tv = context.tv; // Colores
    final notConfigured = error is NotConfigured; // Si falta configuración (no es un fallo de la persona)
    return Padding(
      padding: const EdgeInsets.all(TvSpace.s6), // Margen
      child: Column(
        mainAxisSize: MainAxisSize.min, // Solo el alto necesario
        crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
        children: [
          Semantics(
            liveRegion: true, // Se anuncia al aparecer
            child: Text(dataErrorMessage(error), style: TextStyle(color: notConfigured ? tv.ink : tv.statusAlert)), // Mensaje claro
          ),
          if (!notConfigured) ...[
            const SizedBox(height: TvSpace.s3), // Espacio
            OutlinedButton(onPressed: onRetry, child: const Text('Reintentar')), // Vuelve a pedir los datos
          ],
        ],
      ),
    );
  }
}

/// Estado vacío: invita a una acción en vez de dejar la pantalla en blanco.
class Vacio extends StatelessWidget {
  const Vacio({super.key, required this.text}); // Recibe el texto
  final String text; // Qué decir

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(TvSpace.s6), // Margen
        child: Text(text, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: context.tv.inkMuted)), // Texto atenuado
      );
}
