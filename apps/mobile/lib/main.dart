import 'package:firebase_auth/firebase_auth.dart'; // Sesión de Firebase (token para Supabase)
import 'package:firebase_core/firebase_core.dart'; // Arranque de Firebase
import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_localizations/flutter_localizations.dart'; // Textos del sistema en cada idioma
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod
import 'package:intl/date_symbol_data_local.dart'; // Formatos de fecha por idioma
import 'package:supabase_flutter/supabase_flutter.dart'; // Cliente de Supabase

import 'core/data/fotos.dart'; // Fotos reales con licencia libre
import 'core/env.dart'; // Variables de configuración de entorno
import 'core/firebase_options.dart'; // Opciones de configuración de Firebase
import 'core/theme.dart'; // Estilos y tema del sistema de diseño
import 'features/home/home_shell.dart'; // Estructura visual de inicio
import 'features/intro/intro_revelacion.dart'; // Revelación del logotipo al abrir la app

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized(); // Garantiza la inicialización de los enlaces del framework
  await initializeDateFormatting(); // Carga las configuraciones de fechas regionales
  await FotosReales.cargar(); // Catálogo de fotos reales (si falta, se usan ilustraciones)
  // google-services.json se agrega localmente por entorno (no se versiona).
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform, // Inicia Firebase con las opciones del proyecto
    );
  } catch (e) {
    debugPrint('Firebase sin configurar: el inicio de sesión mostrará "No disponible todavía" ($e)'); // Sin configuración la app sigue abriendo
  }

  if (Env.isSupabaseConfigured) {
    // Supabase usa el ID token de Firebase (Third-Party Auth). Solo clave publicable.
    await Supabase.initialize(
      url: Env.supabaseUrl, // Proyecto de Supabase
      anonKey: Env.supabasePublishableKey, // Clave pública
      accessToken: () async => Firebase.apps.isEmpty ? null : FirebaseAuth.instance.currentUser?.getIdToken(), // Token de la sesión (o visitante anónimo)
    );
  }

  runApp(const ProviderScope(child: NicaApp())); // Arranca la app con Riverpod
}

class NicaApp extends StatelessWidget {
  const NicaApp({super.key}); // Constructor

  // Los 10 idiomas de la interfaz (los mismos de la web)
  static const supported = [
    Locale('es'), Locale('en'), Locale.fromSubtags(languageCode: 'zh', scriptCode: 'Hans'), // Español, inglés y chino simplificado
    Locale('ko'), Locale('it'), Locale('fr'), Locale('pt'), Locale('de'), Locale('ru'), Locale('ja'), // Coreano, italiano, francés, portugués, alemán, ruso y japonés
  ];

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BAQUEANO', // Nombre de la app en la lista de apps recientes
      theme: buildTheme(Brightness.light), // Tema claro
      darkTheme: buildTheme(Brightness.dark), // Tema oscuro
      themeMode: ThemeMode.system, // Sigue el modo del teléfono
      supportedLocales: supported, // Idiomas disponibles
      localizationsDelegates: GlobalMaterialLocalizations.delegates, // Textos del sistema en cada idioma
      builder: (context, child) => IntroRevelacion(child: child ?? const SizedBox.shrink()), // Revelación del logotipo encima mientras la app carga
      home: const HomeShell(), // Pantalla principal con sus pestañas
    );
  }
}
