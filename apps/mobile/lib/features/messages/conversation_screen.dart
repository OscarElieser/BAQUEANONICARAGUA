import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod

import '../../core/data/models.dart'; // Datos de la mensajería
import '../../core/data/repositories.dart'; // Acceso a la mensajería
import '../../core/i18n/t.dart'; // Idioma actual
import '../../core/theme.dart'; // Colores y espaciados
import '../../core/widgets/estados.dart'; // Cargando, error y vacío

/// Mensajes de una conversación y el perfil propio (para saber de qué lado va cada burbuja).
final conversationProvider = FutureProvider.autoDispose.family<(String?, List<Message>), String>((ref, id) async {
  final repo = ref.watch(messagingRepositoryProvider); // Repositorio
  final me = await repo.myProfileId(); // Perfil propio
  final messages = await repo.messages(id); // Mensajes (y marca como leída)
  return (me, messages); // Ambos datos
});

/// Conversación con un negocio. No es cifrado de extremo a extremo y no se dice que lo sea.
class ConversationScreen extends ConsumerStatefulWidget {
  const ConversationScreen({super.key, required this.conversationId, required this.title}); // Recibe la conversación
  final String conversationId; // Identificador
  final String title; // Con quién se habla

  @override
  ConsumerState<ConversationScreen> createState() => _ConversationScreenState(); // Crea el estado
}

class _ConversationScreenState extends ConsumerState<ConversationScreen> {
  final _controller = TextEditingController(); // Texto del mensaje
  bool _sending = false; // Si se está enviando
  String? _error; // Error visible

  @override
  void dispose() {
    _controller.dispose(); // Libera el controlador
    super.dispose(); // Libera el resto
  }

  Future<void> _send() async {
    final body = _controller.text.trim(); // Mensaje sin espacios sobrantes
    if (body.isEmpty) return; // Nada que enviar
    setState(() {
      _sending = true; // Bloquea el botón
      _error = null; // Limpia errores
    });
    try {
      await ref.read(messagingRepositoryProvider).send(widget.conversationId, body); // Envía
      _controller.clear(); // Limpia el campo
      ref.invalidate(conversationProvider(widget.conversationId)); // Recarga los mensajes
    } catch (e) {
      if (mounted) setState(() => _error = dataErrorMessage(e, context.langCode)); // Muestra el error
    } finally {
      if (mounted) setState(() => _sending = false); // Libera el botón
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = ref.watch(conversationProvider(widget.conversationId)); // Mensajes (o cargando)
    final tv = context.tv; // Colores
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)), // Con quién se habla
      body: Column(
        children: [
          Expanded(
            child: data.when(
              loading: () => const Cargando(), // Mientras carga
              error: (e, _) => ErrorConReintento(error: e, onRetry: () => ref.invalidate(conversationProvider(widget.conversationId))), // Error claro
              data: (result) {
                final (me, messages) = result; // Perfil propio y mensajes
                if (messages.isEmpty) return const Vacio(text: 'Todavía no hay mensajes en esta conversación.'); // Conversación vacía
                return ListView.builder(
                  reverse: true, // Lo más reciente abajo, junto al campo de escribir
                  padding: const EdgeInsets.all(TvSpace.s4), // Márgenes
                  itemCount: messages.length, // Cantidad
                  itemBuilder: (_, i) {
                    final m = messages[messages.length - 1 - i]; // Recorre desde el más reciente
                    final mine = m.senderId == me; // Si lo envié yo
                    return Align(
                      alignment: mine ? Alignment.centerRight : Alignment.centerLeft, // Propios a la derecha
                      child: Semantics(
                        label: mine ? 'Tú' : widget.title, // Quién lo dijo, para lectores de pantalla
                        child: Container(
                          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8), // Máximo 80 % del ancho
                          margin: const EdgeInsets.symmetric(vertical: 4), // Separación entre burbujas
                          padding: const EdgeInsets.symmetric(horizontal: TvSpace.s4, vertical: TvSpace.s2), // Relleno
                          decoration: BoxDecoration(
                            color: mine ? TvColors.oro : tv.groundRaised, // Oro para los propios
                            borderRadius: BorderRadius.circular(TvSpace.radiusM), // Esquinas redondeadas
                          ),
                          child: m.body == null
                              ? Text('Mensaje eliminado', style: TextStyle(color: tv.inkMuted, fontStyle: FontStyle.italic)) // Conserva el lugar sin contenido
                              : Text(m.body!, style: TextStyle(color: mine ? TvColors.onOro : tv.ink)), // Texto
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: TvSpace.s4), // Margen
              child: Semantics(liveRegion: true, child: Text(_error!, style: TextStyle(color: tv.statusAlert))), // Error visible
            ),
          SafeArea(
            top: false, // Solo el borde inferior
            child: Padding(
              padding: const EdgeInsets.all(TvSpace.s3), // Margen
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller, // Texto
                      minLines: 1, // Empieza en una línea
                      maxLines: 4, // Crece hasta cuatro
                      maxLength: 8000, // Límite de la base de datos
                      decoration: const InputDecoration(labelText: 'Escribe un mensaje', counterText: ''), // Etiqueta accesible
                    ),
                  ),
                  const SizedBox(width: TvSpace.s2), // Espacio
                  IconButton.filled(
                    onPressed: _sending ? null : _send, // Envía
                    tooltip: 'Enviar', // Nombre accesible
                    icon: const Icon(Icons.send), // Icono
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
