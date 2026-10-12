// Datos que Android lee de Supabase. Los nombres de campos coinciden con las vistas y funciones de la base de datos.

/// Territorio (departamento o región autónoma).
class Territory {
  const Territory({required this.id, required this.slug, required this.name, required this.kind, this.capitalName, this.sourceUrl}); // Constructor
  final int id; // Identificador
  final String slug; // Dirección corta (por ejemplo "granada")
  final String name; // Nombre oficial
  final String kind; // 'department' o 'autonomous_region'
  final String? capitalName; // Cabecera departamental
  final String? sourceUrl; // Fuente del dato

  /// Nombre corto: las regiones autónomas sin el prefijo largo.
  String get shortName => kind == 'autonomous_region' ? name.replaceFirst('Región Autónoma de la ', '') : name; // Nombre para listas

  /// Crea el territorio desde una fila de la base de datos.
  factory Territory.fromJson(Map<String, dynamic> j) => Territory(
        id: (j['id'] as num).toInt(), // Identificador
        slug: j['slug'] as String, // Dirección corta
        name: j['name'] as String, // Nombre
        kind: j['kind'] as String, // Tipo
        capitalName: j['capital_name'] as String?, // Cabecera
        sourceUrl: (j['data_sources'] as Map<String, dynamic>?)?['url'] as String?, // Fuente (si se pidió)
      );
}

/// Sección editorial de un territorio.
class TerritorySection {
  const TerritorySection({required this.section, required this.title, required this.body, required this.machineTranslated, this.verifiedAt}); // Constructor
  final String section; // Clave (overview, history…)
  final String title; // Título
  final String body; // Texto
  final bool machineTranslated; // Si es traducción automática
  final DateTime? verifiedAt; // Fecha de comprobación

  /// Crea la sección desde una fila.
  factory TerritorySection.fromJson(Map<String, dynamic> j) => TerritorySection(
        section: j['section'] as String, // Clave
        title: j['title'] as String, // Título
        body: j['body_md'] as String, // Texto
        machineTranslated: j['machine_translated'] as bool? ?? false, // Traducción automática
        verifiedAt: j['verified_at'] == null ? null : DateTime.parse(j['verified_at'] as String), // Fecha
      );
}

/// Resultado de búsqueda en el catálogo (destino o negocio).
class CatalogItem {
  const CatalogItem({required this.kind, required this.id, required this.slug, required this.name, this.summary, this.listingTier, this.verification}); // Constructor
  final String kind; // 'destination' o 'business'
  final String id; // Identificador
  final String slug; // Dirección corta
  final String name; // Nombre
  final String? summary; // Resumen
  final String? listingTier; // Nivel de ficha (negocios)
  final String? verification; // Estado de verificación

  /// Crea el resultado desde una fila de search_catalog.
  factory CatalogItem.fromJson(Map<String, dynamic> j) => CatalogItem(
        kind: j['kind'] as String, // Tipo
        id: j['id'] as String, // Identificador
        slug: j['slug'] as String, // Dirección
        name: j['name'] as String, // Nombre
        summary: j['summary'] as String?, // Resumen
        listingTier: j['listing_tier'] as String?, // Nivel
        verification: j['verification'] as String?, // Verificación
      );
}

/// Horario de un lugar.
class OpeningHours {
  const OpeningHours({required this.weekday, this.opensAt, this.closesAt, required this.closed, required this.verifiedAt}); // Constructor
  final int weekday; // Día de la semana ISO 8601 (1 = lunes, 7 = domingo)
  final String? opensAt; // Abre (HH:MM)
  final String? closesAt; // Cierra (HH:MM)
  final bool closed; // Cerrado ese día
  final DateTime verifiedAt; // Cuándo se comprobó

  /// Crea el horario desde una fila.
  factory OpeningHours.fromJson(Map<String, dynamic> j) => OpeningHours(
        weekday: (j['weekday'] as num).toInt(), // Día
        opensAt: j['opens_at'] as String?, // Apertura
        closesAt: j['closes_at'] as String?, // Cierre
        closed: j['closed'] as bool? ?? false, // Cerrado
        verifiedAt: DateTime.parse(j['verified_at'] as String), // Comprobación
      );
}

/// Precio observado con fecha y fuente.
class PriceObservation {
  const PriceObservation({required this.label, required this.amount, required this.currency, this.unit, required this.observedAt, required this.reportedBy}); // Constructor
  final String label; // Qué cuesta
  final num amount; // Cantidad
  final String currency; // 'NIO' o 'USD'
  final String? unit; // Por persona, por noche…
  final DateTime observedAt; // Cuándo se observó
  final String reportedBy; // 'owner', 'editor' u 'official_source'

  /// Crea el precio desde una fila.
  factory PriceObservation.fromJson(Map<String, dynamic> j) => PriceObservation(
        label: j['label'] as String, // Concepto
        amount: j['amount'] as num, // Cantidad
        currency: j['currency'] as String, // Moneda
        unit: j['unit'] as String?, // Unidad
        observedAt: DateTime.parse(j['observed_at'] as String), // Fecha
        reportedBy: j['reported_by'] as String, // Quién lo informó
      );
}

/// Contacto de un negocio.
class Contact {
  const Contact(this.kind, this.value); // Constructor
  final String kind; // whatsapp, phone, email, website, facebook, instagram, tiktok
  final String value; // Valor tal como lo registró el negocio
}

/// Ficha de destino con lo que se necesita para mostrarla.
class DestinationDetail {
  const DestinationDetail({required this.data, required this.hours, required this.prices, this.sourceUrl}); // Constructor
  final Map<String, dynamic> data; // Fila de public_destinations
  final List<OpeningHours> hours; // Horarios
  final List<PriceObservation> prices; // Precios
  final String? sourceUrl; // Fuente
  String get id => data['id'] as String; // Identificador
  String get name => data['name'] as String; // Nombre
  String? get summary => data['summary'] as String?; // Resumen
}

/// Ficha de negocio con lo que se necesita para mostrarla.
class BusinessDetail {
  const BusinessDetail({required this.data, required this.contacts, required this.hours, required this.prices}); // Constructor
  final Map<String, dynamic> data; // Fila de public_businesses
  final List<Contact> contacts; // Contactos
  final List<OpeningHours> hours; // Horarios
  final List<PriceObservation> prices; // Precios
  String get id => data['id'] as String; // Identificador
  String get name => data['name'] as String; // Nombre
  String? get summary => data['summary'] as String?; // Resumen
  String get listingTier => data['listing_tier'] as String? ?? 'basic'; // Nivel de ficha
  bool get isSponsored => data['is_sponsored'] as bool? ?? false; // Si es patrocinado (se marca siempre)
}

/// Relato del feed de la comunidad.
class FeedPost {
  const FeedPost({required this.id, this.title, required this.body, required this.createdAt, this.authorName, required this.isPromotional, required this.reactions, required this.comments}); // Constructor
  final String id; // Identificador
  final String? title; // Título
  final String body; // Texto
  final DateTime createdAt; // Fecha
  final String? authorName; // Autor
  final bool isPromotional; // Si es promocional (se marca)
  final int reactions; // Reacciones
  final int comments; // Comentarios

  /// Crea el relato desde una fila de public_feed.
  factory FeedPost.fromJson(Map<String, dynamic> j) => FeedPost(
        id: j['id'] as String, // Identificador
        title: j['title'] as String?, // Título
        body: j['body_md'] as String, // Texto
        createdAt: DateTime.parse(j['created_at'] as String), // Fecha
        authorName: j['author_name'] as String?, // Autor
        isPromotional: j['is_promotional'] as bool? ?? false, // Promocional
        reactions: (j['reactions'] as num?)?.toInt() ?? 0, // Reacciones
        comments: (j['comments'] as num?)?.toInt() ?? 0, // Comentarios
      );
}

/// Conversación en la bandeja.
class Thread {
  const Thread({required this.conversationId, this.businessName, this.lastMessage, this.lastMessageAt, required this.unread}); // Constructor
  final String conversationId; // Identificador
  final String? businessName; // Negocio con el que se habla
  final String? lastMessage; // Último mensaje (resumen)
  final DateTime? lastMessageAt; // Fecha del último mensaje
  final int unread; // Mensajes sin leer

  /// Crea la conversación desde una fila de my_inbox.
  factory Thread.fromJson(Map<String, dynamic> j) => Thread(
        conversationId: j['conversation_id'] as String, // Identificador
        businessName: j['business_name'] as String?, // Negocio
        lastMessage: j['last_message'] as String?, // Último mensaje
        lastMessageAt: j['last_message_at'] == null ? null : DateTime.parse(j['last_message_at'] as String), // Fecha
        unread: (j['unread'] as num?)?.toInt() ?? 0, // Sin leer
      );
}

/// Mensaje de una conversación.
class Message {
  const Message({required this.id, required this.senderId, this.body, required this.createdAt}); // Constructor
  final String id; // Identificador
  final String senderId; // Quién lo envió
  final String? body; // Texto (null si se eliminó)
  final DateTime createdAt; // Fecha

  /// Crea el mensaje desde una fila; los eliminados conservan su lugar sin texto.
  factory Message.fromJson(Map<String, dynamic> j) => Message(
        id: j['id'] as String, // Identificador
        senderId: j['sender_id'] as String, // Remitente
        body: j['deleted_at'] != null ? null : j['body'] as String?, // Texto o nada si se eliminó
        createdAt: DateTime.parse(j['created_at'] as String), // Fecha
      );
}
