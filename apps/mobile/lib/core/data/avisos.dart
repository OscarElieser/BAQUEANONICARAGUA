import 'package:firebase_core/firebase_core.dart'; // Saber si Firebase está iniciado
import 'package:firebase_messaging/firebase_messaging.dart'; // Avisos push de Firebase
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod
import 'package:supabase_flutter/supabase_flutter.dart'; // Base de datos con la sesión

import '../env.dart'; // Configuración de la compilación

/// Estados que ve la persona: no se puede en este teléfono, bloqueado, apagado o activado.
enum EstadoAvisos { noSoportado, bloqueado, apagado, activado }

/// Avisos push de este teléfono. Los mismos de la web: el servidor (función "enviar-avisos") los manda con FCM.
abstract class AvisosRepository {
  Future<EstadoAvisos> estado(); // Estado actual
  Future<EstadoAvisos> activar(); // Pide permiso y guarda el token en la cuenta
  Future<EstadoAvisos> apagar(); // Borra el token de la cuenta y de Firebase
  Future<void> alSalir(); // Al cerrar sesión: este teléfono deja de recibir los avisos de esa cuenta
}

/// Implementación con Firebase Cloud Messaging y la función push_register de la base.
/// El registro automático de Firebase está apagado en el manifiesto: el teléfono solo se registra si la persona lo pide.
class FirebaseAvisosRepository implements AvisosRepository {
  bool get _listo => Env.isSupabaseConfigured && Firebase.apps.isNotEmpty; // Firebase y Supabase configurados

  @override
  Future<EstadoAvisos> estado() async {
    if (!_listo) return EstadoAvisos.noSoportado; // Sin configuración no hay avisos
    try {
      final ajustes = await FirebaseMessaging.instance.getNotificationSettings(); // Permiso actual de Android
      if (ajustes.authorizationStatus == AuthorizationStatus.denied) return EstadoAvisos.bloqueado; // Bloqueados en Ajustes
      final pedidos = FirebaseMessaging.instance.isAutoInitEnabled; // Solo se enciende cuando la persona los activa aquí
      return ajustes.authorizationStatus == AuthorizationStatus.authorized && pedidos ? EstadoAvisos.activado : EstadoAvisos.apagado; // Activado solo con permiso y registro
    } catch (_) {
      return EstadoAvisos.noSoportado; // Firebase sin la app Android registrada u otro fallo
    }
  }

  @override
  Future<EstadoAvisos> activar() async {
    if (!_listo) return EstadoAvisos.noSoportado; // Sin configuración
    final fm = FirebaseMessaging.instance; // Mensajería
    final permiso = await fm.requestPermission(); // Pregunta de Android 13+ (en versiones viejas ya está concedido)
    if (permiso.authorizationStatus == AuthorizationStatus.denied) return EstadoAvisos.bloqueado; // Dijo que no
    await fm.setAutoInitEnabled(true); // Desde ahora el teléfono queda registrado en Firebase
    final token = await fm.getToken(); // Token de este teléfono
    if (token == null) throw StateError('sin token'); // Firebase no lo entregó
    await Supabase.instance.client.rpc('push_register', params: {'p_token': token, 'p_platform': 'android'}); // Lo guarda en la cuenta (la base exige sesión)
    return EstadoAvisos.activado; // Listo
  }

  @override
  Future<EstadoAvisos> apagar() async {
    if (!_listo) return EstadoAvisos.noSoportado; // Sin configuración
    final fm = FirebaseMessaging.instance; // Mensajería
    final token = await fm.getToken(); // Token actual
    if (token != null) await Supabase.instance.client.from('push_tokens').delete().eq('token', token); // Lo quita de la cuenta (RLS: solo los propios)
    await fm.deleteToken(); // Lo invalida en Firebase
    await fm.setAutoInitEnabled(false); // No se vuelve a registrar solo
    return EstadoAvisos.apagado; // Apagado
  }

  @override
  Future<void> alSalir() async {
    try {
      if ((await estado()) == EstadoAvisos.activado) await apagar(); // Solo si estaban activados aquí
    } catch (_) {
      // Si falla, la sesión se cierra igual
    }
  }
}

final avisosRepositoryProvider = Provider<AvisosRepository>((ref) => FirebaseAvisosRepository()); // Avisos (reemplazable en pruebas)
