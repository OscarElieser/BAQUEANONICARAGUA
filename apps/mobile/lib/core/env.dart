/// Valores inyectados en compilación:
/// flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_PUBLISHABLE_KEY=... --dart-define=API_URL=...
class Env {
  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://nupjhqrvxjrngtpslfjq.supabase.co', // Proyecto Supabase oficial de Baqueano Nicaragua
  );
  static const supabasePublishableKey = String.fromEnvironment(
    'SUPABASE_PUBLISHABLE_KEY',
    defaultValue: 'sb_publishable_RM56EpgYxprblYCVyXD9Lw_17qwdZPc', // Clave publicable del proyecto oficial (no es secreta: RLS decide qué se ve)
  );
  static const apiUrl = String.fromEnvironment('API_URL'); // Dirección de nuestra API
  static const webUrl = String.fromEnvironment('WEB_URL'); // Dirección de la web (para abrir formularios que aún solo existen allá)

  /// Si Supabase está configurado en esta compilación.
  static bool get isSupabaseConfigured => supabaseUrl.isNotEmpty && supabasePublishableKey.isNotEmpty; // Ambos valores presentes
}
