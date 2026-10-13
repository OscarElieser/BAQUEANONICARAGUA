import 'dart:async'; // Completer para saber cuándo terminó el video

import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod
import 'package:video_player/video_player.dart'; // Reproductor de video del sistema

import '../../core/i18n/t.dart'; // Textos traducidos
import '../../core/theme.dart'; // Colores del sistema de diseño

/// Reproductor de la intro. Se separa para poder reemplazarlo en las pruebas (allí no hay video).
abstract class ReproductorIntro {
  Future<bool> preparar(); // true si el video quedó listo para empezar
  Widget vista(); // El video ya preparado
  Future<void> reproducir(); // Termina cuando el video llegó al final
  void liberar(); // Libera el reproductor
}

/// Revelación del logotipo de BAQUEANO (video del dueño, recortado a 3 segundos y sin sonido).
class VideoIntro implements ReproductorIntro {
  VideoPlayerController? _c; // Controlador del video (null hasta preparar)

  @override
  Future<bool> preparar() async {
    try {
      final c = VideoPlayerController.asset(
        'assets/intro/revelacion.mp4', // Video empaquetado en la app (sin red)
        videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true), // No corta la música que la persona esté escuchando
      );
      _c = c; // Se guarda para liberarlo siempre
      await c.initialize().timeout(const Duration(milliseconds: 1500)); // Si el teléfono tarda, la app abre sin intro
      await c.setVolume(0); // Siempre en silencio
      return c.value.isInitialized && c.value.duration > Duration.zero; // Listo y con duración real
    } catch (_) {
      return false; // Teléfono sin decodificador u otro fallo: la app abre directo
    }
  }

  @override
  Widget vista() {
    final c = _c!; // Controlador ya preparado
    return FittedBox(
      fit: BoxFit.cover, // Llena la pantalla sin deformar (el logotipo queda al centro)
      child: SizedBox(width: c.value.size.width, height: c.value.size.height, child: VideoPlayer(c)), // Video a su tamaño real
    );
  }

  @override
  Future<void> reproducir() async {
    final c = _c!; // Controlador ya preparado
    final fin = Completer<void>(); // Se completa al llegar al final
    void escuchar() {
      final v = c.value; // Estado actual del video
      final alFinal = v.position >= v.duration - const Duration(milliseconds: 80); // Ya está en el último cuadro
      if (!fin.isCompleted && (v.hasError || alFinal)) fin.complete(); // Termina por fin o por error
    }

    c.addListener(escuchar); // Escucha el avance
    await c.play(); // Empieza
    await fin.future.timeout(c.value.duration + const Duration(seconds: 1), onTimeout: () {}); // Nunca se queda pegada
    c.removeListener(escuchar); // Deja de escuchar
  }

  @override
  void liberar() => _c?.dispose(); // Libera el decodificador
}

final reproductorIntroProvider = Provider<ReproductorIntro>((ref) => VideoIntro()); // Reproductor (reemplazable en pruebas)

/// Capa que muestra la revelación del logotipo sobre la app al abrirla. La app carga debajo mientras tanto.
/// Se salta tocando la pantalla, no aparece si Android tiene las animaciones quitadas y, si el video falla, no estorba.
class IntroRevelacion extends ConsumerStatefulWidget {
  const IntroRevelacion({super.key, required this.child}); // Recibe la app
  final Widget child; // La app que queda debajo

  @override
  ConsumerState<IntroRevelacion> createState() => _IntroRevelacionState(); // Crea el estado
}

enum _Fase { revisando, preparando, reproduciendo, saliendo, lista } // Momentos de la intro

class _IntroRevelacionState extends ConsumerState<IntroRevelacion> {
  _Fase _fase = _Fase.revisando; // Empieza revisando si corresponde mostrarla
  ReproductorIntro? _reproductor; // Reproductor en uso

  @override
  void didChangeDependencies() {
    super.didChangeDependencies(); // Dependencias normales
    if (_fase != _Fase.revisando) return; // Solo la primera vez
    if (MediaQuery.of(context).disableAnimations) {
      _fase = _Fase.lista; // Android tiene las animaciones quitadas: la app abre directo
      return; // Nada más que hacer
    }
    _fase = _Fase.preparando; // Va a preparar el video
    _empezar(); // Prepara y reproduce sin bloquear la construcción
  }

  Future<void> _empezar() async {
    final r = ref.read(reproductorIntroProvider); // Reproductor (real o de prueba)
    _reproductor = r; // Se guarda para liberarlo
    final listo = await r.preparar(); // Prepara el video
    if (!mounted || _fase != _Fase.preparando) return; // Se cerró o ya se saltó
    if (!listo) {
      _terminar(); // Sin video, la app abre directo
      return; // Nada más que hacer
    }
    setState(() => _fase = _Fase.reproduciendo); // Muestra el video
    await r.reproducir(); // Espera a que termine
    if (mounted && _fase == _Fase.reproduciendo) _salir(); // Al terminar, se desvanece
  }

  void _salir() {
    if (_fase == _Fase.saliendo || _fase == _Fase.lista) return; // Ya estaba saliendo
    setState(() => _fase = _Fase.saliendo); // Empieza el desvanecido
  }

  void _terminar() {
    if (!mounted) return; // La pantalla ya no existe
    setState(() => _fase = _Fase.lista); // Quita la capa
    _reproductor?.liberar(); // Libera el video
    _reproductor = null; // Ya no se usa
  }

  @override
  void dispose() {
    _reproductor?.liberar(); // Libera el video si seguía cargado
    super.dispose(); // Libera el resto
  }

  @override
  Widget build(BuildContext context) {
    if (_fase == _Fase.lista || _fase == _Fase.revisando) return widget.child; // Sin capa
    return Stack(
      children: [
        widget.child, // La app carga debajo mientras tanto
        Positioned.fill(
          child: AnimatedOpacity(
            opacity: _fase == _Fase.saliendo ? 0 : 1, // Se desvanece al final
            duration: const Duration(milliseconds: 320), // Salida corta
            curve: Curves.easeOut, // Suave al final
            onEnd: () {
              if (_fase == _Fase.saliendo) _terminar(); // Al terminar de desvanecer, quita la capa
            },
            child: GestureDetector(
              behavior: HitTestBehavior.opaque, // Toda la pantalla responde al toque
              onTap: _salir, // Tocar en cualquier lugar salta la intro
              child: ColoredBox(
                color: TvColors.marcaNocturno, // Mismo azul del arranque de Android (sin destellos)
                child: Stack(
                  fit: StackFit.expand, // Ocupa toda la pantalla
                  children: [
                    if (_fase != _Fase.preparando && _reproductor != null)
                      Semantics(label: context.t('intro.logo'), image: true, child: _reproductor!.vista()), // El video, descrito para lectores de pantalla
                    Positioned(
                      right: 16, // Margen derecho
                      bottom: 16, // Margen inferior
                      child: SafeArea(
                        child: TextButton(
                          onPressed: _salir, // También se puede saltar con el botón (lectores de pantalla)
                          style: TextButton.styleFrom(foregroundColor: TvColors.bandMarfil.withValues(alpha: 0.8)), // Marfil discreto sobre el azul (10:1)
                          child: Text(context.t('intro.skip')), // "Saltar"
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
