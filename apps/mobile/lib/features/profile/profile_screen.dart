import 'package:firebase_auth/firebase_auth.dart'; // Tipo User de Firebase
import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Acceso a los proveedores de Riverpod

import '../../core/i18n/t.dart'; // Textos traducidos
import '../../core/theme.dart'; // Colores y espaciados del sistema de diseño
import '../auth/auth_repository.dart'; // Sesión y acciones de autenticación
import '../auth/sign_in_screen.dart'; // Pantalla de acceso
import '../legal/legal_screen.dart'; // Información y legal
import '../messages/inbox_screen.dart'; // Bandeja de mensajes

/// Pestaña "Perfil": muestra el acceso si no hay sesión, o la cuenta con "Cerrar sesión".
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key}); // Constructor constante

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authStateProvider); // Escucha la sesión en tiempo real
    return session.when(
      loading: () => const Center(child: CircularProgressIndicator()), // Mientras comprueba la sesión
      error: (_, __) => const Center(child: Text('No se pudo comprobar la sesión.')), // Error al leer la sesión
      data: (user) => user == null
          ? const Column(
              children: [
                Expanded(child: SignInScreen()), // Sin sesión: pantalla de acceso
                LegalLink(), // Información y legal, accesible sin cuenta
              ],
            )
          : _Account(user: user), // Con sesión: cuenta
    );
  }
}

/// Vista de la cuenta con sesión iniciada.
class _Account extends ConsumerStatefulWidget {
  const _Account({required this.user}); // Recibe el usuario con sesión
  final User user; // Usuario de Firebase con la sesión abierta

  @override
  ConsumerState<_Account> createState() => _AccountState(); // Crea el estado
}

class _AccountState extends ConsumerState<_Account> {
  bool _busy = false; // Si hay una operación en curso
  String? _message; // Mensaje visible (error o confirmación)

  Future<void> _do(Future<void> Function() action, String ok) async {
    setState(() {
      _busy = true; // Bloquea botones
      _message = null; // Limpia mensajes anteriores
    });
    try {
      await action(); // Ejecuta la acción
      if (mounted) setState(() => _message = ok); // Confirma si la pantalla sigue abierta
    } on AuthFailure catch (e) {
      if (mounted) setState(() => _message = e.message); // Muestra el error traducido
    } finally {
      if (mounted) setState(() => _busy = false); // Libera los botones
    }
  }

  @override
  Widget build(BuildContext context) {
    final tv = context.tv; // Colores del tema
    final text = Theme.of(context).textTheme; // Estilos de texto
    final repo = ref.read(authRepositoryProvider); // Repositorio de autenticación
    final String name = widget.user.displayName ?? widget.user.email ?? 'Mi cuenta'; // Nombre visible
    final bool verified = widget.user.emailVerified; // Si el correo está verificado

    return ListView(
      padding: const EdgeInsets.all(TvSpace.s6), // Margen
      children: [
        Text('Hola, $name', style: text.displayMedium), // Saludo
        const SizedBox(height: TvSpace.s2), // Espacio
        Text(widget.user.email ?? '', style: text.bodyMedium?.copyWith(color: tv.inkMuted)), // Correo
        const SizedBox(height: TvSpace.s6), // Espacio
        if (!verified) ...[
          Text('Tu correo no está verificado.', style: TextStyle(color: tv.oroText)), // Aviso
          const SizedBox(height: TvSpace.s2), // Espacio
          OutlinedButton(
            onPressed: _busy ? null : () => _do(repo.resendVerification, 'Te enviamos de nuevo el correo de verificación.'), // Reenvía
            child: const Text('Reenviar correo'), // Texto del botón
          ),
          const SizedBox(height: TvSpace.s6), // Espacio
        ],
        FilledButton.icon(
          onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const InboxScreen())), // Abre la bandeja
          icon: const Icon(Icons.chat_bubble_outline), // Icono de mensajes
          label: Text(context.t('profile.messages')), // Texto
        ),
        const SizedBox(height: TvSpace.s3), // Espacio
        OutlinedButton(
          style: OutlinedButton.styleFrom(
            foregroundColor: tv.statusAlert, // Texto en color de alerta
            side: BorderSide(color: tv.statusAlert, width: 1.5), // Borde en color de alerta
          ),
          onPressed: _busy ? null : () => _do(repo.signOut, 'Sesión cerrada.'), // Cierra la sesión
          child: Text(_busy ? context.t('session.signing_out') : context.t('session.sign_out')), // Texto según el estado
        ),
        if (_message != null) ...[
          const SizedBox(height: TvSpace.s3), // Espacio
          Text(_message!), // Mensaje visible
        ],
        const SizedBox(height: TvSpace.s8), // Espacio antes del enlace
        const LegalLink(), // Información y legal
      ],
    );
  }
}

/// Enlace a "Información y legal" (Sobre nosotros, Privacidad, Términos…).
class LegalLink extends StatelessWidget {
  const LegalLink({super.key}); // Constructor constante

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false, // Solo protege el borde inferior
      child: TextButton.icon(
        onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LegalIndexScreen())), // Abre la lista
        icon: const Icon(Icons.info_outline), // Icono de información
        label: Text(context.t('profile.legal')), // Texto del enlace
      ),
    );
  }
}
