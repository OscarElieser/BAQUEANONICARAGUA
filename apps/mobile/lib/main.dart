import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/env.dart';
import 'core/theme.dart';
import 'features/home/home_shell.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting();
  // google-services.json se agrega localmente por entorno (no se versiona).
  await Firebase.initializeApp();

  // Supabase usa el ID token de Firebase (Third-Party Auth). Solo clave publicable.
  await Supabase.initialize(
    url: Env.supabaseUrl,
    anonKey: Env.supabasePublishableKey,
    accessToken: () async => FirebaseAuth.instance.currentUser?.getIdToken(),
  );

  runApp(const ProviderScope(child: NicaApp()));
}

class NicaApp extends StatelessWidget {
  const NicaApp({super.key});

  // Idiomas iniciales (sección 18); textos traducidos llegan en la Fase 9.
  static const supported = [
    Locale('es'), Locale('en'), Locale.fromSubtags(languageCode: 'zh', scriptCode: 'Hans'),
    Locale('ko'), Locale('it'), Locale('fr'), Locale('pt'), Locale('de'), Locale('ru'), Locale('ja'),
  ];

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Nicaragua',
      theme: buildTheme(Brightness.light),
      darkTheme: buildTheme(Brightness.dark),
      themeMode: ThemeMode.system,
      supportedLocales: supported,
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      home: const HomeShell(),
    );
  }
}
