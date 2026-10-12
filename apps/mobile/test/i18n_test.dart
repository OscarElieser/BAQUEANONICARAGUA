import 'package:flutter/widgets.dart'; // Locale
import 'package:flutter_test/flutter_test.dart'; // Herramientas de pruebas
import 'package:nica_app/core/i18n/strings.g.dart'; // Textos generados
import 'package:nica_app/core/i18n/t.dart'; // Funciones a probar

void main() {
  test('los 10 idiomas tienen las mismas claves que el español', () {
    final base = i18nStrings['es']!.keys.toSet(); // Claves del original
    expect(i18nStrings.keys.toSet(), {'es', 'en', 'zh-Hans', 'ko', 'it', 'fr', 'pt', 'de', 'ru', 'ja'}); // Los 10 idiomas
    for (final entry in i18nStrings.entries) {
      // Cada idioma
      expect(entry.value.keys.toSet(), base, reason: entry.key); // Mismas claves
    }
  });

  test('variables reemplazadas y respaldo en español', () {
    expect(tr('es', 'community.interactions', {'reactions': 3, 'comments': 1}), '3 reacciones, 1 comentarios'); // Variables
    expect(tr('ja', 'planner.total', {'amount': '¥100'}), '合計 ¥100'); // Variable en japonés
    expect(tr('xx', 'nav.discover'), 'Descubrir'); // Idioma desconocido: español
  });

  test('el chino del teléfono usa los textos en chino simplificado', () {
    expect(i18nCode(const Locale('zh', 'CN')), 'zh-Hans'); // Chino
    expect(i18nCode(const Locale('pt', 'BR')), 'pt'); // Portugués de Brasil
    expect(i18nCode(const Locale('sw')), 'es'); // Idioma no disponible: español
  });

  test('solo el español es original; los demás están marcados para revisión', () {
    expect(i18nStatus['es'], 'source'); // Original
    expect(i18nStatus.entries.where((e) => e.key != 'es').every((e) => e.value == 'needs_review' || e.value == 'approved'), isTrue); // Estado honesto
  });
}
