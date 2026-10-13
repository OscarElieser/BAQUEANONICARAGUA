import 'dart:convert'; // Leer respuestas JSON

import 'package:firebase_auth/firebase_auth.dart'; // Autenticación de Firebase (correo, Google, sesión)
import 'package:firebase_core/firebase_core.dart'; // Saber si Firebase quedó inicializado
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Gestión de estado con Riverpod
import 'package:google_sign_in/google_sign_in.dart'; // Ventana nativa de Android para elegir cuenta de Google
import 'package:http/http.dart' as http; // Peticiones HTTP a la función de Supabase

import '../../core/i18n/t.dart'; // Mensajes en español para los registros
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

/// Error de autenticación con la clave de su mensaje (se traduce al mostrarlo en pantalla).
class AuthFailure implements Exception {
  const AuthFailure(this.key); // Guarda la clave del mensaje
  final String key; // Clave de traducción, por ejemplo 'auth.err.network'

  @override
  String toString() => tr('es', key); // En registros se ve el mensaje en español
}

/// La cuenta tiene verificación en dos pasos: falta el código de la app de autenticación.
class SegundoPasoRequerido implements Exception {
  const SegundoPasoRequerido(this.resolver); // Guarda lo necesario para terminar el inicio
  final MultiFactorResolver resolver; // Datos de Firebase para completar el inicio de sesión
}

class AuthRepository {
  AuthRepository(this._auth, this._google); // Recibe las dependencias para poder probarlas

  final FirebaseAuth _auth; // Servicio de autenticación de Firebase
  final GoogleSignIn _google; // Servicio de inicio con Google

  /// Convierte los códigos de error de Firebase en claves de mensajes claros.
  static String messageFor(FirebaseAuthException e) {
    switch (e.code) {
      // Elegimos el mensaje según el código del error
      case 'invalid-email':
        return 'auth.err.invalid_email'; // Correo mal escrito
      case 'invalid-credential':
      case 'wrong-password':
      case 'user-not-found':
        return 'auth.err.invalid_credential'; // No revelamos cuál de los dos falló
      case 'user-disabled':
        return 'auth.err.user_disabled'; // Cuenta suspendida en Firebase
      case 'email-already-in-use':
        return 'auth.err.email_in_use'; // Correo ya registrado
      case 'weak-password':
        return 'auth.err.weak_password'; // Contraseña muy corta
      case 'too-many-requests':
        return 'auth.err.too_many'; // Bloqueo temporal por seguridad
      case 'network-request-failed':
        return 'auth.err.network'; // Falla de red
      case 'invalid-verification-code':
        return 'dospasos.err.bad_code'; // Código de la app incorrecto o vencido
      case 'invalid-multi-factor-session':
        return 'dospasos.err.expired'; // Pasó demasiado tiempo desde la contraseña
      default:
        return 'auth.err.generic'; // Cualquier otro caso
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
      throw const AuthFailure('auth.err.blocked'); // Cuenta suspendida
    }
    if (res.statusCode >= 300) {
      // La función respondió con error: lo informamos tal cual, sin ocultarlo
      throw const AuthFailure('auth.err.profile_failed'); // No se pudo preparar el perfil
    }
    final body = jsonDecode(res.body) as Map<String, dynamic>; // Respuesta de la función
    if (body['needs_refresh'] == true) await user.getIdToken(true); // El rol se acaba de agregar: token nuevo que ya lo trae
  }

  /// Inicia sesión con correo y contraseña.
  Future<void> signIn(String email, String password) async {
    try {
      final cred = await _auth.signInWithEmailAndPassword(email: email.trim(), password: password); // Comprueba las credenciales
      await _prepararSesion(cred.user!); // Prepara rol y perfil
    } on FirebaseAuthMultiFactorException catch (e) {
      throw SegundoPasoRequerido(e.resolver); // La pantalla pide el código de la app
    } on FirebaseAuthException catch (e) {
      throw AuthFailure(messageFor(e)); // Convierte el error en la clave de su mensaje
    }
  }

  /// Crea una cuenta, guarda el nombre y envía el correo de verificación.
  Future<void> signUp(String name, String email, String password) async {
    if (password.length < 8) throw const AuthFailure('auth.err.weak_password'); // Mínimo de seguridad
    try {
      final cred = await _auth.createUserWithEmailAndPassword(email: email.trim(), password: password); // Crea la cuenta
      final user = cred.user!; // Usuario recién creado
      final trimmed = name.trim(); // Nombre sin espacios sobrantes
      await user.updateDisplayName(trimmed.length > 80 ? trimmed.substring(0, 80) : trimmed); // Guarda el nombre (máximo 80 caracteres)
      await user.sendEmailVerification(); // Envía el correo de verificación
      await _prepararSesion(user); // Prepara rol y perfil
    } on FirebaseAuthException catch (e) {
      throw AuthFailure(messageFor(e)); // Clave del mensaje
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
    } on FirebaseAuthMultiFactorException catch (e) {
      throw SegundoPasoRequerido(e.resolver); // La pantalla pide el código de la app
    } on FirebaseAuthException catch (e) {
      throw AuthFailure(messageFor(e)); // Clave del mensaje
    }
  }

  /// Termina el inicio de sesión con el código de 6 dígitos de la app de autenticación.
  Future<void> entrarConCodigo(MultiFactorResolver resolver, String codigo) async {
    final limpio = codigo.replaceAll(RegExp(r'\D'), ''); // Solo los dígitos
    if (limpio.length != 6) throw const AuthFailure('dospasos.err.bad_code'); // Siempre son 6 dígitos
    final pistas = resolver.hints.where((h) => h.factorId == 'totp'); // Factor de app de autenticación
    if (pistas.isEmpty) throw const AuthFailure('dospasos.err.unsupported'); // Solo se usa app de autenticación
    try {
      final asercion = await TotpMultiFactorGenerator.getAssertionForSignIn(pistas.first.uid, limpio); // Prueba con el código
      final cred = await resolver.resolveSignIn(asercion); // Termina el inicio de sesión
      await _prepararSesion(cred.user!); // Prepara rol y perfil
    } on FirebaseAuthException catch (e) {
      throw AuthFailure(messageFor(e)); // Clave del mensaje
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
    if (user == null) throw const AuthFailure('auth.err.sign_in_first'); // Sin sesión no hay a quién enviarlo
    await user.sendEmailVerification(); // Envía el correo
  }

  /// Cierra la sesión en Firebase y en Google.
  Future<void> signOut() async {
    await _google.signOut(); // Olvida la cuenta de Google elegida para que la próxima vez pregunte
    await _auth.signOut(); // Cierra la sesión de Firebase
  }
}
