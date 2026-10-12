import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nica_app/core/theme.dart';

void main() {
  test('tema claro y oscuro usan los tokens territoriales', () {
    expect(buildTheme(Brightness.light).colorScheme.primary, territorio700);
    expect(buildTheme(Brightness.dark).colorScheme.primary, oro400);
  });
}
