import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Acceso a los proveedores de Riverpod

import '../../core/data/fotos.dart'; // Foto real de la cabecera
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
    final text = Theme.of(context).textTheme; // Estilos de texto del tema
    final title = switch (_mode) {
      _Mode.signIn => context.t('auth.sign_in_title'), // Título al iniciar sesión
      _Mode.signUp => context.t('auth.sign_up_title'), // Título al crear cuenta
      _Mode.reset => context.t('auth.reset_title'), // Título al recuperar
    };

    const marfil = TvColors.bandMarfil; // Tinta clara sobre la noche
    const tenue = Color(0xFFC9D8D0); // Texto secundario (11.8:1 sobre azul nocturno)
    final borde = marfil.withValues(alpha: 0.16); // Borde fino del vidrio
    InputDecoration campo(String etiqueta, IconData icono, {String? ayuda}) => InputDecoration(
          labelText: etiqueta, // Etiqueta siempre visible
          helperText: ayuda, // Ayuda opcional
          prefixIcon: Icon(icono, color: tenue, size: 20), // Icono a la izquierda
          filled: true, // Fondo de vidrio
          fillColor: marfil.withValues(alpha: 0.06), // Casi transparente
          labelStyle: const TextStyle(color: tenue), // Etiqueta legible
          helperStyle: const TextStyle(color: tenue), // Ayuda legible
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: marfil.withValues(alpha: 0.18))), // Borde en reposo
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: TvColors.marcaTurquesaClaro, width: 1.5)), // Borde activo
          errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFF5B49A))), // Borde con error
          focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFF5B49A), width: 1.5)), // Error activo
          errorStyle: const TextStyle(color: Color(0xFFF5B49A)), // Texto de error legible sobre oscuro
        ); // Estilo común de los campos

    return Container(
      decoration: const BoxDecoration(color: TvColors.marcaNocturno), // Noche de fondo
      child: Stack(
        children: [
          const Positioned.fill(child: ExcludeSemantics(child: CustomPaint(painter: _ArcoDeLuz()))), // Arco de luz con los colores de la marca (decoración)
          ListView(
            padding: const EdgeInsets.fromLTRB(TvSpace.s4, TvSpace.s8, TvSpace.s4, TvSpace.s8), // Márgenes
            children: [
              const _CabeceraFoto(), // Foto real con la frase de bienvenida
              const SizedBox(height: TvSpace.s6), // Espacio antes del orbe
              ExcludeSemantics(
                child: TweenAnimationBuilder<double>(
                  tween: Tween(begin: MediaQuery.of(context).disableAnimations ? 1 : 0, end: 1), // Sin animación si así se pidió
                  duration: const Duration(milliseconds: 1100), // Sube y se asienta
                  curve: Curves.easeOutBack, // Rebote leve
                  builder: (context, v, hijo) => Opacity(opacity: v.clamp(0.0, 1.0).toDouble(), child: Transform.translate(offset: Offset(0, 40 * (1 - v)), child: hijo)), // Aparece desde abajo
                  child: Center(
                    child: Container(
                      width: 64, // Tamaño del orbe
                      height: 64, // Tamaño del orbe
                      margin: const EdgeInsets.only(bottom: TvSpace.s4), // Separación de la tarjeta
                      decoration: BoxDecoration(
                        shape: BoxShape.circle, // Esfera
                        gradient: RadialGradient(center: const Alignment(-0.35, -0.45), colors: [marfil, TvColors.marcaNaranja, Color.lerp(TvColors.marcaNaranja, TvColors.marcaTurquesa, 0.6)!, TvColors.marcaProfundo], stops: const [0, 0.35, 0.7, 1]), // Brillo, naranja y sombra
                        boxShadow: [BoxShadow(color: TvColors.marcaNaranja.withValues(alpha: 0.45), blurRadius: 40), BoxShadow(color: TvColors.marcaTurquesaClaro.withValues(alpha: 0.25), blurRadius: 80)], // Resplandor
                      ),
                    ),
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.all(TvSpace.s6), // Relleno de la tarjeta
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(28), // Esquinas suaves
                  border: Border.all(color: borde), // Borde de vidrio
                  gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [marfil.withValues(alpha: 0.10), TvColors.marcaNocturno.withValues(alpha: 0.75)]), // Brillo arriba
                ),
                child: Theme(
                  data: Theme.of(context).copyWith(textTheme: Theme.of(context).textTheme.apply(bodyColor: marfil, displayColor: marfil)), // Texto claro dentro de la tarjeta
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch, // A todo el ancho
                    children: [
                      Text(context.t('auth.intro'), style: text.bodyMedium?.copyWith(color: tenue)), // Para qué sirve la cuenta
                      const SizedBox(height: TvSpace.s4), // Espacio
                      if (_mode != _Mode.reset)
                        Align(
                          alignment: Alignment.centerLeft, // Pestañas a la izquierda
                          child: SegmentedButton<_Mode>(
                            segments: [
                              ButtonSegment(value: _Mode.signIn, label: Text(context.t('session.sign_in'))), // Iniciar sesión
                              ButtonSegment(value: _Mode.signUp, label: Text(context.t('auth.create'))), // Crear cuenta
                            ],
                            selected: {_mode}, // Vista actual
                            showSelectedIcon: false, // Sin marca de verificación
                            style: SegmentedButton.styleFrom(foregroundColor: tenue, selectedForegroundColor: marfil, selectedBackgroundColor: marfil.withValues(alpha: 0.14), side: BorderSide(color: borde)), // Pestañas de vidrio
                            onSelectionChanged: (v) => setState(() {
                              _mode = v.first; // Cambia de vista
                              _error = null; // Limpia errores
                              _info = null; // Limpia avisos
                            }),
                          ),
                        ),
                      const SizedBox(height: TvSpace.s4), // Espacio
                      Semantics(header: true, child: Text(title, style: text.headlineSmall?.copyWith(color: marfil, fontWeight: FontWeight.w700))), // Título de la vista
                      const SizedBox(height: TvSpace.s4), // Espacio
                      Form(
                        key: _form, // Llave para validar
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch, // Campos a todo el ancho
                          children: [
                            if (_mode == _Mode.signUp) ...[
                              TextFormField(
                                controller: _name, // Texto del nombre
                                style: const TextStyle(color: marfil), // Texto escrito, claro
                                decoration: campo(context.t('auth.name'), Icons.person_outline), // Etiqueta e icono
                                textCapitalization: TextCapitalization.words, // Mayúscula al inicio de cada palabra
                                autofillHints: const [AutofillHints.name], // Permite autocompletar el nombre
                                validator: (v) => (v ?? '').trim().isEmpty ? context.t('auth.name_required') : null, // Obligatorio
                              ),
                              const SizedBox(height: TvSpace.s4), // Espacio
                            ],
                            TextFormField(
                              controller: _email, // Texto del correo
                              style: const TextStyle(color: marfil), // Texto escrito, claro
                              decoration: campo(context.t('auth.email'), Icons.mail_outline), // Etiqueta e icono
                              keyboardType: TextInputType.emailAddress, // Teclado con @
                              autofillHints: const [AutofillHints.email], // Permite autocompletar el correo
                              validator: (v) => (v ?? '').contains('@') ? null : context.t('auth.email_invalid'), // Validación básica
                            ),
                            if (_mode != _Mode.reset) ...[
                              const SizedBox(height: TvSpace.s4), // Espacio
                              TextFormField(
                                controller: _password, // Texto de la contraseña
                                style: const TextStyle(color: marfil), // Texto escrito, claro
                                decoration: campo(context.t('auth.password'), Icons.lock_outline, ayuda: _mode == _Mode.signUp ? context.t('auth.password_hint') : null), // Etiqueta, icono y ayuda
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
                            const SizedBox(height: TvSpace.s3), // Espacio
                            if (_error != null) Text(_error!, style: const TextStyle(color: Color(0xFFF5B49A))), // Error visible
                            if (_info != null) Text(_info!, style: const TextStyle(color: Color(0xFF9FD9C2))), // Confirmación visible
                            const SizedBox(height: TvSpace.s3), // Espacio
                            FilledButton(
                              style: FilledButton.styleFrom(backgroundColor: marfil, foregroundColor: TvColors.marcaNocturno, minimumSize: const Size.fromHeight(50), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))), // Botón principal claro
                              onPressed: _busy ? null : _submit, // Desactivado mientras trabaja
                              child: Text(_busy
                                  ? context.t('auth.processing') // Texto mientras trabaja
                                  : switch (_mode) {
                                      _Mode.signIn => context.t('session.sign_in'), // Acción de entrar
                                      _Mode.signUp => context.t('auth.create'), // Acción de crear cuenta
                                      _Mode.reset => context.t('auth.send_link'), // Acción de recuperar
                                    }, style: const TextStyle(fontWeight: FontWeight.w700)),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: TvSpace.s2), // Espacio
                      if (_mode == _Mode.signIn)
                        TextButton(
                          style: TextButton.styleFrom(foregroundColor: TvColors.marcaTurquesaClaro), // Enlace turquesa
                          onPressed: () => setState(() => _mode = _Mode.reset), // Cambia a recuperar contraseña
                          child: Text(context.t('auth.forgot')), // Texto del enlace
                        ),
                      if (_mode == _Mode.reset)
                        TextButton(
                          style: TextButton.styleFrom(foregroundColor: TvColors.marcaTurquesaClaro), // Enlace turquesa
                          onPressed: () => setState(() => _mode = _Mode.signIn), // Vuelve a iniciar sesión
                          child: Text(context.t('auth.back')), // Texto del enlace
                        ),
                      if (_mode != _Mode.reset) ...[
                        const SizedBox(height: TvSpace.s3), // Espacio
                        Row(
                          children: [
                            Expanded(child: Divider(color: borde)), // Línea izquierda
                            Padding(padding: const EdgeInsets.symmetric(horizontal: TvSpace.s3), child: Text(context.t('auth.or_continue'), style: text.bodySmall?.copyWith(color: tenue))), // "o continúa con"
                            Expanded(child: Divider(color: borde)), // Línea derecha
                          ],
                        ),
                        const SizedBox(height: TvSpace.s3), // Espacio
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(foregroundColor: marfil, backgroundColor: marfil.withValues(alpha: 0.07), side: BorderSide(color: marfil.withValues(alpha: 0.18)), minimumSize: const Size.fromHeight(50), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))), // Botón de vidrio
                          onPressed: _busy ? null : () => _run(() => ref.read(authRepositoryProvider).signInWithGoogle()), // Entra con Google
                          icon: const Icon(Icons.account_circle_outlined), // Ícono genérico de cuenta
                          label: Text(context.t('auth.google'), style: const TextStyle(fontWeight: FontWeight.w700)), // Texto del botón
                        ),
                        const SizedBox(height: TvSpace.s3), // Espacio
                        Text(context.t('auth.terms_note'), textAlign: TextAlign.center, style: text.bodySmall?.copyWith(color: tenue)), // Aviso legal honesto
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Arco de luz al pie de la pantalla, como el borde iluminado de un planeta, con los colores de la marca.
/// Cabecera con una foto real (playa de Corn Island), la frase grande y el crédito de la foto.
class _CabeceraFoto extends StatelessWidget {
  const _CabeceraFoto(); // Constructor constante

  @override
  Widget build(BuildContext context) {
    final f = FotosReales.de('portada-caribe'); // Foto real (o null en pruebas)
    final marca = Theme.of(context).extension<LetrasMundo>()?.marca ?? const TextStyle(); // Letra de la marca
    return ClipRRect(
      borderRadius: BorderRadius.circular(26), // Esquinas suaves
      child: SizedBox(
        height: 230, // Alto de la cabecera
        child: Stack(
          fit: StackFit.expand, // Llena la cabecera
          children: [
            if (f != null) Image.asset(f.asset, fit: BoxFit.cover, semanticLabel: f.lugar) else const ColoredBox(color: TvColors.marcaProfundo), // Foto real o fondo liso
            const DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.topCenter, colors: [Color(0xEB0D1B2A), Color(0x330D1B2A)]))), // Sombra para el texto
            Padding(
              padding: const EdgeInsets.all(TvSpace.s4 + 4), // Márgenes
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
                mainAxisAlignment: MainAxisAlignment.end, // Abajo
                children: [
                  Text('${context.t('auth.art_line1')}\n${context.t('auth.art_line2')}', style: marca.copyWith(color: TvColors.bandMarfil, fontSize: 28, fontWeight: FontWeight.w800, height: 1.05)), // Frase grande
                  const SizedBox(height: TvSpace.s2), // Espacio
                  Text(context.t('auth.art_text'), style: const TextStyle(color: Color(0xFFE6EEE9), fontSize: 13.5)), // Para qué sirve BAQUEANO
                  if (f != null) ...[
                    const SizedBox(height: TvSpace.s1), // Espacio
                    Text(context.t('photo.credit', {'author': f.autor, 'license': f.licencia}), style: const TextStyle(color: Color(0xFFC9D8D0), fontSize: 11)), // Crédito de la foto
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

class _ArcoDeLuz extends CustomPainter {
  const _ArcoDeLuz(); // Constructor constante

  @override
  void paint(Canvas canvas, Size size) {
    final centro = Offset(size.width / 2, size.height * 1.35); // Centro del círculo, por debajo de la pantalla
    final radio = size.height * 0.75; // Radio del arco
    final rect = Rect.fromCircle(center: centro, radius: radio); // Caja del círculo
    final pincel = Paint()
      ..style = PaintingStyle.stroke // Solo el borde
      ..strokeWidth = 34 // Banda ancha
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 26) // Difuminado como luz
      ..shader = const SweepGradient(colors: [TvColors.marcaTurquesaClaro, TvColors.marcaVerde, TvColors.marcaNaranja, TvColors.bandAchiote], startAngle: 3.4, endAngle: 6.0).createShader(rect); // Colores a lo largo del arco
    canvas.drawArc(rect, 3.5, 2.4, false, pincel); // Arco superior del círculo
  }

  @override
  bool shouldRepaint(_ArcoDeLuz oldDelegate) => false; // Nunca cambia
}
