import 'package:flutter/material.dart';

// Tokens provisionales compartidos con la web (ver apps/web/src/app/globals.css).
const selva900 = Color(0xFF071C1B);
const territorio700 = Color(0xFF0D5448);
const oro400 = Color(0xFFE4B063);
const marfil50 = Color(0xFFF2EFE5);
const terracota500 = Color(0xFFC65F3E);

ThemeData buildTheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final scheme = ColorScheme.fromSeed(
    seedColor: territorio700,
    brightness: brightness,
    primary: dark ? oro400 : territorio700,
    secondary: terracota500,
    surface: dark ? selva900 : marfil50,
  );
  return ThemeData(colorScheme: scheme, useMaterial3: true);
}
