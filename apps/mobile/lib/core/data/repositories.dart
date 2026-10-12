// Acceso a datos de Android. Habla directo con Supabase: las reglas RLS y las funciones de la base de datos
// aplican los mismos permisos y límites que en la web. Las pantallas usan las interfaces, así las pruebas
// pueden reemplazarlas por datos falsos sin red.

import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod
import 'package:supabase_flutter/supabase_flutter.dart'; // Cliente de Supabase

import '../env.dart'; // Configuración de la compilación
import 'models.dart'; // Datos del catálogo y la mensajería

/// Error cuando Supabase no está configurado en esta compilación (se muestra como "No disponible todavía").
class NotConfigured implements Exception {
  const NotConfigured(); // Constructor
  @override
  String toString() => 'El catálogo se activa al conectar Supabase. No disponible todavía.'; // Mensaje para la persona
}

/// Devuelve el cliente de Supabase o lanza NotConfigured si falta la configuración.
SupabaseClient _client() {
  if (!Env.isSupabaseConfigured) throw const NotConfigured(); // Sin configuración no hay datos
  return Supabase.instance.client; // Cliente ya inicializado en main.dart
}

/// Lecturas públicas del catálogo (solo contenido publicado; RLS filtra los borradores).
abstract class CatalogRepository {
  Future<List<Territory>> territories(); // Lista de territorios
  Future<(Territory?, List<TerritorySection>)> territory(String slug, String locale); // Territorio y sus secciones
  Future<List<CatalogItem>> search(String query, {int? departmentId, String? kind}); // Búsqueda de destinos y negocios (kind: 'destination' o 'business')
  Future<DestinationDetail?> destination(String slug); // Ficha de destino
  Future<BusinessDetail?> business(String slug); // Ficha de negocio
  Future<List<FeedPost>> feed(); // Relatos recientes
}

/// Mensajería con negocios (requiere sesión; RLS solo entrega las conversaciones propias).
abstract class MessagingRepository {
  Future<String?> myProfileId(); // Perfil de quien tiene la sesión
  Future<List<Thread>> inbox(); // Conversaciones
  Future<List<Message>> messages(String conversationId); // Mensajes de una conversación
  Future<void> send(String conversationId, String body); // Envía un mensaje
  Future<String> startWithBusiness(String businessId, String body); // Primera consulta a un negocio
}

/// Implementación con Supabase.
class SupabaseCatalogRepository implements CatalogRepository {
  @override
  Future<List<Territory>> territories() async {
    final rows = await _client().from('departments').select('id, slug, name, kind').order('name'); // Territorios publicados
    return [for (final r in rows) Territory.fromJson(r)]; // Convierte cada fila
  }

  @override
  Future<(Territory?, List<TerritorySection>)> territory(String slug, String locale) async {
    final db = _client(); // Cliente
    final row = await db.from('departments').select('id, slug, name, kind, capital_name, data_sources(url)').eq('slug', slug).maybeSingle(); // Territorio
    if (row == null) return (null, <TerritorySection>[]); // No existe o no está publicado
    final t = Territory.fromJson(row); // Convierte
    final sections = await db
        .from('territory_sections') // Secciones editoriales
        .select('section, title, body_md, machine_translated, verified_at') // Campos necesarios
        .eq('department_id', t.id) // Del territorio
        .eq('locale', locale); // En el idioma pedido
    return (t, [for (final s in sections) TerritorySection.fromJson(s)]); // Territorio y secciones
  }

  @override
  Future<List<CatalogItem>> search(String query, {int? departmentId, String? kind}) async {
    final rows = await _client().rpc('search_catalog', params: {'q': query.trim().isEmpty ? null : query.trim(), 'p_department': departmentId, 'p_kind': kind, 'p_limit': 30}); // Búsqueda por relevancia (sin patrocinados que se cuelen)
    return [for (final r in rows as List) CatalogItem.fromJson(r as Map<String, dynamic>)]; // Convierte cada resultado
  }

  @override
  Future<DestinationDetail?> destination(String slug) async {
    final db = _client(); // Cliente
    final d = await db.from('public_destinations').select().eq('slug', slug).maybeSingle(); // Destino publicado
    if (d == null) return null; // No existe
    final id = d['id'] as String; // Identificador
    final hours = await db.from('opening_hours').select('weekday, opens_at, closes_at, closed, verified_at').eq('destination_id', id); // Horarios
    final prices = await db.from('price_observations').select('label, amount, currency, unit, observed_at, reported_by').eq('destination_id', id); // Precios
    final src = d['source_id'] == null ? null : await db.from('data_sources').select('url').eq('id', d['source_id'] as String).maybeSingle(); // Fuente
    return DestinationDetail(
      data: d, // Datos del destino
      hours: [for (final h in hours) OpeningHours.fromJson(h)], // Horarios
      prices: [for (final p in prices) PriceObservation.fromJson(p)], // Precios
      sourceUrl: src?['url'] as String?, // Fuente
    );
  }

  @override
  Future<BusinessDetail?> business(String slug) async {
    final db = _client(); // Cliente
    final b = await db.from('public_businesses').select().eq('slug', slug).maybeSingle(); // Negocio publicado
    if (b == null) return null; // No existe
    final id = b['id'] as String; // Identificador
    final contacts = await db.from('contacts').select('kind, value').eq('business_id', id); // Contactos
    final hours = await db.from('opening_hours').select('weekday, opens_at, closes_at, closed, verified_at').eq('business_id', id); // Horarios
    final prices = await db.from('price_observations').select('label, amount, currency, unit, observed_at, reported_by').eq('business_id', id); // Precios
    return BusinessDetail(
      data: b, // Datos del negocio
      contacts: [for (final c in contacts) Contact(c['kind'] as String, c['value'] as String)], // Contactos
      hours: [for (final h in hours) OpeningHours.fromJson(h)], // Horarios
      prices: [for (final p in prices) PriceObservation.fromJson(p)], // Precios
    );
  }

  @override
  Future<List<FeedPost>> feed() async {
    final rows = await _client().rpc('public_feed', params: {'p_limit': 20}); // Relatos en orden cronológico
    return [for (final r in rows as List) FeedPost.fromJson(r as Map<String, dynamic>)]; // Convierte cada relato
  }
}

/// Implementación con Supabase (usa el token de Firebase que main.dart entrega al cliente).
class SupabaseMessagingRepository implements MessagingRepository {
  @override
  Future<String?> myProfileId() async => await _client().rpc('my_profile_id') as String?; // Perfil propio

  @override
  Future<List<Thread>> inbox() async {
    final rows = await _client().rpc('my_inbox'); // Conversaciones con no leídos
    return [for (final r in rows as List) Thread.fromJson(r as Map<String, dynamic>)]; // Convierte cada una
  }

  @override
  Future<List<Message>> messages(String conversationId) async {
    final db = _client(); // Cliente
    final rows = await db
        .from('messages') // Mensajes
        .select('id, sender_id, body, created_at, deleted_at') // Campos necesarios
        .eq('conversation_id', conversationId) // De esta conversación
        .order('created_at', ascending: false) // Los más recientes primero
        .limit(50); // Últimos 50
    await db.rpc('mark_conversation_read', params: {'p_conversation': conversationId}); // Marca como leída
    return [for (final r in rows.reversed) Message.fromJson(r)]; // En orden cronológico
  }

  @override
  Future<void> send(String conversationId, String body) async {
    final db = _client(); // Cliente
    final me = await myProfileId(); // Remitente
    await db.from('messages').insert({'conversation_id': conversationId, 'sender_id': me, 'body': body.trim()}); // RLS comprueba que la persona pertenece a la conversación
    await db.rpc('mark_conversation_read', params: {'p_conversation': conversationId}); // Lo enviado cuenta como leído
  }

  @override
  Future<String> startWithBusiness(String businessId, String body) async {
    final id = await _client().rpc('start_business_conversation', params: {'p_business': businessId, 'p_message': body.trim()}); // Reanuda o crea la conversación (con límite diario)
    return id as String; // Identificador de la conversación
  }
}

final catalogRepositoryProvider = Provider<CatalogRepository>((ref) => SupabaseCatalogRepository()); // Catálogo (reemplazable en pruebas)
final messagingRepositoryProvider = Provider<MessagingRepository>((ref) => SupabaseMessagingRepository()); // Mensajería (reemplazable en pruebas)

/// Convierte cualquier error de datos en un mensaje claro en español.
String dataErrorMessage(Object e) {
  if (e is NotConfigured) return e.toString(); // Falta configuración
  if (e is PostgrestException) {
    // Error de la base de datos
    switch (e.code) {
      case '42501':
        return 'No tienes permiso para esto. Inicia sesión con la cuenta correcta.'; // Sin permiso
      case '54000':
        return 'Llegaste al límite de mensajes nuevos por hoy. Intenta mañana.'; // Límite anti-spam
      case 'P0002':
        return 'No encontramos lo que buscas. Puede que ya no esté publicado.'; // No existe
    }
    return 'La base de datos respondió con un error. Intenta de nuevo en un momento.'; // Otro error
  }
  return 'Sin conexión o el servicio no respondió. Revisa tu internet e intenta de nuevo.'; // Red u otro
}
