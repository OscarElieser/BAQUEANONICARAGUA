import 'package:firebase_auth/firebase_auth.dart'; // Tipo User
import 'package:flutter/material.dart'; // Componentes de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Reemplazo de proveedores
import 'package:flutter_test/flutter_test.dart'; // Herramientas de pruebas de widgets
import 'package:nica_app/core/data/models.dart'; // Datos
import 'package:nica_app/core/data/repositories.dart'; // Interfaces a reemplazar
import 'package:nica_app/core/theme.dart'; // Tema
import 'package:nica_app/features/auth/auth_repository.dart'; // Sesión
import 'package:nica_app/features/catalog/business_screen.dart'; // Ficha de negocio
import 'package:nica_app/features/community/community_screen.dart'; // Comunidad
import 'package:nica_app/features/messages/conversation_screen.dart'; // Conversación
import 'package:nica_app/features/planner/planner_screen.dart'; // Mi aventura

/// Catálogo falso, sin red.
class FakeCatalog implements CatalogRepository {
  @override
  Future<List<Territory>> territories() async => const [Territory(id: 6, slug: 'granada', name: 'Granada', kind: 'department')]; // Un territorio

  @override
  Future<(Territory?, List<TerritorySection>)> territory(String slug, String locale) async => (null, <TerritorySection>[]); // Sin ficha

  @override
  Future<List<CatalogItem>> search(String query, {int? departmentId, String? kind}) async => const []; // Sin resultados

  @override
  Future<DestinationDetail?> destination(String slug) async => null; // Sin destino

  @override
  Future<BusinessDetail?> business(String slug) async => BusinessDetail(
        data: const {'id': 'b1', 'name': 'Comedor de prueba', 'summary': 'Comida casera', 'is_sponsored': true, 'verified_scope': [], 'location_precision': 'approximate'}, // Negocio patrocinado
        contacts: const [Contact('whatsapp', '+505 8888 0000'), Contact('website', 'no-es-web')], // Un contacto válido y uno inválido
        hours: const [], // Sin horarios
        prices: const [], // Sin tarifas
      );

  @override
  Future<List<FeedPost>> feed() async => [
        FeedPost(id: 'p1', title: 'Una tarde en el lago', body: 'Texto del relato', createdAt: DateTime.utc(2026, 9, 1), authorName: 'Ana', isPromotional: true, reactions: 3, comments: 1), // Relato promocional
      ];
}

/// Mensajería falsa, sin red.
class FakeMessaging implements MessagingRepository {
  final sent = <String>[]; // Mensajes enviados en la prueba
  @override
  Future<String?> myProfileId() async => 'yo'; // Perfil propio
  @override
  Future<List<Thread>> inbox() async => const []; // Sin conversaciones
  @override
  Future<List<Message>> messages(String conversationId) async => [
        Message(id: 'm1', senderId: 'negocio', body: 'Hola, ¿en qué te ayudamos?', createdAt: DateTime.utc(2026, 9, 1)), // Del negocio
        Message(id: 'm2', senderId: 'yo', body: null, createdAt: DateTime.utc(2026, 9, 2)), // Propio y eliminado
      ];
  @override
  Future<void> send(String conversationId, String body) async => sent.add(body); // Guarda lo enviado
  @override
  Future<String> startWithBusiness(String businessId, String body) async => 'c1'; // Conversación nueva
}

/// Monta una pantalla con los datos falsos y sin sesión.
Widget app(Widget home, {FakeMessaging? messaging}) => ProviderScope(
      overrides: [
        catalogRepositoryProvider.overrideWithValue(FakeCatalog()), // Catálogo falso
        messagingRepositoryProvider.overrideWithValue(messaging ?? FakeMessaging()), // Mensajería falsa
        authStateProvider.overrideWith((ref) => Stream<User?>.value(null)), // Sin sesión
      ],
      child: MaterialApp(theme: buildTheme(Brightness.light, webFonts: false), home: Scaffold(body: home)), // Tema sin descargar fuentes
    );

void main() {
  testWidgets('ficha de negocio: marca patrocinado, solo enlaza contactos válidos y no inventa tarifas', (tester) async {
    await tester.pumpWidget(app(const BusinessScreen(slug: 'comedor', name: 'Comedor de prueba'))); // Abre la ficha
    await tester.pumpAndSettle(); // Espera los datos
    expect(find.text('Patrocinado'), findsOneWidget); // Lo patrocinado siempre se marca
    expect(find.text('WhatsApp'), findsOneWidget); // Contacto válido
    expect(find.text('Sitio web'), findsNothing); // El contacto inválido no se muestra
    expect(find.textContaining('Inicia sesión'), findsOneWidget); // Sin sesión explica cómo escribir
    await tester.scrollUntilVisible(find.text('Por cotizar. Consulta al prestador.'), 200); // Baja hasta las tarifas
    expect(find.text('Por cotizar. Consulta al prestador.'), findsOneWidget); // Sin tarifas: por cotizar
  });

  testWidgets('Mi aventura entiende el ejemplo y pregunta lo que falta', (tester) async {
    await tester.pumpWidget(app(const PlannerScreen())); // Abre el planificador
    await tester.tap(find.text('Probar con un ejemplo')); // Usa el ejemplo
    await tester.pumpAndSettle(); // Espera el resultado
    expect(find.text('Esto es lo que entendí'), findsOneWidget); // Muestra lo entendido
    expect(find.text('4'), findsOneWidget); // Cuatro viajeros
    expect(find.text('5'), findsOneWidget); // Cinco días
    await tester.scrollUntilVisible(find.textContaining('¿En qué fechas viajan?'), 200); // Baja hasta las preguntas
    expect(find.textContaining('¿En qué fechas viajan?'), findsOneWidget); // Pregunta por las fechas
  });

  testWidgets('Comunidad muestra relatos en orden y marca lo promocional', (tester) async {
    await tester.pumpWidget(app(const CommunityScreen())); // Abre la comunidad
    await tester.pumpAndSettle(); // Espera el feed
    await tester.scrollUntilVisible(find.text('Una tarde en el lago'), 200); // Baja hasta el relato
    expect(find.textContaining('Promocional'), findsOneWidget); // Aviso promocional
    expect(find.text('3 reacciones, 1 comentarios'), findsOneWidget); // Interacción informativa
  });

  testWidgets('conversación: burbujas, mensaje eliminado y envío', (tester) async {
    final messaging = FakeMessaging(); // Mensajería falsa para revisar lo enviado
    await tester.pumpWidget(app(const ConversationScreen(conversationId: 'c1', title: 'Comedor'), messaging: messaging)); // Abre la conversación
    await tester.pumpAndSettle(); // Espera los mensajes
    expect(find.text('Hola, ¿en qué te ayudamos?'), findsOneWidget); // Mensaje del negocio
    expect(find.text('Mensaje eliminado'), findsOneWidget); // El eliminado conserva su lugar
    await tester.enterText(find.byType(TextField), 'Quiero reservar para dos'); // Escribe
    await tester.tap(find.byTooltip('Enviar')); // Envía
    await tester.pumpAndSettle(); // Espera
    expect(messaging.sent, ['Quiero reservar para dos']); // Se envió el texto exacto
  });
}
