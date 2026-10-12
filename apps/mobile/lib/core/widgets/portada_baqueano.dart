import 'dart:math' as math; // Senos, números al azar y π
import 'dart:typed_data'; // Matriz de transformación como lista de números

import 'package:flutter/material.dart'; // Componentes visuales de Flutter

import '../data/fotos.dart'; // Fotos reales con licencia libre
import '../i18n/t.dart'; // Textos traducidos
import '../theme.dart'; // Colores y letras del sistema de diseño

/// Generador con semilla (mulberry32), igual al de la web: la ventana siempre sale con la misma forma.
class Azar {
  Azar(int semilla) : _a = semilla & 0xFFFFFFFF; // Estado inicial de 32 bits
  int _a; // Estado interno

  static int _imul(int a, int b) => (a * b) & 0xFFFFFFFF; // Multiplicación de 32 bits (como Math.imul)

  /// Número entre 0 y 1.
  double call() {
    _a = (_a + 0x6D2B79F5) & 0xFFFFFFFF; // Avanza el estado
    var t = _a; // Copia para mezclar
    t = _imul(t ^ (t >> 15), t | 1); // Primera mezcla
    t = (t ^ (t + _imul(t ^ (t >> 7), t | 61))) & 0xFFFFFFFF; // Segunda mezcla
    return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296; // Normaliza a [0, 1)
  }
}

/// Bandas de pincel que forman la ventana (lienzo de 1200 × 560), con orillas vivas y cerdas sueltas en los extremos.
List<Path> pinceladas(int semilla, {double ancho = 1200, double alto = 560, int bandas = 8}) {
  final r = Azar(semilla); // Secuencia fija
  final paso = alto / bandas; // Alto que le toca a cada banda
  final res = <Path>[]; // Bandas generadas
  double Function(double) borde(double amp) {
    final ondas = List.generate(3, (_) => [0.004 + r() * 0.02, r() * math.pi * 2, amp * (0.3 + r() * 0.7)]); // Tres ondas suaves
    return (x) => ondas.fold(0.0, (s, o) => s + math.sin(x * o[0] + o[1]) * o[2]) + (r() - 0.5) * amp * 0.5; // Ondas más temblor
  }

  for (var i = 0; i < bandas; i++) {
    final yc = paso * (i + 0.5); // Centro de la banda
    final grosor = paso * (1.5 + r() * 0.4); // Las bandas se solapan
    final extremo = (i == 0 || i == bandas - 1) ? 70.0 : 0.0; // Arriba y abajo, más cortas
    final x0 = 24 + r() * 46 + extremo, x1 = ancho - 24 - r() * 46 - extremo; // Inicio y final
    final arriba = borde(6), abajo = borde(6); // Orillas
    final p = Path()..moveTo(x0, yc - grosor / 2 + arriba(x0)); // Empieza arriba a la izquierda
    for (var x = x0 + 10; x <= x1; x += 10) {
      p.lineTo(x, yc - grosor / 2 + arriba(x)); // Orilla de arriba
    }
    for (var x = x1; x >= x0; x -= 10) {
      p.lineTo(x, yc + grosor / 2 + abajo(x)); // Orilla de abajo, de vuelta
    }
    p.close(); // Cierra el cuerpo
    for (final lado in [-1.0, 1.0]) {
      final b0 = lado < 0 ? x0 : x1; // Extremo de las cerdas
      final n = 9 + (r() * 7).floor(); // Entre 9 y 15 cerdas
      for (var c = 0; c < n; c++) {
        final y = yc + (r() - 0.5) * grosor * 0.9; // Altura de la cerda
        final g = 2 + r() * r() * 14; // Grosor
        final largo = 10 + r() * r() * 70; // Cuánto sobresale
        p
          ..moveTo(b0 - lado * 20, y - g / 2) // Raíz dentro de la banda
          ..lineTo(b0 + lado * largo, y + (r() - 0.5) * 3) // Punta
          ..lineTo(b0 - lado * 20, y + g / 2) // Vuelve a la raíz
          ..close(); // Cerda cerrada
      }
    }
    res.add(p); // Guarda la banda
  }
  return res;
}

/// Las tres escenas, en el mismo orden que las barras.
const escenasPortada = ['pacifico', 'norte', 'caribe'];

/// Portada de BAQUEANO para Android: ventana pintada, eslogan en dos pesos, firma y barras de escena.
class PortadaBaqueano extends StatefulWidget {
  const PortadaBaqueano({super.key, required this.onExplorar, required this.onViaje}); // Constructor
  final VoidCallback onExplorar; // "Explorar Nicaragua"
  final VoidCallback onViaje; // "Crear mi viaje"

  @override
  State<PortadaBaqueano> createState() => _PortadaBaqueanoState(); // Crea el estado
}

class _PortadaBaqueanoState extends State<PortadaBaqueano> with TickerProviderStateMixin {
  static final _bandas = pinceladas(1979); // Misma semilla que la web
  late final AnimationController _pintar = AnimationController(vsync: this, duration: const Duration(milliseconds: 1300)); // Brochazos de entrada
  late final AnimationController _fundido = AnimationController(vsync: this, duration: const Duration(milliseconds: 600), value: 1); // Cambio de escena
  String _escena = 'pacifico', _anterior = 'pacifico'; // Escena visible y la que se va

  @override
  void didChangeDependencies() {
    super.didChangeDependencies(); // Comportamiento base
    if (MediaQuery.of(context).disableAnimations) {
      _pintar.value = 1; // Sin animaciones: la ventana ya está pintada
    } else if (!_pintar.isAnimating && _pintar.value == 0) {
      _pintar.forward(); // Pinta la ventana una sola vez
    }
  }

  @override
  void dispose() {
    _pintar.dispose(); // Libera la animación de entrada
    _fundido.dispose(); // Libera el fundido
    super.dispose(); // Limpieza base
  }

  void _elegir(String e) {
    if (e == _escena) return; // Ya está visible
    setState(() {
      _anterior = _escena; // La actual se irá
      _escena = e; // La nueva entra
    });
    if (MediaQuery.of(context).disableAnimations) {
      _fundido.value = 1; // Cambio inmediato
    } else {
      _fundido.forward(from: 0); // Fundido de 600 ms
    }
  }

  @override
  Widget build(BuildContext context) {
    final tv = context.tv; // Colores del tema
    final oscuro = Theme.of(context).brightness == Brightness.dark; // Tema oscuro
    final fondo = oscuro ? TvColors.marcaNocturno : tv.groundRaised; // Lienzo de la portada
    final letras = Theme.of(context).extension<LetrasMundo>(); // Letras de marca
    final turquesa = oscuro ? TvColors.marcaTurquesaClaro : TvColors.marcaTurquesa; // Turquesa según el fondo
    final marca = letras?.marca ?? const TextStyle(); // Letra del eslogan

    return Container(
      color: fondo, // Lienzo
      padding: const EdgeInsets.fromLTRB(TvSpace.s4, TvSpace.s4, TvSpace.s4, TvSpace.s6), // Márgenes
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
        children: [
          ExcludeSemantics(
            child: AspectRatio(
              aspectRatio: 1200 / 560, // Misma proporción que en la web
              child: FotosReales.de('portada-$_escena') != null
                  ? Stack(
                      fit: StackFit.expand, // Ocupa la ventana completa
                      children: [
                        ClipPath(
                          clipper: _Ventana(_bandas, _pintar), // Se recorta a los brochazos (y se pinta al llegar)
                          child: AnimatedSwitcher(
                            duration: MediaQuery.of(context).disableAnimations ? Duration.zero : const Duration(milliseconds: 600), // Fundido entre fotos
                            child: Image.asset(FotosReales.de('portada-$_escena')!.asset, key: ValueKey(_escena), fit: BoxFit.cover, width: double.infinity, height: double.infinity), // Foto real de la escena
                          ),
                        ),
                        CustomPaint(painter: _Desvanecido(fondo)), // Abajo a la izquierda la foto se funde con el lienzo
                      ],
                    )
                  : AnimatedBuilder(
                      animation: Listenable.merge([_pintar, _fundido]), // Redibuja al pintar o al cambiar de escena
                      builder: (_, __) => CustomPaint(
                        painter: _PintorPortada(bandas: _bandas, avance: _pintar.value, escena: _escena, anterior: _anterior, fundido: _fundido.value, fondo: fondo, palabras: {for (final e in escenasPortada) e: context.t('hero.word_$e')}, letra: marca), // Ilustración de respaldo con palabra gigante
                      ),
                    ),
            ),
          ),
          const SizedBox(height: TvSpace.s2), // Espacio
          Semantics(
            header: true, // Es el título de la pantalla
            child: Text.rich(
              TextSpan(children: [
                TextSpan(text: '${context.t('brand.slogan_1').toUpperCase()}\n', style: marca.copyWith(fontSize: 34, fontWeight: FontWeight.w800, color: oscuro ? TvColors.bandMarfil : TvColors.marcaProfundo)), // Primera línea, gruesa
                TextSpan(text: context.t('brand.slogan_2').toUpperCase(), style: marca.copyWith(fontSize: 34, fontWeight: FontWeight.w400, color: turquesa)), // Segunda línea, ligera
              ]),
            ),
          ),
          Align(
            alignment: Alignment.centerRight, // Firma a la derecha
            child: ExcludeSemantics(
              child: Transform.rotate(angle: -0.12, child: Text('Nicaragua', style: (letras?.firma ?? const TextStyle()).copyWith(fontSize: 46))), // Firma a mano (decorativa)
            ),
          ),
          Row(
            children: [
              Expanded(
                child: Semantics(
                  liveRegion: true, // Se anuncia al cambiar de escena
                  child: Text(
                    FotosReales.de('portada-$_escena') == null
                        ? context.t('hero.scene_caption', {'zone': context.t('zone.$_escena')}) // "Ilustración: …"
                        : '${FotosReales.de('portada-$_escena')!.lugar}. ${context.t('photo.credit', {'author': FotosReales.de('portada-$_escena')!.autor, 'license': FotosReales.de('portada-$_escena')!.licencia})}', // Lugar real y crédito
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tv.inkMuted), // Texto pequeño
                  ),
                ),
              ),
              for (final e in escenasPortada)
                Semantics(
                  button: true, // Es un botón
                  selected: e == _escena, // Dice si es la escena visible
                  label: context.t('zone.$e'), // Nombre de la zona
                  child: InkWell(
                    key: Key('escena-$e'), // Para las pruebas
                    onTap: () => _elegir(e), // Cambia la escena
                    child: SizedBox(
                      width: 48, // Área táctil
                      height: TvSpace.touchMin, // 44 px de alto
                      child: Center(
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 260), // Se estira con suavidad
                          width: e == _escena ? 38 : 26, // La visible, más larga
                          height: 7, // Barra delgada
                          decoration: BoxDecoration(color: _colorZona(e).withValues(alpha: e == _escena ? 1 : 0.55), borderRadius: BorderRadius.circular(2)), // Color de la zona
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: TvSpace.s4), // Espacio
          Wrap(
            spacing: TvSpace.s3, // Espacio entre botones
            runSpacing: TvSpace.s3, // Espacio entre filas
            children: [
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: TvColors.marcaNaranja, foregroundColor: TvColors.marcaNocturno, minimumSize: const Size(0, 52), shape: const StadiumBorder()), // Naranja con tinta nocturna (5.4:1)
                onPressed: widget.onExplorar, // Baja al mapa
                child: Text(context.t('hero.cta_explore'), style: const TextStyle(fontWeight: FontWeight.w700)), // Explorar Nicaragua
              ),
              OutlinedButton(
                style: OutlinedButton.styleFrom(foregroundColor: turquesa, side: BorderSide(color: turquesa, width: 2), minimumSize: const Size(0, 52), shape: const StadiumBorder()), // Contorno turquesa
                onPressed: widget.onViaje, // Abre Mi aventura
                child: Text(context.t('hero.cta_trip'), style: const TextStyle(fontWeight: FontWeight.w700)), // Crear mi viaje
              ),
            ],
          ),
        ],
      ),
    );
  }
}

Color _colorZona(String z) => switch (z) {
      'pacifico' => TvColors.terracota, // Lava
      'norte' => TvColors.musgo, // Musgo
      _ => TvColors.caribe, // Mar
    };

/// Dibuja la ventana de pincel y, dentro, la escena (con fundido entre la anterior y la nueva).
class _PintorPortada extends CustomPainter {
  _PintorPortada({required this.bandas, required this.avance, required this.escena, required this.anterior, required this.fundido, required this.fondo, required this.palabras, required this.letra}); // Constructor
  final Map<String, String> palabras; // Palabra gigante de cada escena (traducida)
  final TextStyle letra; // Letra de marca para la palabra

  /// Palabra gigante entre capas: lo que se dibuja después (volcanes, cerros, cayos) la tapa en parte.
  void _palabra(Canvas c, String escena, double y) {
    final tp = TextPainter(
      text: TextSpan(text: palabras[escena] ?? '', style: letra.copyWith(fontSize: 210, fontWeight: FontWeight.w900, color: Colors.white, height: 1)), // Blanca y enorme
      textDirection: TextDirection.ltr, // Dirección del texto
    )..layout(); // Mide el texto
    final ancho = tp.width > 1100 ? 1100 / tp.width : 1.0; // Si es muy larga, se encoge para caber
    c.save(); // Guarda el estado
    c.translate(600, y); // Centro de la palabra
    c.scale(ancho, 1); // Ajuste de ancho
    tp.paint(c, Offset(-tp.width / 2, -tp.height * 0.78)); // Dibuja centrada sobre la línea base
    c.restore(); // Devuelve el lienzo
  }
  final List<Path> bandas; // Forma de la ventana
  final double avance; // 0 a 1: cuánto se ha pintado
  final String escena, anterior; // Escena nueva y la que se va
  final double fundido; // 0 a 1: avance del cambio de escena
  final Color fondo; // Color del lienzo (para el desvanecido)

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save(); // Guarda el estado
    canvas.scale(size.width / 1200, size.height / 560); // Lienzo de 1200 × 560
    final ventana = Path(); // Unión de bandas visibles
    for (var i = 0; i < bandas.length; i++) {
      final t = ((avance * 1.6) - i * 0.08).clamp(0.0, 1.0); // Cada banda empieza un poco después
      if (t <= 0) continue; // Aún no se pinta
      final b = bandas[i].getBounds(); // Rectángulo de la banda
      final sx = Curves.easeOutCubic.transform(t); // Cuánto se ha estirado la banda
      final m = Float64List.fromList([sx, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, b.left * (1 - sx), 0, 0, 1]); // Escala horizontal con el borde izquierdo fijo
      ventana.addPath(bandas[i].transform(m), Offset.zero); // Agrega la banda
    }
    canvas.clipPath(ventana); // Todo lo que sigue, dentro de la ventana
    if (fundido < 1) _escena(canvas, anterior); // La escena que se va
    canvas.saveLayer(null, Paint()..color = Colors.white.withValues(alpha: fundido)); // La nueva aparece encima
    _escena(canvas, escena); // Escena nueva
    canvas.restore(); // Cierra la capa del fundido
    final desv = Paint()
      ..shader = RadialGradient(colors: [fondo, fondo, fondo.withValues(alpha: 0)], stops: const [0, 0.55, 1]).createShader(Rect.fromCenter(center: const Offset(330, 640), width: 1400, height: 600)); // Abajo a la izquierda la pintura se desvanece hacia el lienzo
    canvas.drawRect(const Rect.fromLTWH(0, 0, 1200, 560), desv); // Aplica el desvanecido
    canvas.restore(); // Devuelve el lienzo
  }

  void _escena(Canvas c, String e) => switch (e) {
        'norte' => _norte(c),
        'caribe' => _caribe(c),
        _ => _pacifico(c),
      }; // Elige la escena

  static Paint _p(Color c) => Paint()..color = c; // Pincel de un color
  static Color _mix(Color a, Color b, double t) => Color.lerp(b, a, t)!; // Mezcla: t es la parte de "a"

  void _cielo(Canvas c, Color arriba, Color abajo) => c.drawRect(const Rect.fromLTWH(0, 0, 1200, 560), Paint()..shader = LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [arriba, abajo]).createShader(const Rect.fromLTWH(0, 0, 1200, 420))); // Cielo en degradado

  void _aves(Canvas c, double x, double y, Color col) {
    final p = Paint()
      ..color = col // Color de las aves
      ..style = PaintingStyle.stroke // Solo trazo
      ..strokeWidth = 2.4 // Grosor
      ..strokeCap = StrokeCap.round; // Puntas redondas
    for (final a in [[0.0, 0.0, 1.0], [38.0, -14.0, 0.8], [70.0, 8.0, 0.65], [-34.0, 18.0, 0.7]]) {
      final s = a[2], ox = x + a[0] - 12 * s, oy = y + a[1] - 4 * s; // Posición y tamaño del ave
      c.drawPath(Path()..moveTo(ox, oy)..quadraticBezierTo(ox + 6 * s, oy - 6 * s, ox + 12 * s, oy)..quadraticBezierTo(ox + 18 * s, oy - 6 * s, ox + 24 * s, oy), p); // Un ave: dos curvas
    }
  }

  void _pacifico(Canvas c) {
    _cielo(c, _mix(TvColors.marcaTurquesa, Colors.white, 0.55), _mix(TvColors.bandMarfil, TvColors.marcaNaranja, 0.8)); // Cielo de tarde
    c.drawCircle(const Offset(905, 215), 92, _p(TvColors.marcaNaranja.withValues(alpha: 0.18))); // Halo del sol
    c.drawCircle(const Offset(905, 215), 54, _p(TvColors.marcaNaranja)); // Sol
    c.drawPath(Path()..moveTo(0, 350)..quadraticBezierTo(140, 300, 260, 330)..quadraticBezierTo(520, 300, 820, 330)..quadraticBezierTo(1000, 320, 1200, 312)..lineTo(1200, 380)..lineTo(0, 380)..close(), _p(_mix(TvColors.marcaTurquesa, Colors.white, 0.35))); // Cordillera lejana
    _palabra(c, 'pacifico', 330); // Detrás de los volcanes
    c.drawPath(Path()..moveTo(300, 372)..cubicTo(380, 300, 430, 170, 478, 122)..cubicTo(492, 110, 506, 112, 518, 124)..cubicTo(566, 176, 612, 300, 690, 372)..close(), _p(_mix(TvColors.marcaProfundo, TvColors.marcaVerde, 0.85))); // Volcán de cono alto
    c.drawPath(Path()..moveTo(640, 372)..cubicTo(690, 300, 730, 220, 790, 205)..cubicTo(850, 192, 902, 280, 980, 372)..close(), _p(_mix(TvColors.marcaVerde, TvColors.marcaProfundo, 0.75))); // Volcán redondeado
    c.drawRect(const Rect.fromLTWH(0, 380, 1200, 180), Paint()..shader = LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [_mix(TvColors.marcaTurquesa, TvColors.bandAnil, 0.7), TvColors.bandAnil]).createShader(const Rect.fromLTWH(0, 380, 1200, 180))); // Lago
    final ola = Paint()
      ..color = TvColors.bandMarfil.withValues(alpha: 0.5) // Ondas claras
      ..style = PaintingStyle.stroke // Solo trazo
      ..strokeWidth = 2; // Finas
    for (var i = 0; i < 4; i++) {
      final y = 410.0 + i * 32; // Altura de la onda
      c.drawPath(Path()..moveTo(620.0 + i * 70, y)..relativeQuadraticBezierTo(30, -8, 60, 0)..relativeQuadraticBezierTo(30, 8, 60, 0), ola); // Onda
    }
    c.drawPath(Path()..moveTo(0, 470)..cubicTo(160, 450, 300, 500, 420, 560)..lineTo(0, 560)..close(), _p(_mix(TvColors.bandMaiz, TvColors.bandMarfil, 0.45))); // Orilla de arena
    _aves(c, 250, 150, TvColors.marcaProfundo); // Aves
  }

  void _norte(Canvas c) {
    _cielo(c, _mix(TvColors.musgo, Colors.white, 0.35), _mix(TvColors.bandMaiz, Colors.white, 0.25)); // Cielo de montaña
    c.drawCircle(const Offset(300, 190), 46, _p(TvColors.bandMaiz.withValues(alpha: 0.9))); // Sol entre la bruma
    final neblina = Paint()..color = Colors.white.withValues(alpha: 0.55); // Neblina
    c.drawPath(Path()..moveTo(0, 300)..quadraticBezierTo(120, 220, 260, 260)..quadraticBezierTo(520, 200, 800, 250)..quadraticBezierTo(1000, 230, 1200, 220)..lineTo(1200, 560)..lineTo(0, 560)..close(), _p(_mix(TvColors.musgo, Colors.white, 0.55))); // Cerros lejanos
    c.drawRect(const Rect.fromLTWH(0, 280, 1200, 50), neblina); // Neblina
    _palabra(c, 'norte', 345); // Entre los cerros lejanos y los medios
    c.drawPath(Path()..moveTo(0, 360)..quadraticBezierTo(160, 280, 330, 330)..quadraticBezierTo(700, 280, 1000, 320)..quadraticBezierTo(1100, 300, 1200, 290)..lineTo(1200, 560)..lineTo(0, 560)..close(), _p(TvColors.musgo)); // Cerros medios
    c.drawRect(const Rect.fromLTWH(0, 360, 1200, 50), neblina); // Segunda neblina
    c.drawPath(Path()..moveTo(0, 430)..quadraticBezierTo(200, 350, 420, 400)..quadraticBezierTo(860, 360, 1200, 400)..lineTo(1200, 560)..lineTo(0, 560)..close(), _p(TvColors.marcaVerde)); // Ladera cercana
    final pinos = _p(TvColors.zonaNorte); // Verde oscuro de montaña
    c.drawPath(Path()..moveTo(0, 500)..quadraticBezierTo(300, 450, 600, 490)..quadraticBezierTo(900, 500, 1200, 470)..lineTo(1200, 560)..lineTo(0, 560)..close(), pinos); // Primer plano
    for (final a in [[70.0, 520.0, 150.0], [150.0, 515.0, 110.0], [990.0, 505.0, 170.0], [1090.0, 512.0, 130.0], [1160.0, 520.0, 95.0]]) {
      final x = a[0], b = a[1], h = a[2]; // Posición y alto del pino
      c.drawPath(Path()..moveTo(x, b - h)..lineTo(x - h * 0.28, b - h * 0.45)..lineTo(x - h * 0.14, b - h * 0.45)..lineTo(x - h * 0.36, b)..lineTo(x + h * 0.36, b)..lineTo(x + h * 0.14, b - h * 0.45)..lineTo(x + h * 0.28, b - h * 0.45)..close(), pinos); // Pino de dos pisos
    }
    _aves(c, 820, 160, TvColors.zonaNorte); // Aves sobre el valle
  }

  void _caribe(Canvas c) {
    _cielo(c, _mix(TvColors.caribe, Colors.white, 0.45), _mix(TvColors.bandMarfil, Colors.white, 0.9)); // Cielo del Caribe
    final nube = _p(Colors.white.withValues(alpha: 0.9)); // Nubes
    c.drawRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(180, 140, 140, 50), const Radius.circular(25)), nube); // Nube
    c.drawCircle(const Offset(230, 140), 32, nube); // Copete de la nube
    c.drawRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(760, 100, 110, 40), const Radius.circular(20)), nube); // Otra nube
    c.drawRect(const Rect.fromLTWH(0, 300, 1200, 260), Paint()..shader = LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [TvColors.caribe, _mix(TvColors.marcaTurquesa, TvColors.bandAnil, 0.8)]).createShader(const Rect.fromLTWH(0, 300, 1200, 260))); // Mar
    _palabra(c, 'caribe', 330); // Sobre el horizonte, detrás de los cayos
    c.drawOval(Rect.fromCenter(center: const Offset(840, 318), width: 240, height: 28), _p(_mix(TvColors.bandMaiz, TvColors.bandMarfil, 0.4))); // Cayo lejano
    c.drawPath(Path()..moveTo(430, 352)..lineTo(500, 352)..lineTo(490, 364)..lineTo(438, 364)..close()..moveTo(462, 352)..lineTo(462, 326)..lineTo(480, 348)..close(), _p(TvColors.marcaProfundo)); // Panga
    c.drawPath(Path()..moveTo(720, 560)..cubicTo(780, 470, 960, 440, 1200, 450)..lineTo(1200, 560)..close(), _p(_mix(TvColors.bandMaiz, TvColors.bandMarfil, 0.45))); // Playa cercana
    for (final a in [[810.0, 314.0, 0.7], [870.0, 316.0, 0.55], [1020.0, 470.0, 1.4], [1120.0, 462.0, 1.1]]) {
      final x = a[0], y = a[1], s = a[2]; // Posición y tamaño de la palmera
      c.drawPath(Path()..moveTo(x, y)..quadraticBezierTo(x + 8 * s, y - 40 * s, x - 6 * s, y - 90 * s), Paint()..color = TvColors.marcaProfundo..style = PaintingStyle.stroke..strokeWidth = 6 * s..strokeCap = StrokeCap.round); // Tronco
      for (final h in [[-60.0, -6.0], [-34.0, 26.0], [40.0, -10.0], [54.0, 22.0], [4.0, -40.0]]) {
        final ox = x - 6 * s, oy = y - 90 * s; // Copa
        c.drawPath(Path()..moveTo(ox, oy)..quadraticBezierTo(ox + h[0] * 0.5 * s, oy + (h[1] - 30) * s * 0.5, ox + h[0] * s, oy + h[1] * s), Paint()..color = TvColors.marcaVerde..style = PaintingStyle.stroke..strokeWidth = 5 * s..strokeCap = StrokeCap.round); // Hoja
      }
    }
    _aves(c, 520, 170, TvColors.marcaProfundo); // Pelícanos
  }

  @override
  bool shouldRepaint(_PintorPortada old) => old.avance != avance || old.escena != escena || old.fundido != fundido || old.fondo != fondo || old.palabras['pacifico'] != palabras['pacifico']; // Solo si algo cambió
}

/// Recorte con forma de brochazos que se pintan de izquierda a derecha al llegar.
class _Ventana extends CustomClipper<Path> {
  _Ventana(this.bandas, this.avance) : super(reclip: avance); // Se recalcula mientras se pinta
  final List<Path> bandas; // Brochazos en el lienzo de 1200 × 560
  final Animation<double> avance; // 0 a 1

  @override
  Path getClip(Size size) {
    final ventana = Path(); // Unión de bandas
    final sx = size.width / 1200, sy = size.height / 560; // Escala del lienzo a la pantalla
    for (var i = 0; i < bandas.length; i++) {
      final t = ((avance.value * 1.6) - i * 0.08).clamp(0.0, 1.0); // Cada banda empieza un poco después
      if (t <= 0) continue; // Aún no se pinta
      final b = bandas[i].getBounds(); // Rectángulo de la banda
      final e = Curves.easeOutCubic.transform(t); // Cuánto se estiró
      final m = Float64List.fromList([sx * e, 0, 0, 0, 0, sy, 0, 0, 0, 0, 1, 0, sx * b.left * (1 - e), 0, 0, 1]); // Escala a pantalla y estira desde el borde izquierdo
      ventana.addPath(bandas[i].transform(m), Offset.zero); // Agrega la banda
    }
    return ventana; // Forma final
  }

  @override
  bool shouldReclip(_Ventana old) => old.bandas != bandas; // Cambia solo con otra forma (la animación ya avisa)
}

/// Desvanecido hacia el lienzo abajo a la izquierda: ahí se apoya el eslogan.
class _Desvanecido extends CustomPainter {
  _Desvanecido(this.fondo); // Constructor
  final Color fondo; // Color del lienzo

  @override
  void paint(Canvas canvas, Size size) {
    final centro = Offset(size.width * 0.275, size.height * 1.14); // Abajo a la izquierda, como en la web
    final rect = Rect.fromCenter(center: centro, width: size.width * 1.17, height: size.height * 1.07); // Óvalo
    canvas.drawRect(Offset.zero & size, Paint()..shader = RadialGradient(colors: [fondo, fondo, fondo.withValues(alpha: 0)], stops: const [0, 0.55, 1]).createShader(rect)); // Desvanecido
  }

  @override
  bool shouldRepaint(_Desvanecido old) => old.fondo != fondo; // Solo si cambia el tema
}
