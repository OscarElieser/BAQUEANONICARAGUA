import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Acceso a los proveedores de Riverpod

import '../../core/i18n/t.dart'; // Textos traducidos
import '../../core/theme.dart'; // Colores y espaciados del sistema de diseño
import 'auth_repository.dart'; // Lógica de autenticación

/// Las tres vistas del formulario de acceso.
enum _Mode { signIn, signUp, reset }

/// Pantalla para iniciar sesión, crear cuenta o recuperar la contraseña.
class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key}); // Constructor constante

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState(); // Crea el estado de la pantalla
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  final _form = GlobalKey<FormState>(); // Llave para validar el formulario
  final _name = TextEditingController(); // Texto del campo nombre
  final _email = TextEditingController(); // Texto del campo correo
  final _password = TextEditingController(); // Texto del campo contraseña
  _Mode _mode = _Mode.signIn; // Vista actual (empieza en iniciar sesión)
  bool _busy = false; // Si hay una operación en curso
  String? _error; // Mensaje de error visible
  String? _info; // Mensaje de confirmación visible

  @override
  void dispose() {
    _name.dispose(); // Libera el controlador del nombre
    _email.dispose(); // Libera el controlador del correo
    _password.dispose(); // Libera el controlador de la contraseña
    super.dispose(); // Libera el resto del estado
  }

  /// Ejecuta una acción mostrando progreso, errores y confirmación.
  Future<void> _run(Future<void> Function() action, {String? ok}) async {
    setState(() {
      _busy = true; // Bloquea los botones
      _error = null; // Limpia errores anteriores
      _info = null; // Limpia avisos anteriores
    });
    try {
      await action(); // Ejecuta la acción
      if (mounted && ok != null) setState(() => _info = ok); // Muestra la confirmación si la pantalla sigue abierta
    } on AuthFailure catch (e) {
      if (mounted) setState(() => _error = context.t(e.key)); // Muestra el error traducido
    } catch (_) {
      if (mounted) setState(() => _error = context.t('auth.err.generic')); // Error inesperado
    } finally {
      if (mounted) setState(() => _busy = false); // Libera los botones
    }
  }

  void _submit() {
    if (!(_form.currentState?.validate() ?? false)) return; // Si hay campos inválidos, no seguimos
    final repo = ref.read(authRepositoryProvider); // Repositorio de autenticación
    switch (_mode) {
      // Acción según la vista
      case _Mode.signIn:
        _run(() => repo.signIn(_email.text, _password.text)); // Inicia sesión
      case _Mode.signUp:
        _run(
          () => repo.signUp(_name.text, _email.text, _password.text), // Crea la cuenta
          ok: context.t('auth.created'), // Confirmación
        );
      case _Mode.reset:
        _run(
          () => repo.resetPassword(_email.text), // Envía el enlace de recuperación
          ok: context.t('auth.reset_sent'), // Confirmación sin revelar datos
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final tv = context.tv; // Colores del tema actual
    final text = Theme.of(context).textTheme; // Estilos de texto del tema
    final title = switch (_mode) {
      _Mode.signIn => context.t('auth.sign_in_title'), // Título al iniciar sesión
      _Mode.signUp => context.t('auth.sign_up_title'), // Título al crear cuenta
      _Mode.reset => context.t('auth.reset_title'), // Título al recuperar
    };

    return ListView(
      padding: const EdgeInsets.all(TvSpace.s6), // Margen alrededor del contenido
      children: [
        Text(title, style: text.displayMedium), // Título de la vista
        const SizedBox(height: TvSpace.s3), // Espacio
        Text(
          context.t('auth.intro'), // Para qué sirve la cuenta
          style: text.bodyMedium?.copyWith(color: tv.inkMuted), // Texto secundario
        ),
        const SizedBox(height: TvSpace.s6), // Espacio
        Form(
          key: _form, // Llave para validar
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch, // Campos a todo el ancho
            children: [
              if (_mode == _Mode.signUp) ...[
                TextFormField(
                  controller: _name, // Texto del nombre
                  decoration: InputDecoration(labelText: context.t('auth.name')), // Etiqueta visible
                  textCapitalization: TextCapitalization.words, // Mayúscula al inicio de cada palabra
                  autofillHints: const [AutofillHints.name], // Permite autocompletar el nombre
                  validator: (v) => (v ?? '').trim().isEmpty ? context.t('auth.name_required') : null, // Obligatorio
                ),
                const SizedBox(height: TvSpace.s4), // Espacio
              ],
              TextFormField(
                controller: _email, // Texto del correo
                decoration: InputDecoration(labelText: context.t('auth.email')), // Etiqueta visible
                keyboardType: TextInputType.emailAddress, // Teclado con @
                autofillHints: const [AutofillHints.email], // Permite autocompletar el correo
                validator: (v) => (v ?? '').contains('@') ? null : context.t('auth.email_invalid'), // Validación básica
              ),
              if (_mode != _Mode.reset) ...[
                const SizedBox(height: TvSpace.s4), // Espacio
                TextFormField(
                  controller: _password, // Texto de la contraseña
                  decoration: InputDecoration(
                    labelText: context.t('auth.password'), // Etiqueta visible
                    helperText: _mode == _Mode.signUp ? context.t('auth.password_hint') : null, // Ayuda al crear cuenta
                  ),
                  obscureText: true, // Oculta los caracteres
                  autofillHints: [_mode == _Mode.signUp ? AutofillHints.newPassword : AutofillHints.password], // Gestor de contraseñas
                  validator: (v) {
                    final value = v ?? ''; // Contraseña escrita
                    if (value.isEmpty) return context.t('auth.password_required'); // Obligatoria
                    if (_mode == _Mode.signUp && value.length < 8) return context.t('auth.password_hint'); // Mínimo al crear cuenta
                    return null; // Es válida
                  },
                ),
              ],
              const SizedBox(height: TvSpace.s4), // Espacio
              if (_error != null)
                Text(_error!, style: TextStyle(color: tv.statusAlert)), // Error visible
              if (_info != null)
                Text(_info!, style: TextStyle(color: tv.statusVerified)), // Confirmación visible
              const SizedBox(height: TvSpace.s4), // Espacio
              FilledButton(
                onPressed: _busy ? null : _submit, // Desactivado mientras trabaja
                child: Text(_busy
                    ? context.t('auth.processing') // Texto mientras trabaja
                    : switch (_mode) {
                        _Mode.signIn => context.t('session.sign_in'), // Acción de entrar
                        _Mode.signUp => context.t('auth.create'), // Acción de crear cuenta
                        _Mode.reset => context.t('auth.send_link'), // Acción de recuperar
                      }),
              ),
            ],
          ),
        ),
        const SizedBox(height: TvSpace.s3), // Espacio
        if (_mode == _Mode.signIn)
          TextButton(
            onPressed: () => setState(() => _mode = _Mode.reset), // Cambia a recuperar contraseña
            child: Text(context.t('auth.forgot')), // Texto del enlace
          ),
        TextButton(
          onPressed: () => setState(() {
            _mode = _mode == _Mode.signIn ? _Mode.signUp : _Mode.signIn; // Alterna entre entrar y crear cuenta
            _error = null; // Limpia errores
            _info = null; // Limpia avisos
          }),
          child: Text(_mode == _Mode.signIn ? context.t('auth.create_new') : context.t('auth.have_account')), // Texto según la vista
        ),
        if (_mode != _Mode.reset) ...[
          const Divider(height: TvSpace.s8), // Separador
          OutlinedButton.icon(
            onPressed: _busy ? null : () => _run(() => ref.read(authRepositoryProvider).signInWithGoogle()), // Entra con Google
            icon: const Icon(Icons.account_circle_outlined), // Ícono genérico de cuenta
            label: Text(context.t('auth.google')), // Texto del botón
          ),
          const SizedBox(height: TvSpace.s2), // Espacio
          Text(
            context.t('auth.terms_note'), // Aviso legal honesto
            style: text.bodySmall, // Texto pequeño
          ),
        ],
      ],
    );
  }
}
