// Viajes y lugares guardados de Android. Son las mismas tablas que usa la web (trips y favorites):
// con la misma cuenta, lo que se guarda en un lado aparece en el otro. RLS decide qué ve cada quien.

import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod
import 'package:supabase_flutter/supabase_flutter.dart'; // Cliente de Supabase

import '../../features/planner/trip_intent.dart'; // Lo que entendió el intérprete
import '../env.dart'; // Configuración de la compilación
import 'repositories.dart'; // NotConfigured

/// Un viaje guardado.
class Viaje {
  const Viaje({required this.id, required this.title, this.startsOn, this.endsOn, this.travelers, this.budgetAmount, this.budgetCurrency, this.interests = const []}); // Constructor
  final String id; // Identificador
  final String title; // Nombre del viaje
  final String? startsOn; // Inicio (AAAA-MM-DD) o null
  final String? endsOn; // Fin (AAAA-MM-DD) o null
  final int? travelers; // Personas o null
  final num? budgetAmount; // Presupuesto total o null
  final String? budgetCurrency; // 'NIO' o 'USD'
  final List<String> interests; // Intereses

  /// Crea el viaje a partir de una fila de Supabase.
  factory Viaje.fromJson(Map<String, dynamic> j) => Viaje(
        id: j['id'] as String, // Identificador
        title: j['title'] as String, // Nombre
        startsOn: j['starts_on'] as String?, // Inicio
        endsOn: j['ends_on'] as String?, // Fin
        travelers: (j['travelers'] as num?)?.toInt(), // Personas
        budgetAmount: j['budget_amount'] as num?, // Presupuesto
        budgetCurrency: j['budget_currency'] as String?, // Moneda
        interests: ((j['interests'] as List?) ?? const []).cast<String>(), // Intereses
      );
}

/// Un lugar guardado (destino o negocio publicado).
class Favorito {
  const Favorito({required this.tipo, required this.id, required this.slug, required this.name}); // Constructor
  final String tipo; // 'destino' o 'negocio'
  final String id; // Identificador
  final String slug; // Dirección corta
  final String name; // Nombre
}

/// Operaciones con viajes y favoritos (reemplazable en pruebas).
abstract class ViajesRepository {
  Future<List<Viaje>> misViajes(); // Viajes propios
  Future<void> guardar(String titulo, TripIntent intent, BudgetBreakdown? total); // Guarda un viaje nuevo
  Future<void> borrar(String id); // Borra un viaje propio
  Future<List<Favorito>> favoritos(); // Lugares guardados
  Future<bool> esFavorito(String tipo, String id); // Si un lugar está guardado
  Future<bool> alternar(String tipo, String id, bool guardado); // Guarda o quita; devuelve el estado nuevo
}

/// Implementación con Supabase.
class SupabaseViajesRepository implements ViajesRepository {
  SupabaseClient get _db {
    if (!Env.isSupabaseConfigured) throw const NotConfigured(); // Sin configuración no hay datos
    return Supabase.instance.client; // Cliente con el token de Firebase (main.dart)
  }

  Future<String> _perfil() async {
    final id = await _db.rpc('my_profile_id') as String?; // Perfil de la sesión (lo crea preparar-sesion)
    if (id == null) throw StateError('perfil'); // Sin perfil no se puede guardar
    return id; // Identificador
  }

  static String _sumarDias(String iso, int dias) => DateTime.parse('${iso}T00:00:00Z').add(Duration(days: dias)).toIso8601String().substring(0, 10); // AAAA-MM-DD + días

  @override
  Future<List<Viaje>> misViajes() async {
    final owner = await _perfil(); // Perfil propio
    final rows = await _db.from('trips').select('id, title, starts_on, ends_on, travelers, budget_amount, budget_currency, interests').eq('owner_id', owner).order('created_at', ascending: false); // Solo los propios
    return [for (final r in rows) Viaje.fromJson(r)]; // Convierte
  }

  @override
  Future<void> guardar(String titulo, TripIntent intent, BudgetBreakdown? total) async {
    final owner = await _perfil(); // Dueña o dueño
    final start = intent.startDate; // Inicio (si lo dijo)
    await _db.from('trips').insert({
      'owner_id': owner, // Quién lo guarda
      'title': titulo.trim().length > 120 ? titulo.trim().substring(0, 120) : titulo.trim(), // Nombre (máximo 120)
      'starts_on': start, // Inicio
      'ends_on': start != null && intent.days != null ? _sumarDias(start, intent.days!.toInt() - 1) : null, // Fin calculado
      'travelers': intent.travelers?.toInt(), // Personas
      'budget_amount': total?.total, // Presupuesto total (si hay moneda)
      'budget_currency': total?.currency, // Moneda
      'interests': intent.interests, // Intereses
      'created_via': 'assistant', // Lo armó el intérprete
    }); // RLS exige que owner_id sea la persona con sesión
  }

  @override
  Future<void> borrar(String id) => _db.from('trips').delete().eq('id', id); // RLS solo deja borrar los propios

  @override
  Future<List<Favorito>> favoritos() async {
    final rows = await _db.from('favorites').select('destination_id, business_id').order('created_at', ascending: false); // Propios (RLS)
    final dest = [for (final r in rows) if (r['destination_id'] != null) r['destination_id'] as String]; // Destinos
    final neg = [for (final r in rows) if (r['business_id'] != null) r['business_id'] as String]; // Negocios
    final d = dest.isEmpty ? <Map<String, dynamic>>[] : await _db.from('public_destinations').select('id, slug, name').inFilter('id', dest); // Destinos publicados
    final n = neg.isEmpty ? <Map<String, dynamic>>[] : await _db.from('public_businesses').select('id, slug, name').inFilter('id', neg); // Negocios publicados
    return [
      for (final x in d) Favorito(tipo: 'destino', id: x['id'] as String, slug: x['slug'] as String, name: x['name'] as String), // Destinos
      for (final x in n) Favorito(tipo: 'negocio', id: x['id'] as String, slug: x['slug'] as String, name: x['name'] as String), // Negocios
    ];
  }

  String _col(String tipo) => tipo == 'destino' ? 'destination_id' : 'business_id'; // Columna según el tipo

  @override
  Future<bool> esFavorito(String tipo, String id) async => (await _db.from('favorites').select(_col(tipo)).eq(_col(tipo), id).maybeSingle()) != null; // Existe o no

  @override
  Future<bool> alternar(String tipo, String id, bool guardado) async {
    if (guardado) {
      await _db.from('favorites').delete().eq(_col(tipo), id); // Quita el propio
    } else {
      await _db.from('favorites').insert({'profile_id': await _perfil(), _col(tipo): id}); // Guarda
    }
    return !guardado; // Estado nuevo
  }
}

final viajesRepositoryProvider = Provider<ViajesRepository>((ref) => SupabaseViajesRepository()); // Viajes (reemplazable en pruebas)
final misViajesProvider = FutureProvider.autoDispose<(List<Viaje>, List<Favorito>)>((ref) async { // Viajes y favoritos juntos
  final repo = ref.watch(viajesRepositoryProvider); // Repositorio
  return (await repo.misViajes(), await repo.favoritos()); // Lee ambos
});
