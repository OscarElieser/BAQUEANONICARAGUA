import 'dart:math' as math; // Seno para que cada saltito suba y baje suave

import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod
import 'package:video_player/video_player.dart'; // Reproductor de video del sistema

import '../../core/i18n/t.dart'; // Textos traducidos
import '../../core/theme.dart'; // Colores y espaciados

const _senalaDesde = Duration(seconds: 6); // Momento en que BAQÜI empieza a señalar (sigue hasta quedar en reposo)

/// Video de BAQÜI. Se separa para reemplazarlo en las pruebas (allí no hay reproductor).
abstract class VideoBaqui {
  Future<bool> preparar(); // true si el video quedó listo
  Widget vista(); // El video preparado
  Future<void> reproducirDesde(Duration desde); // Reproduce desde ese momento hasta el final
  Future<void> pausar(); // Pausa
  Future<void> seguir(); // Sigue desde donde se pausó
  void alTerminar(VoidCallback fn); // Avisa cuando llega al final
  void liberar(); // Libera el reproductor
}

/// Presentación de BAQÜI (video del dueño, 10 s, sin sonido): entra, saluda, señala y abre las alas.
class VideoBaquiReal implements VideoBaqui {
  VideoPlayerController? _c; // Controlador (null hasta preparar)
  VoidCallback? _fin; // Qué hacer al terminar
  bool _avisado = false; // Si ya avisó el final de esta reproducción

  @override
  Future<bool> preparar() async {
    try {
      final c = VideoPlayerController.asset('assets/baqui/presentacion.mp4', videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true)); // Sin cortar la música de la persona
      _c = c; // Se guarda para liberarlo siempre
      await c.initialize().timeout(const Duration(seconds: 3)); // Si tarda, queda la imagen quieta
      await c.setVolume(0); // Siempre en silencio
      c.addListener(() { // Vigila el avance para avisar el final
        final v = c.value; // Estado actual
        if (!_avisado && v.duration > Duration.zero && v.position >= v.duration - const Duration(milliseconds: 80)) { // Llegó al final (con margen) y aún no lo avisó
          _avisado = true; // Solo una vez por reproducción
          _fin?.call(); // Avisa que terminó
        }
      });
      return c.value.isInitialized; // Listo
    } catch (_) {
      return false; // Sin reproductor: queda la imagen quieta
    }
  }

  @override
  Widget vista() {
    final c = _c!; // Controlador preparado
    return FittedBox(fit: BoxFit.cover, alignment: const Alignment(0, -0.35), clipBehavior: Clip.hardEdge, child: SizedBox(width: c.value.size.width, height: c.value.size.height, child: VideoPlayer(c))); // Llena el cuadro mostrando cabeza y cuerpo (lo que sobra se recorta y no tapa el pie)
  }

  @override
  Future<void> reproducirDesde(Duration desde) async {
    final c = _c; // Controlador
    if (c == null) return; // Sin preparar
    _avisado = false; // Nueva reproducción
    await c.seekTo(desde); // Salta al momento pedido
    await c.play(); // Reproduce
  }

  @override
  Future<void> pausar() async => _c?.pause(); // Pausa

  @override
  Future<void> seguir() async => _c?.play(); // Sigue desde donde quedó

  @override
  void alTerminar(VoidCallback fn) => _fin = fn; // Guarda el aviso

  @override
  void liberar() => _c?.dispose(); // Libera el decodificador
}

final videoBaquiProvider = Provider<VideoBaqui Function()>((ref) => VideoBaquiReal.new); // Cada pantalla crea su propio video (reemplazable en pruebas)

/// BAQÜI en persona arriba de la conversación. Con las animaciones quitadas en Android no arranca solo.
class EscenarioBaqui extends ConsumerStatefulWidget {
  const EscenarioBaqui({super.key, this.respuestas = 0}); // Recibe cuántas respuestas lleva
  final int respuestas; // Cada respuesta nueva, BAQÜI la señala

  @override
  ConsumerState<EscenarioBaqui> createState() => _EscenarioBaquiState(); // Crea el estado
}

enum _Momento { quieto, reproduciendo, pausado, terminado } // Estado visible del video

class _EscenarioBaquiState extends ConsumerState<EscenarioBaqui> {
  VideoBaqui? _video; // Video de esta pantalla
  bool _listo = false; // Si el video se pudo preparar
  bool _arranco = false; // Si ya se decidió el arranque
  _Momento _momento = _Momento.quieto; // Qué se ve

  @override
  void didChangeDependencies() {
    super.didChangeDependencies(); // Dependencias normales
    if (_arranco) return; // Solo la primera vez
    _arranco = true; // Ya se decidió
    final v = ref.read(videoBaquiProvider)(); // Crea el video
    _video = v; // Se guarda para liberarlo
    v.alTerminar(() { // Cuando el video termine
      if (mounted) setState(() => _momento = _Momento.terminado); // Queda en reposo
    });
    final solo = !MediaQuery.disableAnimationsOf(context); // Sin animaciones quitadas, arranca solo
    v.preparar().then((ok) { // Cuando el video esté listo (o no se pueda)
      if (!mounted) return; // La pantalla se cerró
      setState(() => _listo = ok); // Recuerda si se puede reproducir
      if (ok && solo) _reproducir(Duration.zero); // Presentación
    });
  }

  @override
  void didUpdateWidget(EscenarioBaqui viejo) {
    super.didUpdateWidget(viejo); // Actualización normal
    final permitido = !MediaQuery.disableAnimationsOf(context); // Respeta el ajuste de accesibilidad
    if (widget.respuestas > viejo.respuestas && _listo && permitido) { // Llegó una respuesta, hay video y se permite movimiento
      _video?.reproducirDesde(_senalaDesde); // Señala la respuesta nueva
      _momento = _Momento.reproduciendo; // Muestra el botón de pausa (el cuadro se redibuja enseguida)
    }
  }

  void _reproducir(Duration desde) {
    _video?.reproducirDesde(desde); // Reproduce
    setState(() => _momento = _Momento.reproduciendo); // Muestra el botón de pausa
  }

  @override
  void dispose() {
    _video?.liberar(); // Libera el video
    super.dispose(); // Libera el resto
  }

  @override
  Widget build(BuildContext context) {
    final tv = context.tv; // Colores del tema
    final boton = switch (_momento) { _Momento.reproduciendo => 'baqui.pause', _Momento.terminado => 'baqui.replay', _ => 'baqui.play' }; // Texto del botón
    return ClipRRect(
      borderRadius: BorderRadius.circular(24), // Marco redondeado
      child: ColoredBox(
        color: tv.groundDeep, // Fondo del marco
        child: Column(
          mainAxisSize: MainAxisSize.min, // Solo lo necesario
          children: [
            AspectRatio(
              aspectRatio: 1, // Cuadrado: cabeza y cuerpo
              child: Semantics(
                image: true, // Es una imagen para lectores de pantalla
                label: context.t('baqui.mascot'), // Descripción de BAQÜI
                child: Stack(
                  fit: StackFit.expand, // Ocupa el cuadro
                  children: [
                    Image.asset('assets/baqui/quieto.webp', fit: BoxFit.cover, alignment: const Alignment(0, -0.35)), // BAQÜI en reposo (último cuadro del video)
                    if (_listo && _momento != _Momento.quieto) _video!.vista(), // El video encima cuando corre o terminó
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: TvSpace.s4, vertical: TvSpace.s2), // Márgenes del pie
              child: Row(
                children: [
                  Expanded(child: Text(context.t('baqui.meet'), style: const TextStyle(fontWeight: FontWeight.w700))), // "Conoce a BAQÜI"
                  if (_listo) // Solo con video hay botón
                    OutlinedButton(
                      onPressed: () {
                        if (_momento == _Momento.reproduciendo) { // Está corriendo
                          _video?.pausar(); // Pausa
                          setState(() => _momento = _Momento.pausado); // Ofrece seguir
                        } else if (_momento == _Momento.pausado) { // Está en pausa
                          _video?.seguir(); // Sigue desde donde quedó
                          setState(() => _momento = _Momento.reproduciendo); // Vuelve a ofrecer pausa
                        } else { // Quieto o terminado
                          _reproducir(Duration.zero); // Ver desde el comienzo
                        }
                      },
                      child: Text(context.t(boton)), // Ver, pausar o ver de nuevo
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Cara de BAQÜI junto a sus mensajes: inclina la cabeza mientras piensa y da saltitos al responder.
class CaraBaqui extends StatefulWidget {
  const CaraBaqui({super.key, this.pensando = false, this.hablando = false}); // Estado de ánimo
  final bool pensando; // Esperando la respuesta
  final bool hablando; // Acaba de responder

  @override
  State<CaraBaqui> createState() => _CaraBaquiState(); // Crea el estado
}

class _CaraBaquiState extends State<CaraBaqui> with SingleTickerProviderStateMixin {
  late final AnimationController _a = AnimationController(vsync: this, duration: const Duration(milliseconds: 800)); // Movimiento

  @override
  void didChangeDependencies() {
    super.didChangeDependencies(); // Dependencias normales
    _ajustar(); // Arranca o detiene el movimiento
  }

  @override
  void didUpdateWidget(CaraBaqui viejo) {
    super.didUpdateWidget(viejo); // Actualización normal
    if (viejo.pensando != widget.pensando || viejo.hablando != widget.hablando) _ajustar(); // Cambió el ánimo
  }

  void _ajustar() {
    if (MediaQuery.disableAnimationsOf(context)) { // Android con las animaciones quitadas
      _a.stop(); // Sin movimiento si así se pidió
      _a.value = 0; // Al pensar queda ladeada, quieta; al hablar, en su sitio
      return; // Nada más
    }
    if (widget.pensando) { // Esperando la respuesta
      _a.duration = const Duration(milliseconds: 800); // Movimiento pausado
      _a.repeat(reverse: true); // Ladea la cabeza de un lado a otro
    } else if (widget.hablando) { // Acaba de responder
      _a.duration = const Duration(milliseconds: 360); // Cada saltito
      _a.repeat(count: 3).then((_) { // Tres saltitos
        if (mounted) _a.value = 0; // Tres saltitos y queda exactamente en su sitio
      });
    } else { // Ni piensa ni habla
      _a.stop(); // Quieto
    }
  }

  @override
  void dispose() {
    _a.dispose(); // Libera la animación
    super.dispose(); // Libera el resto
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _a, // Movimiento
      builder: (context, hijo) {
        final t = _a.value; // Avance de 0 a 1
        final giro = widget.pensando ? (-0.16 + 0.28 * Curves.easeInOut.transform(t)) : 0.0; // Al pensar ladea la cabeza de un lado a otro (radianes)
        final salto = widget.hablando ? -3.0 * math.sin(math.pi * t) : 0.0; // Al responder sube y baja (empieza y termina abajo)
        return Transform.translate(offset: Offset(0, salto), child: Transform.rotate(angle: giro, alignment: const Alignment(0, 0.6), child: hijo)); // Aplica el movimiento
      },
      child: Container(
        padding: const EdgeInsets.all(2), // Grosor del aro
        decoration: const BoxDecoration(shape: BoxShape.circle, color: TvColors.marcaNaranja), // Aro naranja de la marca
        child: const CircleAvatar(radius: 18, backgroundImage: AssetImage('assets/baqui/cara.webp')), // Cara de BAQÜI
      ),
    );
  }
}
