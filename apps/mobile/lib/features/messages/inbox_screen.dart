import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod
import 'package:intl/intl.dart'; // Formato de fechas

import '../../core/data/models.dart'; // Datos de la mensajería
import '../../core/data/repositories.dart'; // Acceso a la mensajería
import '../../core/theme.dart'; // Colores y espaciados
import '../../core/widgets/estados.dart'; // Cargando, error y vacío
import 'conversation_screen.dart'; // Conversación

/// Conversaciones de quien tiene la sesión, con no leídos.
final inboxProvider = FutureProvider.autoDispose<List<Thread>>((ref) => ref.watch(messagingRepositoryProvider).inbox()); // Se recarga al volver a abrir

/// Bandeja de mensajes con negocios.
class InboxScreen extends ConsumerWidget {
  const InboxScreen({super.key}); // Constructor constante

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final inbox = ref.watch(inboxProvider); // Conversaciones (o cargando)
    final tv = context.tv; // Colores
    final locale = Localizations.localeOf(context).toLanguageTag(); // Idioma para las fechas
    return Scaffold(
      appBar: AppBar(title: const Text('Mensajes')), // Barra superior
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(inboxProvider.future), // Deslizar hacia abajo recarga
        child: inbox.when(
          loading: () => const Cargando(), // Mientras carga
          error: (e, _) => ListView(children: [ErrorConReintento(error: e, onRetry: () => ref.invalidate(inboxProvider))]), // Error claro (desplazable para recargar)
          data: (threads) => threads.isEmpty
              ? ListView(children: const [Vacio(text: 'Aún no tienes conversaciones. Escribe a un negocio desde su ficha.')]) // Sin conversaciones
              : ListView.separated(
                  itemCount: threads.length, // Cantidad
                  separatorBuilder: (_, __) => const Divider(height: 1), // Línea entre filas
                  itemBuilder: (_, i) {
                    final t = threads[i]; // Conversación
                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: TvSpace.s1), // Área táctil
                      title: Text(t.businessName ?? 'Conversación', style: const TextStyle(fontWeight: FontWeight.w700)), // Con quién
                      subtitle: Text(t.lastMessage ?? '', maxLines: 1, overflow: TextOverflow.ellipsis), // Último mensaje
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center, // Centrado vertical
                        crossAxisAlignment: CrossAxisAlignment.end, // A la derecha
                        children: [
                          if (t.lastMessageAt != null) Text(DateFormat.MMMd(locale).format(t.lastMessageAt!.toLocal()), style: TextStyle(color: tv.inkMuted, fontSize: 13)), // Fecha
                          if (t.unread > 0)
                            Semantics(
                              label: '${t.unread} sin leer', // Para lectores de pantalla
                              child: Container(
                                margin: const EdgeInsets.only(top: 4), // Separación
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2), // Relleno
                                decoration: BoxDecoration(color: TvColors.oro, borderRadius: BorderRadius.circular(999)), // Píldora dorada
                                child: Text('${t.unread}', style: const TextStyle(color: TvColors.onOro, fontWeight: FontWeight.w700)), // Cantidad
                              ),
                            ),
                        ],
                      ),
                      onTap: () async {
                        await Navigator.of(context).push(MaterialPageRoute(builder: (_) => ConversationScreen(conversationId: t.conversationId, title: t.businessName ?? 'Conversación'))); // Abre la conversación
                        ref.invalidate(inboxProvider); // Al volver, actualiza los no leídos
                      },
                    );
                  },
                ),
        ),
      ),
    );
  }
}
