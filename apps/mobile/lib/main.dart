import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/env.dart';
import 'core/theme.dart';
import 'features/territories/presentation/territories_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
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

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Nicaragua',
      theme: buildTheme(Brightness.light),
      darkTheme: buildTheme(Brightness.dark),
      themeMode: ThemeMode.system,
      home: const TerritoriesScreen(),
    );
  }
}
