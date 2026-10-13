import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod
import 'package:supabase_flutter/supabase_flutter.dart'; // Cliente de Supabase

import '../../core/data/repositories.dart'; // NotConfigured
import '../../core/env.dart'; // Configuración de la compilación
import '../../core/i18n/t.dart'; // Textos traducidos
import '../../core/theme.dart'; // Colores y espaciados
import '../auth/auth_repository.dart'; // Sesión
import '../territories/presentation/territories_screen.dart'; // Territorios publicados

/// Publica una crónica con la cuenta (misma tabla y reglas que la web: RLS, límite de 10 por hora y moderación).
abstract class CronicasRepository {
  Future<void> publicar({required String titulo, required String texto, required String locale, int? territorio, required bool promocional}); // Envía la crónica
}

/// Implementación con Supabase.
class SupabaseCronicasRepository implements CronicasRepository {
  @override
  Future<void> publicar({required String titulo, required String texto, required String locale, int? territorio, required bool promocional}) async {
    if (!Env.isSupabaseConfigured) throw const NotConfigured(); // Sin configuración no se publica
    final db = Supabase.instance.client; // Cliente con el token de Firebase
    final yo = await db.rpc('my_profile_id') as String?; // Perfil de quien publica
    await db.from('posts').insert({
      'author_id': yo, // Autora o autor (RLS lo comprueba)
      'kind': 'chronicle', // Es una crónica
      'title': titulo.trim(), // Título
      'body_md': texto.trim(), // Relato
      'locale': locale, // Idioma en que se escribió
      'department_id': territorio, // Territorio (opcional)
      'is_promotional': promocional, // Publicidad identificada
    }); // Inserta
  }
}

final cronicasRepositoryProvider = Provider<CronicasRepository>((ref) => SupabaseCronicasRepository()); // Publicación (reemplazable en pruebas)

/// Pantalla del formulario.
class PublicarCronicaScreen extends ConsumerStatefulWidget {
  const PublicarCronicaScreen({super.key}); // Constructor

  @override
  ConsumerState<PublicarCronicaScreen> createState() => _PublicarCronicaScreenState(); // Crea el estado
}

class _PublicarCronicaScreenState extends ConsumerState<PublicarCronicaScreen> {
  final _form = GlobalKey<FormState>(); // Para validar
  final _titulo = TextEditingController(); // Título
  final _texto = TextEditingController(); // Relato
  int? _territorio; // Territorio elegido (o ninguno)
  bool _promo = false; // Si es publicidad propia
  String _estado = 'idle'; // idle, sending, sent, limit o error

  @override
  void dispose() {
    _titulo.dispose(); // Libera
    _texto.dispose(); // Libera
    super.dispose(); // Libera el resto
  }

  Future<void> _enviar() async {
    if (!(_form.currentState?.validate() ?? false)) return; // Campos incompletos
    setState(() => _estado = 'sending'); // Enviando
    try {
      await ref.read(cronicasRepositoryProvider).publicar(titulo: _titulo.text, texto: _texto.text, locale: context.langCode, territorio: _territorio, promocional: _promo); // Publica
      if (!mounted) return; // La pantalla se cerró
      _titulo.clear(); // Limpia
      _texto.clear(); // Limpia
      setState(() => _estado = 'sent'); // Publicada
    } on PostgrestException catch (e) {
      if (mounted) setState(() => _estado = e.code == '54000' ? 'limit' : 'error'); // Límite por hora u otro error
    } catch (_) {
      if (mounted) setState(() => _estado = 'error'); // Error claro
    }
  }

  @override
  Widget build(BuildContext context) {
    final tv = context.tv; // Colores
    final user = ref.watch(authStateProvider).valueOrNull; // Sesión
    final territorios = ref.watch(territoriesProvider).valueOrNull ?? const []; // Territorios publicados
    return Scaffold(
      appBar: AppBar(title: Text(context.t('chron.publish'))), // "Publicar mi crónica"
      body: ListView(
        padding: const EdgeInsets.all(TvSpace.s6), // Márgenes
        children: [
          Text(context.t('chron.form_intro'), style: TextStyle(color: tv.inkMuted)), // Reglas en una línea
          const SizedBox(height: TvSpace.s4), // Espacio
          if (user == null)
            Text(context.t('chron.sign_in_app')) // Sin sesión: explica dónde entrar
          else
            Form(
              key: _form, // Para validar
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch, // Campos a lo ancho
                children: [
                  TextFormField(controller: _titulo, maxLength: 160, decoration: InputDecoration(labelText: context.t('chron.f_title')), validator: (v) => (v ?? '').trim().isEmpty ? context.t('chron.f_title') : null), // Título obligatorio
                  TextFormField(controller: _texto, maxLength: 20000, minLines: 6, maxLines: 14, decoration: InputDecoration(labelText: context.t('chron.f_body')), validator: (v) => (v ?? '').trim().length < 40 ? context.t('chron.f_body_short') : null), // Relato de al menos 40 letras
                  DropdownButtonFormField<int?>(
                    initialValue: _territorio, // Elegido al abrir
                    decoration: InputDecoration(labelText: context.t('chron.f_territory')), // Etiqueta
                    items: [DropdownMenuItem(value: null, child: Text(context.t('chron.no_territory'))), for (final t in territorios) DropdownMenuItem(value: t.id, child: Text(t.shortName))], // Sin territorio y los publicados
                    onChanged: (v) => setState(() => _territorio = v), // Cambia
                  ),
                  CheckboxListTile(value: _promo, onChanged: (v) => setState(() => _promo = v ?? false), title: Text(context.t('chron.f_promo')), contentPadding: EdgeInsets.zero, controlAffinity: ListTileControlAffinity.leading), // Publicidad propia
                  const SizedBox(height: TvSpace.s2), // Espacio
                  FilledButton(onPressed: _estado == 'sending' ? null : _enviar, child: Text(context.t('chron.f_submit'))), // Publicar
                  const SizedBox(height: TvSpace.s2), // Espacio
                  if (_estado == 'sent') Text(context.t('chron.sent'), style: TextStyle(color: tv.statusVerified)), // Publicada
                  if (_estado == 'limit') Text(context.t('chron.limit'), style: TextStyle(color: tv.statusAlert)), // Límite
                  if (_estado == 'error') Text(context.t('trips.error'), style: TextStyle(color: tv.statusAlert)), // Error
                ],
              ),
            ),
        ],
      ),
    );
  }
}
