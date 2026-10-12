import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod
import 'package:url_launcher/url_launcher.dart'; // Abrir WhatsApp, llamadas y sitios

import '../../core/data/models.dart'; // Datos del catálogo
import '../../core/data/repositories.dart'; // Acceso al catálogo y mensajería
import '../../core/data/verification.dart'; // Reglas de verificación y contactos
import '../../core/i18n/t.dart'; // Idioma actual
import '../../core/theme.dart'; // Colores y espaciados
import '../../core/widgets/estado_verificacion.dart'; // "Qué está comprobado"
import '../../core/widgets/estados.dart'; // Cargando, error y vacío
import '../../core/widgets/franja_tejida.dart'; // Franja tejida para fichas de personas
import '../auth/auth_repository.dart'; // Sesión
import '../messages/conversation_screen.dart'; // Conversación abierta tras escribir
import 'ficha_widgets.dart'; // Horarios y tarifas

/// Ficha de negocio por su dirección.
final businessProvider = FutureProvider.family<BusinessDetail?, String>((ref, slug) => ref.watch(catalogRepositoryProvider).business(slug)); // Pide la ficha

/// Ficha de negocio: verificación, contactos directos y mensaje por la plataforma.
class BusinessScreen extends ConsumerWidget {
  const BusinessScreen({super.key, required this.slug, required this.name}); // Recibe dirección y nombre
  final String slug; // Dirección
  final String name; // Nombre (para la barra mientras carga)

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(businessProvider(slug)); // Ficha (o cargando)
    final text = Theme.of(context).textTheme; // Estilos
    final tv = context.tv; // Colores
    return Scaffold(
      appBar: AppBar(title: Text(name)), // Barra con el nombre
      body: data.when(
        loading: () => const Cargando(), // Mientras carga
        error: (e, _) => ErrorConReintento(error: e, onRetry: () => ref.invalidate(businessProvider(slug))), // Error claro
        data: (b) => b == null
            ? const Vacio(text: 'Este negocio no está publicado todavía.') // No existe
            : ListView(
                padding: const EdgeInsets.only(bottom: TvSpace.s12), // Espacio al final
                children: [
                  const FranjaTejida(height: 14), // Franja tejida: aquí hay una persona detrás
                  Padding(
                    padding: const EdgeInsets.fromLTRB(TvSpace.s6, TvSpace.s6, TvSpace.s6, 0), // Márgenes
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch, // Ocupa el ancho
                      children: [
                        Text(b.name, style: text.displayMedium), // Nombre
                        if (b.isSponsored)
                          Padding(padding: const EdgeInsets.only(top: TvSpace.s2), child: Text('Patrocinado', style: TextStyle(color: tv.oroText, fontWeight: FontWeight.w700))), // Siempre se marca
                        if (b.summary != null) Padding(padding: const EdgeInsets.only(top: TvSpace.s2), child: Text(b.summary!, style: text.bodyLarge?.copyWith(color: tv.inkMuted))), // Resumen
                        const SizedBox(height: TvSpace.s6), // Espacio
                        EstadoVerificacion(rows: businessRows(b)), // Identidad, ubicación, horarios y tarifas
                        const SizedBox(height: TvSpace.s6), // Espacio
                        Semantics(header: true, child: Text('Contacto directo', style: text.titleLarge)), // Título
                        const SizedBox(height: TvSpace.s2), // Espacio
                        if (b.contacts.isEmpty)
                          Text('Este negocio aún no publicó contactos. Puedes escribirle por la plataforma.', style: TextStyle(color: tv.inkMuted)) // Sin contactos
                        else
                          Wrap(
                            spacing: TvSpace.s2, // Espacio horizontal
                            runSpacing: TvSpace.s2, // Espacio vertical
                            children: [
                              for (final c in b.contacts)
                                if (contactUri(c) case final uri?)
                                  OutlinedButton(
                                    onPressed: () => launchUrl(uri, mode: LaunchMode.externalApplication), // Abre WhatsApp, llamada, correo o sitio
                                    child: Text(contactLabel(c.kind)), // Tipo de contacto
                                  ),
                            ],
                          ),
                        const SizedBox(height: TvSpace.s4), // Espacio
                        _EscribirNegocio(businessId: b.id, businessName: b.name), // Mensaje por la plataforma
                        const SizedBox(height: TvSpace.s6), // Espacio
                        Horarios(hours: b.hours), // Horarios
                        const SizedBox(height: TvSpace.s6), // Espacio
                        Tarifas(prices: b.prices), // Tarifas
                        if (b.data['description_md'] != null) ...[
                          const SizedBox(height: TvSpace.s6), // Espacio
                          Semantics(header: true, child: Text('Sobre el negocio', style: text.titleLarge)), // Título
                          const SizedBox(height: TvSpace.s2), // Espacio
                          Text(b.data['description_md'] as String, style: text.bodyLarge), // Descripción
                        ],
                      ],
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

/// Botón y formulario para escribir al negocio por la plataforma (requiere sesión).
class _EscribirNegocio extends ConsumerStatefulWidget {
  const _EscribirNegocio({required this.businessId, required this.businessName}); // Recibe el negocio
  final String businessId; // Identificador
  final String businessName; // Nombre

  @override
  ConsumerState<_EscribirNegocio> createState() => _EscribirNegocioState(); // Crea el estado
}

class _EscribirNegocioState extends ConsumerState<_EscribirNegocio> {
  final _controller = TextEditingController(); // Texto del mensaje
  bool _open = false; // Si el formulario está abierto
  bool _sending = false; // Si se está enviando
  String? _error; // Error visible

  @override
  void dispose() {
    _controller.dispose(); // Libera el controlador
    super.dispose(); // Libera el resto
  }

  Future<void> _send() async {
    final body = _controller.text.trim(); // Mensaje sin espacios sobrantes
    if (body.length < 2) {
      // Mensaje vacío o demasiado corto
      setState(() => _error = 'Escribe tu mensaje.'); // Lo explica
      return; // No envía
    }
    setState(() {
      _sending = true; // Bloquea el botón
      _error = null; // Limpia errores
    });
    try {
      final id = await ref.read(messagingRepositoryProvider).startWithBusiness(widget.businessId, body); // Crea o reanuda la conversación
      if (!mounted) return; // La pantalla se cerró
      _controller.clear(); // Limpia el campo
      setState(() => _open = false); // Cierra el formulario
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => ConversationScreen(conversationId: id, title: widget.businessName))); // Abre la conversación
    } catch (e) {
      if (mounted) setState(() => _error = dataErrorMessage(e, context.langCode)); // Muestra el error
    } finally {
      if (mounted) setState(() => _sending = false); // Libera el botón
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authStateProvider).valueOrNull; // Sesión actual
    if (user == null) {
      // Sin sesión: explica qué hacer
      return Text('Inicia sesión en la pestaña Perfil para escribir por la plataforma.', style: TextStyle(color: context.tv.inkMuted));
    }
    if (!_open) {
      return OutlinedButton.icon(
        onPressed: () => setState(() => _open = true), // Abre el formulario
        icon: const Icon(Icons.chat_bubble_outline), // Icono de mensaje
        label: const Text('Escribir por la plataforma'), // Texto
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch, // Ocupa el ancho
      children: [
        TextField(
          controller: _controller, // Texto
          minLines: 3, // Al menos tres líneas
          maxLines: 6, // Hasta seis líneas visibles
          maxLength: 8000, // Límite de la base de datos
          decoration: InputDecoration(labelText: 'Mensaje para ${widget.businessName}'), // Etiqueta accesible
        ),
        if (_error != null) Semantics(liveRegion: true, child: Text(_error!, style: TextStyle(color: context.tv.statusAlert))), // Error visible
        const SizedBox(height: TvSpace.s2), // Espacio
        FilledButton(onPressed: _sending ? null : _send, child: Text(_sending ? 'Enviando…' : 'Enviar mensaje')), // Envía
      ],
    );
  }
}
