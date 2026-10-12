import 'package:flutter/widgets.dart'; // BuildContext y Localizations

import 'strings.g.dart'; // Textos generados desde content/i18n

/// Código de idioma de la plataforma a partir del idioma del teléfono ("zh" se muestra en chino simplificado).
String i18nCode(Locale locale) {
  if (locale.languageCode == 'zh') return 'zh-Hans'; // Chino: usamos los textos en simplificado
  return i18nStrings.containsKey(locale.languageCode) ? locale.languageCode : 'es'; // Idioma conocido o español
}

/// Texto traducido con sus {variables} reemplazadas; si falta en ese idioma, usa el español.
String tr(String code, String key, [Map<String, Object> vars = const {}]) {
  final raw = i18nStrings[code]?[key] ?? i18nStrings['es']![key] ?? key; // Texto del idioma, el original o la clave
  return raw.replaceAllMapped(RegExp(r'\{([A-Za-z0-9_]+)\}'), (m) => vars.containsKey(m.group(1)) ? '${vars[m.group(1)]}' : m.group(0)!); // Reemplaza variables
}

/// Atajos desde cualquier pantalla: context.t('clave').
extension TrContext on BuildContext {
  /// Código del idioma actual.
  String get langCode => i18nCode(Localizations.localeOf(this)); // Idioma de la plataforma

  /// Texto traducido en el idioma actual.
  String t(String key, [Map<String, Object> vars = const {}]) => tr(langCode, key, vars); // Traduce

  /// Traduce si el texto es una clave conocida; si no (una marca o un texto de la base de datos), lo deja igual.
  String tk(String s) => i18nStrings['es']!.containsKey(s) ? t(s) : s; // Clave o texto tal cual
}
