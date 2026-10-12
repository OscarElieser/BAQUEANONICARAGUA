import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nica_app/core/theme.dart';

void main() {
  test('tema claro usa verde territorial como acento y bruma como fondo', () {
    final t = buildTheme(Brightness.light, webFonts: false);
    expect(t.colorScheme.primary, territorio700);
    expect(t.scaffoldBackgroundColor, TvColors.light.ground);
  });

  test('tema oscuro usa oro como acento y verde territorial como fondo', () {
    final t = buildTheme(Brightness.dark, webFonts: false);
    expect(t.colorScheme.primary, oro400);
    expect(t.scaffoldBackgroundColor, const Color(0xFF0D5448));
  });

  test('los botones cumplen el objetivo táctil mínimo', () {
    final t = buildTheme(Brightness.dark, webFonts: false);
    final size = t.filledButtonTheme.style!.minimumSize!.resolve({})!;
    expect(size.height, greaterThanOrEqualTo(TvSpace.touchMin));
  });
}
