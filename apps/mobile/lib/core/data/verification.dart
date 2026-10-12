// Reglas de "Qué está comprobado": mismas que la web (apps/web/src/lib/catalog.ts).

import '../widgets/estado_verificacion.dart'; // Estados de cada campo
import 'models.dart'; // Datos del catálogo

/// Estado de la ubicación según su precisión.
FieldState locationState(String? precision) => switch (precision) {
      'exact' => const Pending(), // Exacta pero aún sin comprobar en terreno
      'approximate' => const Approximate(), // Aproximada
      _ => const Restricted('ficha.location_protected'), // Protegida (por ejemplo, comunidades)
    };

/// Estado de los horarios: comprobado en la fecha más reciente, o sin confirmar.
FieldState hoursState(List<OpeningHours> hours) {
  if (hours.isEmpty) return const Unconfirmed(); // Sin horarios registrados
  final latest = hours.map((h) => h.verifiedAt).reduce((a, b) => a.isAfter(b) ? a : b); // Comprobación más reciente
  return Verified(latest); // Comprobado
}

/// Estado de las tarifas: observadas en la fecha más reciente, o "consulta al prestador".
FieldState pricesState(List<PriceObservation> prices) {
  if (prices.isEmpty) return const AskProvider(); // Sin tarifas: no se inventan
  final latest = prices.map((p) => p.observedAt).reduce((a, b) => a.isAfter(b) ? a : b); // Observación más reciente
  return Verified(latest); // Comprobado
}

/// Filas de verificación de un negocio (identidad, ubicación, horarios, tarifas).
List<(String, FieldState)> businessRows(BusinessDetail b) {
  final scope = (b.data['verified_scope'] as List?)?.cast<String>() ?? const []; // Qué se verificó
  final verifiedAt = b.data['verified_at'] == null ? null : DateTime.parse(b.data['verified_at'] as String); // Cuándo
  return [
    ('field.identity', scope.contains('identity') && verifiedAt != null ? Verified(verifiedAt) : const Pending()), // Identidad del negocio
    ('field.location', scope.contains('location') && verifiedAt != null ? Verified(verifiedAt) : locationState(b.data['location_precision'] as String?)), // Ubicación
    ('field.hours', hoursState(b.hours)), // Horarios
    ('field.prices', pricesState(b.prices)), // Tarifas
  ];
}

/// Filas de verificación de un destino.
List<(String, FieldState)> destinationRows(DestinationDetail d) => [
      ('field.location', locationState(d.data['location_precision'] as String?)), // Ubicación
      ('field.hours', hoursState(d.hours)), // Horarios
      ('field.prices', pricesState(d.prices)), // Tarifas
      if (d.data['safety_notes'] != null) ('field.safety', Restricted(d.data['safety_notes'] as String)), // Avisos de seguridad
    ];

/// Enlace directo para un contacto. WhatsApp usa wa.me con solo dígitos; las redes solo si son https.
Uri? contactUri(Contact c) {
  final digits = c.value.replaceAll(RegExp(r'\D'), ''); // Solo los dígitos
  switch (c.kind) {
    case 'whatsapp':
      return digits.isEmpty ? null : Uri.parse('https://wa.me/$digits'); // Chat de WhatsApp
    case 'phone':
      return digits.isEmpty ? null : Uri.parse('tel:+$digits'); // Llamada
    case 'email':
      return Uri(scheme: 'mailto', path: c.value); // Correo
    case 'website':
    case 'facebook':
    case 'instagram':
    case 'tiktok':
      return RegExp(r'^https?://').hasMatch(c.value) ? Uri.parse(c.value) : null; // Solo direcciones web completas
    default:
      return null; // Tipo desconocido: no se enlaza
  }
}

/// Clave de traducción (o nombre de marca) de cada tipo de contacto.
String contactLabel(String kind) => switch (kind) {
      'whatsapp' => 'WhatsApp', // Mensajería (marca, no se traduce)
      'phone' => 'contact.phone', // Teléfono
      'email' => 'contact.email', // Correo electrónico
      'website' => 'contact.website', // Página propia
      'facebook' => 'Facebook', // Red social
      'instagram' => 'Instagram', // Red social
      'tiktok' => 'TikTok', // Red social
      _ => kind, // Cualquier otro
    };
