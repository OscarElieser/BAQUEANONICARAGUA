import 'package:firebase_core/firebase_core.dart' show FirebaseOptions; // Clase de configuración de Firebase
import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb, TargetPlatform; // Identificación de la plataforma de ejecución

/// Opciones de inicialización de Firebase para Baqueano Nicaragua.
class DefaultFirebaseOptions {
  /// Retorna la configuración adecuada según la plataforma activa (Android o Web).
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web; // Opciones para plataforma Web
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android; // Opciones para Android
      default:
        return web; // Opciones por defecto
    }
  }

  /// Configuración oficial de Firebase para la plataforma Web.
  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyB9Qe0XfaS54ew1IakQSZC_kxg398Lrfrc', // Clave pública de la API de Firebase
    appId: '1:680635942850:web:4e95398ea13e8990e2785b', // Identificador de la app web
    messagingSenderId: '680635942850', // Identificador del remitente de mensajería
    projectId: 'baqueanonicaragua-95755', // Identificador del proyecto en la nube
    authDomain: 'baqueanonicaragua-95755.firebaseapp.com', // Dominio de autenticación de usuarios
    storageBucket: 'baqueanonicaragua-95755.firebasestorage.app', // Depósito de almacenamiento de archivos
    measurementId: 'G-EQ5NPPS80B', // Identificador de analítica y métricas
  );

  /// Configuración oficial de Firebase para la plataforma Android.
  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyB9Qe0XfaS54ew1IakQSZC_kxg398Lrfrc', // Clave pública de la API de Firebase para Android
    appId: '1:680635942850:web:4e95398ea13e8990e2785b', // Identificador de la aplicación en Firebase
    messagingSenderId: '680635942850', // Identificador del remitente de mensajería
    projectId: 'baqueanonicaragua-95755', // Identificador del proyecto en la nube
    storageBucket: 'baqueanonicaragua-95755.firebasestorage.app', // Depósito de almacenamiento de archivos
    measurementId: 'G-EQ5NPPS80B', // Identificador de analítica y métricas
  );
}
