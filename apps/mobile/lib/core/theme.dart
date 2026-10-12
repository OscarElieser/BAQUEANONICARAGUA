import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Tokens "Territorios vivos" (espejo de apps/web/src/app/globals.css y docs/DESIGN_SYSTEM.md).
@immutable
class TvColors extends ThemeExtension<TvColors> {
  const TvColors({
    required this.ground,
    required this.groundRaised,
    required this.groundDeep,
    required this.ink,
    required this.inkMuted,
    required this.accent,
    required this.oroText,
    required this.line,
    required this.controlBorder,
    required this.focus,
    required this.statusVerified,
    required this.statusAlert,
  });

  final Color ground, groundRaised, groundDeep, ink, inkMuted, accent, oroText, line,
      controlBorder, focus, statusVerified, statusAlert;

  // Fijos
  static const oro = Color(0xFFE4B063);
  static const onOro = Color(0xFF071C1B);
  static const terracota = Color(0xFFC65F3E);
  static const bandAnil = Color(0xFF22306B);
  static const bandAchiote = Color(0xFFC23B22);
  static const bandMaiz = Color(0xFFE9B84A);
  static const bandVerde = Color(0xFF2E7D6B);
  static const bandMarfil = Color(0xFFF2EFE5);
  static const zonaPacifico = Color(0xFF2A1612); // Portadas del Pacífico volcánico (ceniza)
  static const zonaNorte = Color(0xFF0F3229); // Portadas del Centro-norte (neblina de montaña)
  static const musgo = Color(0xFF8DB89A); // Curvas de las portadas del Centro-norte
  static const caribe = Color(0xFF4FB8B0); // Curvas de las portadas del Caribe y Río San Juan
  static const barro = Color(0xFF9A4A2C); // Barro de San Juan de Oriente: mundo de Cultura

  static const dark = TvColors(
    ground: Color(0xFF0D5448),
    groundRaised: Color(0xFF0A4339),
    groundDeep: Color(0xFF071C1B),
    ink: Color(0xFFF2EFE5),
    inkMuted: Color(0xFFC9D8D0),
    accent: Color(0xFFE9BB74),
    oroText: Color(0xFFE9BB74),
    line: Color(0xFF1F6355),
    controlBorder: Color(0xFF7DB0A4),
    focus: Color(0xFFE4B063),
    statusVerified: Color(0xFF9FD9C2),
    statusAlert: Color(0xFFF5B49A),
  );

  static const light = TvColors(
    ground: Color(0xFFE6EEE9),
    groundRaised: Color(0xFFFFFFFF),
    groundDeep: Color(0xFFD5E2DB),
    ink: Color(0xFF071C1B),
    inkMuted: Color(0xFF3C5550),
    accent: Color(0xFF0D5448),
    oroText: Color(0xFF8A5A12),
    line: Color(0xFFB9CCC3),
    controlBorder: Color(0xFF6B8780),
    focus: Color(0xFF8A5A12),
    statusVerified: Color(0xFF1E6B52),
    statusAlert: Color(0xFFA8442A),
  );

  @override
  TvColors copyWith() => this;

  @override
  TvColors lerp(TvColors? other, double t) {
    if (other == null) return this;
    Color l(Color a, Color b) => Color.lerp(a, b, t)!;
    return TvColors(
      ground: l(ground, other.ground),
      groundRaised: l(groundRaised, other.groundRaised),
      groundDeep: l(groundDeep, other.groundDeep),
      ink: l(ink, other.ink),
      inkMuted: l(inkMuted, other.inkMuted),
      accent: l(accent, other.accent),
      oroText: l(oroText, other.oroText),
      line: l(line, other.line),
      controlBorder: l(controlBorder, other.controlBorder),
      focus: l(focus, other.focus),
      statusVerified: l(statusVerified, other.statusVerified),
      statusAlert: l(statusAlert, other.statusAlert),
    );
  }
}

extension TvContext on BuildContext {
  TvColors get tv => Theme.of(this).extension<TvColors>()!;
}

class TvSpace {
  static const s1 = 4.0, s2 = 8.0, s3 = 12.0, s4 = 16.0, s6 = 24.0, s8 = 32.0, s12 = 48.0, s16 = 64.0;
  static const touchMin = 44.0, controlHeight = 52.0;
  static const radiusS = 8.0, radiusM = 18.0;
}

/// Mantenido por compatibilidad con pruebas existentes.
const territorio700 = Color(0xFF0D5448);
const oro400 = TvColors.oro;

/// Letra de titulares propia de cada sección ("mundos"), igual que en la web.
class LetrasMundo extends ThemeExtension<LetrasMundo> {
  const LetrasMundo({required this.comunidad, required this.aventura, required this.cultura}); // Constructor
  final TextStyle comunidad; // Bricolage Grotesque
  final TextStyle aventura; // Anybody (en maíz, sobre añil)
  final TextStyle cultura; // Caprasimo

  @override
  LetrasMundo copyWith({TextStyle? comunidad, TextStyle? aventura, TextStyle? cultura}) =>
      LetrasMundo(comunidad: comunidad ?? this.comunidad, aventura: aventura ?? this.aventura, cultura: cultura ?? this.cultura); // Copia con cambios

  @override
  LetrasMundo lerp(LetrasMundo? other, double t) => other == null
      ? this
      : LetrasMundo(comunidad: TextStyle.lerp(comunidad, other.comunidad, t)!, aventura: TextStyle.lerp(aventura, other.aventura, t)!, cultura: TextStyle.lerp(cultura, other.cultura, t)!); // Transición entre temas
}

/// [webFonts] = false en pruebas (sin red): usa las fuentes del sistema con los mismos tamaños.
ThemeData buildTheme(Brightness brightness, {bool webFonts = true}) {
  final dark = brightness == Brightness.dark;
  final c = dark ? TvColors.dark : TvColors.light;

  final base = webFonts ? GoogleFonts.atkinsonHyperlegibleTextTheme() : ThemeData(brightness: brightness).textTheme;
  final text = base.apply(bodyColor: c.ink, displayColor: c.ink);
  TextStyle display(double size, double height) => webFonts
      ? GoogleFonts.youngSerif(fontSize: size, height: height, color: c.ink, fontWeight: FontWeight.w400)
      : TextStyle(fontFamily: 'serif', fontSize: size, height: height, color: c.ink);
  TextStyle label(double size, {Color? color}) => webFonts
      ? GoogleFonts.atkinsonHyperlegible(fontSize: size, fontWeight: FontWeight.w700, color: color)
      : TextStyle(fontSize: size, fontWeight: FontWeight.w700, color: color);

  final scheme = ColorScheme(
    brightness: brightness,
    primary: dark ? TvColors.oro : c.accent,
    onPrimary: dark ? TvColors.onOro : c.groundRaised,
    secondary: TvColors.oro,
    onSecondary: TvColors.onOro,
    error: c.statusAlert,
    onError: dark ? TvColors.onOro : Colors.white,
    surface: c.ground,
    onSurface: c.ink,
    surfaceContainer: c.groundRaised,
    outline: c.controlBorder,
    outlineVariant: c.line,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    scaffoldBackgroundColor: c.ground,
    extensions: [
      c, // Colores del sistema de diseño
      LetrasMundo(
        comunidad: webFonts ? GoogleFonts.getFont('Bricolage Grotesque', fontWeight: FontWeight.w800, color: c.ink, height: 0.98) : TextStyle(fontWeight: FontWeight.w800, color: c.ink, height: 0.98), // Comunidad: grotesca cálida
        aventura: webFonts ? GoogleFonts.getFont('Anybody', fontWeight: FontWeight.w800, color: TvColors.bandMaiz, height: 0.98) : const TextStyle(fontWeight: FontWeight.w800, color: TvColors.bandMaiz, height: 0.98), // Mi aventura: rótulo de bus
        cultura: webFonts ? GoogleFonts.getFont('Caprasimo', color: c.ink, height: 1) : TextStyle(fontFamily: 'serif', color: c.ink, height: 1), // Cultura: cartel popular
      ),
    ],
    textTheme: text.copyWith(
      displayLarge: display(44, 0.98),
      displayMedium: display(34, 1.06),
      displaySmall: display(26, 1.15),
      titleMedium: text.titleMedium?.copyWith(fontSize: 20, height: 1.4, fontWeight: FontWeight.w700),
      bodyLarge: text.bodyLarge?.copyWith(fontSize: 19, height: 1.58),
      bodyMedium: text.bodyMedium?.copyWith(fontSize: 16, height: 1.56),
      labelLarge: text.labelLarge?.copyWith(fontSize: 15, fontWeight: FontWeight.w700),
      bodySmall: text.bodySmall?.copyWith(fontSize: 14, height: 1.43, color: c.inkMuted),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: TvColors.oro,
        foregroundColor: TvColors.onOro,
        minimumSize: const Size(TvSpace.touchMin, TvSpace.controlHeight),
        shape: const StadiumBorder(),
        textStyle: label(15),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: c.ink,
        side: BorderSide(color: c.controlBorder, width: 1.5),
        minimumSize: const Size(TvSpace.touchMin, TvSpace.controlHeight),
        shape: const StadiumBorder(),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: c.groundRaised,
      indicatorColor: Colors.transparent,
      labelTextStyle: WidgetStateProperty.resolveWith(
        (s) => label(12, color: s.contains(WidgetState.selected) ? (dark ? TvColors.oro : c.accent) : c.ink),
      ),
      iconTheme: WidgetStateProperty.resolveWith(
        (s) => IconThemeData(color: s.contains(WidgetState.selected) ? (dark ? TvColors.oro : c.accent) : c.ink),
      ),
    ),
    dividerTheme: DividerThemeData(color: c.line, thickness: 1, space: 1),
  );
}
