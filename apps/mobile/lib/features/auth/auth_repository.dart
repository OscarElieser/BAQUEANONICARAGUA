import 'dart:convert'; // Leer respuestas JSON

import 'package:firebase_auth/firebase_auth.dart'; // Autenticación de Firebase (correo, Google, sesión)
import 'package:firebase_core/firebase_core.dart'; // Saber si Firebase quedó inicializado
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Gestión de estado con Riverpod
import 'package:google_sign_in/google_sign_in.dart'; // Ventana nativa de Android para elegir cuenta de Google
import 'package:http/http.dart' as http; // Peticiones HTTP a la función de Supabase

import '../../core/env.dart'; // Direcciones configuradas en la compilación (API, Supabase)

/// Escucha la sesión: emite el usuario al entrar y null al salir.
final authStateProvider = StreamProvider<User?>((ref) {
  if (Firebase.apps.isEmpty) return Stream.value(null); // Sin Firebase configurado: nadie tiene sesión
  return FirebaseAuth.instance.authStateChanges(); // Flujo de cambios de sesión de Firebase
});

/// Repositorio único de autenticación para toda la app.
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(FirebaseAuth.instance, GoogleSignIn()); // Instancia con Firebase y Google
});

/// Error de autenticación con mensaje ya traducido al español.
class AuthFailure implements Exception {
  const AuthFailure(this.message); // Guarda el mensaje legible
  final String message; // Texto que verá el usuario

  @override
  String toString() => message; // Al imprimir el error se ve el mensaje
}

class AuthRepository {
  AuthRepository(this._auth, this._google); // Recibe las dependencias para poder probarlas

  final FirebaseAuth _auth; // Servicio de autenticación de Firebase
  final GoogleSignIn _google; // Servicio de inicio con Google

  /// Traduce los códigos de error de Firebase a mensajes claros.
  static String messageFor(FirebaseAuthException e) {
    switch (e.code) {
      // Elegimos el mensaje según el código del error
      case 'invalid-email':
        return 'El correo no tiene un formato válido.'; // Correo mal escrito
      case 'invalid-credential':
      case 'wrong-password':
      case 'user-not-found':
        return 'El correo o la contraseña no coinciden.'; // No revelamos cuál de los dos falló
      case 'user-disabled':
        return 'Esta cuenta está desactivada. Escribe a soporte si crees que es un error.'; // Cuenta suspendida en Firebase
      case 'email-already-in-use':
        return 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.'; // Correo ya registrado
      case 'weak-password':
        return 'La contraseña debe tener al menos 8 caracteres.'; // Contraseña muy corta
      case 'too-many-requests':
        return 'Demasiados intentos. Espera unos minutos y vuelve a intentar.'; // Bloqueo temporal por seguridad
      case 'network-request-failed':
        return 'Sin conexión. Revisa tu internet e intenta de nuevo.'; // Falla de red
      default:
        return 'No se pudo completar. Intenta de nuevo.'; // Cualquier otro caso
    }
  }

  /// Llama a la función de Supabase "preparar-sesion": verifica el token, crea el perfil si es la primera vez
  /// y, si el token aún no trae el rol que Supabase necesita, lo agrega; entonces pedimos un token nuevo.
  Future<void> _prepararSesion(User user) async {
    if (Env.supabaseUrl.isEmpty || Env.supabasePublishableKey.isEmpty) return; // Sin Supabase configurado no hay perfil que crear
    final token = await user.getIdToken(); // Token actual de Firebase
    if (token == null) return; // Sin token no se puede continuar (no debería pasar con sesión abierta)
    final res = await http.post(
      Uri.parse('${Env.supabaseUrl}/functions/v1/preparar-sesion'), // Función de Supabase
      headers: {'Authorization': 'Bearer $token', 'apikey': Env.supabasePublishableKey}, // Token de Firebase y clave pública
    );
    if (res.statusCode == 403) {
      // Cuenta suspendida o eliminada
      await signOut(); // Cerramos la sesión para no dejarla a medias
      throw const AuthFailure('Esta cuenta está suspendida. Escribe a soporte si crees que es un error.'); // Mensaje claro
    }
    if (res.statusCode >= 300) {
      // La función respondió con error: lo informamos tal cual, sin ocultarlo
      throw const AuthFailure('Tu sesión se abrió, pero no pudimos preparar tu perfil. Intenta de nuevo en un momento.');
    }
    final body = jsonDecode(res.body) as Map<String, dynamic>; // Respuesta de la función
    if (body['needs_refresh'] == true) await user.getIdToken(true); // El rol se acaba de agregar: token nuevo que ya lo trae
  }

  /// Inicia sesión con correo y contraseña.
  Future<void> signIn(String email, String password) async {
    try {
      final cred = await _auth.signInWithEmailAndPassword(email: email.trim(), password: password); // Comprueba las credenciales
      await _prepararSesion(cred.user!); // Prepara rol y perfil
    } on FirebaseAuthException catch (e) {
      throw AuthFailure(messageFor(e)); // Convierte el error a un mensaje en español
    }
  }

  /// Crea una cuenta, guarda el nombre y envía el correo de verificación.
  Future<void> signUp(String name, String email, String password) async {
    if (password.length < 8) throw const AuthFailure('La contraseña debe tener al menos 8 caracteres.'); // Mínimo de seguridad
    try {
      final cred = await _auth.createUserWithEmailAndPassword(email: email.trim(), password: password); // Crea la cuenta
      final user = cred.user!; // Usuario recién creado
      final trimmed = name.trim(); // Nombre sin espacios sobrantes
      await user.updateDisplayName(trimmed.length > 80 ? trimmed.substring(0, 80) : trimmed); // Guarda el nombre (máximo 80 caracteres)
      await user.sendEmailVerification(); // Envía el correo de verificación
      await _prepararSesion(user); // Prepara rol y perfil
    } on FirebaseAuthException catch (e) {
      throw AuthFailure(messageFor(e)); // Mensaje en español
    }
  }

  /// Inicia sesión con Google usando el selector nativo de cuentas.
  Future<void> signInWithGoogle() async {
    try {
      final account = await _google.signIn(); // Abre el selector de cuentas de Google
      if (account == null) return; // La persona cerró el selector: no es un error
      final tokens = await account.authentication; // Obtiene los tokens de Google
      final credential = GoogleAuthProvider.credential(
        accessToken: tokens.accessToken, // Token de acceso de Google
        idToken: tokens.idToken, // Token de identidad de Google
      );
      final cred = await _auth.signInWithCredential(credential); // Inicia sesión en Firebase con esos tokens
      await _prepararSesion(cred.user!); // Prepara rol y perfil
    } on FirebaseAuthException catch (e) {
      throw AuthFailure(messageFor(e)); // Mensaje en español
    }
  }

  /// Envía el correo para cambiar la contraseña (sin revelar si el correo existe).
  Future<void> resetPassword(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email.trim()); // Firebase envía el enlace
    } on FirebaseAuthException catch (e) {
      if (e.code == 'user-not-found') return; // No revelamos si la cuenta existe
      throw AuthFailure(messageFor(e)); // Otros errores sí se informan
    }
  }

  /// Reenvía el correo de verificación al usuario con sesión.
  Future<void> resendVerification() async {
    final user = _auth.currentUser; // Usuario con sesión
    if (user == null) throw const AuthFailure('Inicia sesión primero.'); // Sin sesión no hay a quién enviarlo
    await user.sendEmailVerification(); // Envía el correo
  }

  /// Cierra la sesión en Firebase y en Google.
  Future<void> signOut() async {
    await _google.signOut(); // Olvida la cuenta de Google elegida para que la próxima vez pregunte
    await _auth.signOut(); // Cierra la sesión de Firebase
  }
}
