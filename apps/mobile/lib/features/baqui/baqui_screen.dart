import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod
import 'package:supabase_flutter/supabase_flutter.dart'; // Cliente de Supabase (funciones)

import '../../core/data/repositories.dart'; // NotConfigured
import '../../core/env.dart'; // Configuración de la compilación
import '../../core/i18n/t.dart'; // Textos traducidos
import '../../core/theme.dart'; // Colores y espaciados
import '../auth/auth_repository.dart'; // Sesión
import 'escenario_baqui.dart'; // BAQÜI en persona y su cara

/// Respuesta de BAQÜI o el motivo por el que no respondió.
class RespuestaBaqui {
  const RespuestaBaqui({this.texto, this.conversacion, this.aviso}); // Constructor
  final String? texto; // Lo que respondió
  final String? conversacion; // Conversación guardada
  final String? aviso; // Clave del aviso si no respondió (baqui.off, baqui.limit…)
}

/// Habla con la función "baqui" de Supabase (la misma que usa la web). La clave de Gemini está solo en el servidor.
abstract class BaquiRepository {
  Future<RespuestaBaqui> enviar(String mensaje, String locale, String? conversacion); // Envía un mensaje
}

/// Implementación con Supabase.
class SupabaseBaquiRepository implements BaquiRepository {
  @override
  Future<RespuestaBaqui> enviar(String mensaje, String locale, String? conversacion) async {
    if (!Env.isSupabaseConfigured) throw const NotConfigured(); // Sin configuración no hay asistente
    try {
      final res = await Supabase.instance.client.functions.invoke('baqui', body: {'message': mensaje, 'locale': locale, 'conversation_id': conversacion}); // Llama con el token de la sesión
      final data = res.data as Map<String, dynamic>; // Respuesta
      return RespuestaBaqui(texto: data['text'] as String?, conversacion: data['conversation_id'] as String?); // Texto y conversación
    } on FunctionException catch (e) {
      return RespuestaBaqui(aviso: switch (e.status) { 503 => 'baqui.off', 429 => 'baqui.limit', 401 => 'baqui.sign_in', _ => 'baqui.error' }); // Motivo según el código
    } catch (_) {
      return const RespuestaBaqui(aviso: 'baqui.error'); // Sin conexión u otro fallo
    }
  }
}

final baquiRepositoryProvider = Provider<BaquiRepository>((ref) => SupabaseBaquiRepository()); // Asistente (reemplazable en pruebas)

/// Pantalla de conversación con BAQÜI.
class BaquiScreen extends ConsumerStatefulWidget {
  const BaquiScreen({super.key}); // Constructor

  @override
  ConsumerState<BaquiScreen> createState() => _BaquiScreenState(); // Crea el estado
}

class _BaquiScreenState extends ConsumerState<BaquiScreen> {
  final _campo = TextEditingController(); // Mensaje escrito
  final _scroll = ScrollController(); // Desplazamiento de la conversación
  final _escenario = GlobalKey(); // BAQÜI en persona: conserva su video si la sesión cambia con la pantalla abierta
  final _lineas = <(bool, String, GlobalKey)>[]; // (es de la persona, texto, clave para encontrarla en la lista)
  String? _conversacion; // Conversación guardada
  String? _aviso; // Aviso actual
  bool _enviando = false; // Si hay un mensaje en camino
  int _senaladas = 0; // Respuestas que BAQÜI señaló (solo las que llegan con él a la vista)

  @override
  void dispose() {
    _campo.dispose(); // Libera el campo
    _scroll.dispose(); // Libera el desplazamiento
    super.dispose(); // Libera el resto
  }

  /// Después de dibujar, lleva la conversación a lo último (sin animación si así se pidió en Android).
  /// Con una respuesta nueva la muestra desde su comienzo y, si BAQÜI sigue a la vista, él la señala.
  void _mostrarUltimo({bool respuesta = false}) {
    WidgetsBinding.instance.addPostFrameCallback((_) async { // Espera a que la lista esté dibujada
      if (!mounted || !_scroll.hasClients) return; // La pantalla se cerró o la lista no existe
      final quieto = MediaQuery.disableAnimationsOf(context); // Ajuste de accesibilidad
      final duracion = quieto ? Duration.zero : const Duration(milliseconds: 300); // Desplazamiento suave o inmediato
      final ctx = respuesta ? _lineas.last.$3.currentContext : null; // La respuesta nueva, ya dibujada
      if (ctx != null) { // La respuesta ya está en la lista
        await Scrollable.ensureVisible(ctx, alignment: 0.06, duration: duracion, curve: Curves.easeOut); // Si es larga se ve su comienzo; si es corta queda abajo con lo anterior encima
      } else if (quieto) { // Sin animaciones
        _scroll.jumpTo(_scroll.position.maxScrollExtent); // Hasta abajo de una vez
      } else { // Con animaciones
        await _scroll.animateTo(_scroll.position.maxScrollExtent, duration: duracion, curve: Curves.easeOut); // Hasta abajo: su mensaje y BAQÜI pensando
      }
      if (respuesta && mounted && _scroll.hasClients && _scroll.offset < 160) setState(() => _senaladas++); // BAQÜI aún se ve: señala la respuesta
    });
  }

  Future<void> _enviar(String texto) async {
    if (texto.trim().isEmpty || _enviando) return; // Vacío o ya enviando
    setState(() {
      _lineas.add((true, texto.trim(), GlobalKey())); // Muestra lo que escribió
      _enviando = true; // Esperando
      _aviso = null; // Limpia avisos
    });
    _campo.clear(); // Limpia el campo
    _mostrarUltimo(); // Baja hasta su mensaje y BAQÜI pensando
    final r = await ref.read(baquiRepositoryProvider).enviar(texto.trim(), context.langCode, _conversacion); // Pregunta
    if (!mounted) return; // La pantalla se cerró
    setState(() {
      if (r.texto != null) _lineas.add((false, r.texto!, GlobalKey())); // Respuesta
      _conversacion = r.conversacion ?? _conversacion; // Recuerda la conversación
      _aviso = r.aviso; // Aviso (si lo hay)
      _enviando = false; // Ya no espera
    });
    _mostrarUltimo(respuesta: r.texto != null); // Muestra la respuesta (o el aviso)
  }

  /// Burbuja de un mensaje (la persona a la derecha en turquesa; BAQÜI a la izquierda).
  Widget _burbuja(BuildContext context, bool mia, String texto) {
    final tv = context.tv; // Colores
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4), // Separación
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10), // Relleno
      constraints: const BoxConstraints(maxWidth: 320), // Ancho máximo
      decoration: BoxDecoration(color: mia ? TvColors.marcaTurquesa.withValues(alpha: 0.18) : tv.groundRaised, borderRadius: BorderRadius.circular(16), border: mia ? null : Border.all(color: tv.line)), // Fondo de cada lado
      child: Text(texto), // Mensaje
    );
  }

  @override
  Widget build(BuildContext context) {
    final tv = context.tv; // Colores
    final user = ref.watch(authStateProvider).valueOrNull; // Sesión
    final ultimaDeBaqui = _lineas.lastIndexWhere((l) => !l.$1); // Respuesta más nueva de BAQÜI
    Widget fila(bool mia, String texto, {bool pensando = false, bool hablando = false, Key? clave}) => Row(
          key: clave, // Para encontrar el mensaje en la lista
          mainAxisAlignment: mia ? MainAxisAlignment.end : MainAxisAlignment.start, // La persona a la derecha
          crossAxisAlignment: CrossAxisAlignment.end, // La cara abajo, junto al final del mensaje
          children: [
            if (!mia) ...[CaraBaqui(pensando: pensando, hablando: hablando), const SizedBox(width: TvSpace.s2)], // Cara de BAQÜI en sus mensajes
            Flexible(child: _burbuja(context, mia, texto)), // Mensaje
          ],
        );
    return Scaffold(
      appBar: AppBar(title: const Text('BAQÜI')), // Nombre propio (igual en todos los idiomas)
      body: user == null
          ? ListView(
              padding: const EdgeInsets.all(TvSpace.s4), // Márgenes
              children: [
                Center(child: SizedBox(width: 320, child: EscenarioBaqui(key: _escenario))), // BAQÜI se presenta aunque no haya sesión
                const SizedBox(height: TvSpace.s4), // Espacio
                fila(false, context.t('baqui.hello')), // Saludo fijo
                fila(false, context.t('baqui.sign_in_app')), // Sin sesión: dónde entrar
              ],
            )
          : Column(
              children: [
                Expanded(
                  child: ListView(
                    controller: _scroll, // Para bajar a lo último
                    padding: const EdgeInsets.all(TvSpace.s4), // Márgenes
                    children: [
                      Center(child: SizedBox(width: 320, child: EscenarioBaqui(key: _escenario, respuestas: _senaladas))), // BAQÜI en persona (señala las respuestas que llegan con él a la vista)
                      const SizedBox(height: TvSpace.s4), // Espacio
                      fila(false, context.t('baqui.hello')), // Saludo fijo (no lo genera el modelo)
                      for (final (i, l) in _lineas.indexed) fila(l.$1, l.$2, hablando: !l.$1 && i == ultimaDeBaqui, clave: l.$3), // Conversación (la respuesta más nueva "habla")
                      if (_enviando) fila(false, context.t('baqui.thinking'), pensando: true), // Esperando: BAQÜI piensa
                      if (_aviso != null) Padding(padding: const EdgeInsets.only(top: TvSpace.s2), child: Text(context.t(_aviso!), style: TextStyle(color: tv.statusAlert, fontWeight: FontWeight.w700))), // Aviso claro
                      if (_lineas.isEmpty)
                        Wrap(spacing: TvSpace.s2, runSpacing: TvSpace.s2, children: [for (final s in ['baqui.s1', 'baqui.s2', 'baqui.s3']) ActionChip(label: Text(context.t(s)), onPressed: () => _enviar(context.t(s)))]), // Sugerencias
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(TvSpace.s4, 0, TvSpace.s4, TvSpace.s2), // Márgenes
                  child: Text(context.t('baqui.note'), style: TextStyle(color: tv.inkMuted, fontSize: 12)), // Qué puede y qué no
                ),
                SafeArea(
                  top: false, // Solo abajo
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(TvSpace.s4, 0, TvSpace.s4, TvSpace.s4), // Márgenes
                    child: Row(
                      children: [
                        Expanded(child: TextField(controller: _campo, maxLength: 2000, minLines: 1, maxLines: 4, decoration: InputDecoration(hintText: context.t('baqui.placeholder'), counterText: ''), onSubmitted: _enviar)), // Mensaje
                        const SizedBox(width: TvSpace.s2), // Espacio
                        FilledButton(onPressed: _enviando ? null : () => _enviar(_campo.text), child: Text(context.t('baqui.send'))), // Enviar
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
