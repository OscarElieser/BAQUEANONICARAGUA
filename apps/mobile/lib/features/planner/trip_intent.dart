// Interpretación de una solicitud de viaje: traducción fiel de packages/ai-core/src/intent.ts.
// La prueba test/trip_intent_test.dart compara esta versión con packages/ai-core/evals/intent_golden.json
// (generado desde TypeScript), así la web y Android entienden exactamente lo mismo.
// Extrae solo lo que el texto dice con certeza y lista lo que falta. Nunca rellena con suposiciones.

/// Presupuesto mencionado: cantidad, moneda (o null si no se dijo) y alcance.
class TripBudget {
  const TripBudget(this.amount, this.currency, this.scope); // Constructor
  final num amount; // Cantidad
  final String? currency; // 'USD', 'NIO' o null si no se indicó
  final String scope; // 'total', 'per_person', 'per_day' o 'unknown'
}

/// Lo que se entendió del viaje.
class TripIntent {
  const TripIntent({
    required this.travelers, // Personas que viajan
    required this.days, // Días de viaje
    required this.budget, // Presupuesto mencionado
    required this.interests, // Intereses detectados
    required this.startDate, // Fecha de inicio (AAAA-MM-DD) si se indicó
    required this.travelerType, // Tipo de grupo
    required this.hasVehicle, // Si tendrán vehículo
    required this.accessibilityNeeds, // Si hay necesidades de accesibilidad
    required this.missing, // Lo que falta preguntar
  });
  final num? travelers; // null si no se dijo
  final num? days; // null si no se dijo
  final TripBudget? budget; // null si no se dijo
  final List<String> interests; // Claves como 'beach', 'food'…
  final String? startDate; // null si no se dijo
  final String? travelerType; // 'family', 'couple', 'group', 'solo' o null
  final bool? hasVehicle; // null si no se dijo
  final bool accessibilityNeeds; // true si se mencionó
  final List<String> missing; // 'travelers', 'days', 'budget_currency', 'dates', 'transport'
}

/// Presupuesto desglosado (solo si los datos lo permiten).
class BudgetBreakdown {
  const BudgetBreakdown(this.total, this.perPerson, this.perPersonPerDay, this.currency); // Constructor
  final num total; // Total del viaje
  final num? perPerson; // Por persona (si se sabe cuántos son)
  final num? perPersonPerDay; // Por persona al día (si se sabe también la duración)
  final String currency; // Moneda
}

const _numberWords = <String, int>{
  'un': 1, 'una': 1, 'uno': 1, 'one': 1, 'a': 1, // Uno
  'dos': 2, 'two': 2, 'tres': 3, 'three': 3, 'cuatro': 4, 'four': 4, 'cinco': 5, 'five': 5, // Dos a cinco
  'seis': 6, 'six': 6, 'siete': 7, 'seven': 7, 'ocho': 8, 'eight': 8, 'nueve': 9, 'nine': 9, // Seis a nueve
  'diez': 10, 'ten': 10, 'once': 11, 'doce': 12, 'twelve': 12, 'quince': 15, 'fifteen': 15, // Diez a quince
  'veinte': 20, 'twenty': 20, // Veinte
}; // Números escritos con palabras

const _accents = {
  'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'å': 'a', // Variantes de a
  'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', // Variantes de e
  'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i', // Variantes de i
  'ó': 'o', 'ò': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o', // Variantes de o
  'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u', // Variantes de u
  'ñ': 'n', 'ç': 'c', 'ý': 'y', 'ÿ': 'y', // Otras letras con marca
}; // Equivale a normalizar (NFD) y quitar las marcas, como hace la versión web

/// Minúsculas, sin tildes y con espacios simples.
String _norm(String s) {
  final lower = s.toLowerCase(); // Todo en minúsculas
  final buf = StringBuffer(); // Texto resultante
  for (final ch in lower.split('')) {
    // Cada carácter
    buf.write(_accents[ch] ?? ch); // Quita la tilde si la tiene
  }
  return buf.toString().replaceAll(RegExp(r'[̀-ͯ]'), '').replaceAll(RegExp(r'\s+'), ' '); // Quita marcas sueltas y une espacios
}

/// Recorta un texto sin fallar si los límites se salen (igual que slice de JavaScript).
String _slice(String s, int start, int end) {
  final a = start.clamp(0, s.length); // Inicio dentro del texto
  final b = end.clamp(a, s.length); // Fin dentro del texto
  return s.substring(a, b); // Trozo
}

/// Convierte "1.200", "1,200", "12.5" o "cinco" en número.
num? _toNumber(String token) {
  final clean = token.replaceAll(RegExp(r'[.,](?=\d{3}\b)'), '').replaceFirst(',', '.'); // Quita separadores de miles y usa punto decimal
  if (RegExp(r'^\d+(\.\d+)?$').hasMatch(clean)) {
    // Es una cifra
    final d = double.parse(clean); // La convierte
    return d == d.truncateToDouble() ? d.toInt() : d; // Entero si no tiene decimales
  }
  return _numberWords[token]; // Palabra conocida o null
}

const _num = r'(\d(?:[\d.,]*\d)?|un|una|uno|one|dos|two|tres|three|cuatro|four|cinco|five|seis|six|siete|seven|ocho|eight|nueve|nine|diez|ten|once|doce|twelve|quince|fifteen|veinte|twenty)'; // Número en cifras o palabras

({num? n, String? type}) _findTravelers(String t) {
  if (RegExp(r'\b(sol[oa]|by myself|alone|viajo solo|viajo sola|solo traveler)\b').hasMatch(t)) return (n: 1, type: 'solo'); // Viaja sola o solo
  if (RegExp(r'\b(mi pareja|en pareja|mi esposa|mi esposo|my partner|my wife|my husband|honeymoon|luna de miel)\b').hasMatch(t) &&
      !RegExp(r'\bhij[oa]s?\b|\bkids?\b|\bchildren\b').hasMatch(t)) {
    return (n: 2, type: 'couple'); // Pareja sin hijos
  }
  final m = RegExp('\\bsomos\\s+$_num\\b').firstMatch(t) ?? // "somos cuatro"
      RegExp('\\b$_num\\s+(personas|viajeros|adultos|amigos|people|travell?ers|adults|friends|of us)\\b').firstMatch(t) ?? // "4 personas"
      RegExp('\\bwe are\\s+$_num\\b').firstMatch(t) ?? // "we are 3"
      RegExp('\\bpara\\s+$_num\\b(?!\\s*(dias|noches|days|nights))').firstMatch(t); // "para 2" (que no sean días)
  final n = m != null ? _toNumber(m.group(1)!) : null; // Cantidad encontrada
  final family = RegExp(r'\b(familia|hij[oa]s|ninos|ninas|family|kids|children)\b').hasMatch(t); // Viajan con familia
  final String? type = family ? 'family' : n != null && n >= 3 ? 'group' : n == 2 ? 'couple' : n == 1 ? 'solo' : null; // Tipo de grupo
  return (n: n != null && n >= 1 && n <= 60 ? n : null, type: type); // Solo cantidades razonables
}

num? _findDays(String t) {
  final d = RegExp('\\b$_num\\s+(dias|days)\\b').firstMatch(t); // "5 días"
  if (d != null) return _toNumber(d.group(1)!); // Días directos
  final n = RegExp('\\b$_num\\s+(noches|nights)\\b').firstMatch(t); // "4 noches"
  if (n != null) {
    final v = _toNumber(n.group(1)!); // Noches
    return v != null && v != 0 ? v + 1 : null; // Noches más uno = días
  }
  if (RegExp(r'\buna semana\b|\ba week\b|\bone week\b').hasMatch(t)) return 7; // Una semana
  if (RegExp(r'\bfin de semana\b|\bweekend\b').hasMatch(t)) return 2; // Fin de semana
  return null; // No se dijo
}

TripBudget? _findBudget(String t) {
  final re = RegExp(r'(us\$|\$|c\$|usd|nio|cordobas?)?\s?(\d(?:[\d.,]*\d)?)\s?(k\b|mil\b)?\s?(dolares|dollars|usd|cordobas?|nio|bucks)?'); // Cifra con moneda opcional
  final all = re.allMatches(t).where((m) {
    final after = _slice(t, m.end, m.end + 14); // Lo que sigue a la cifra
    return !RegExp(r'^\s*(dias|days|noches|nights|personas|people|adultos|adults|viajeros|travell?ers|ninos|kids|de nosotros|of us)\b').hasMatch(after); // Descarta días, noches o personas
  }).toList();
  final withCurrency = all.where((m) => m.group(1) != null || m.group(4) != null).toList(); // Cifras con moneda explícita
  final candidates = withCurrency.isNotEmpty ? withCurrency : all; // Primero las que tienen moneda
  for (final m in candidates) {
    // Cada candidata
    final pre = m.group(1), number = m.group(2)!, mult = m.group(3), post = m.group(4); // Partes de la cifra
    if (pre == null && post == null) {
      // Sin moneda: solo vale si hay una palabra de dinero cerca
      final around = _slice(t, m.start - 25, m.end + 25); // Contexto alrededor
      if (!RegExp(r'\b(presupuesto|budget|tenemos|tengo|gastar|spend)\b').hasMatch(around)) continue; // No parece dinero
    }
    var amount = _toNumber(number); // Cantidad
    if (amount == null) continue; // No es una cifra válida
    if (mult != null) amount = amount * 1000; // "2k" o "10 mil"
    final tag = '${pre ?? ''} ${post ?? ''}'; // Marcas de moneda juntas
    final String? currency = RegExp(r'c\$|cordoba|nio').hasMatch(tag) ? 'NIO' : RegExp(r'us\$|\$|usd|dolar|dollar|bucks').hasMatch(tag) ? 'USD' : null; // Moneda
    final after = _slice(t, m.end, m.end + 30); // Lo que sigue (para el alcance)
    final scope = RegExp(r'^\s*(por persona|cada uno|cada una|per person|each|pp\b)').hasMatch(after)
        ? 'per_person' // Por persona
        : RegExp(r'^\s*(por dia|al dia|per day|a day|daily)').hasMatch(after)
            ? 'per_day' // Por día
            : RegExp(r'\b(en total|total|entre todos|in total|altogether)\b').hasMatch(after) || RegExp(r'\b(tenemos|we have)\b').hasMatch(t)
                ? 'total' // En total
                : 'unknown'; // Sin indicar
    return TripBudget(amount, currency, scope); // Primer presupuesto válido
  }
  return null; // No se mencionó presupuesto
}

final _interestPatterns = <(String, RegExp)>[
  ('beach', RegExp(r'\b(playas?|beach(es)?|surf|mar|costa|ocean)\b')), // Playa
  ('food', RegExp(r'\b(gastronomia|comida|comer|platos?|food|cuisine|eat|restaurantes?)\b')), // Comida
  ('small_business', RegExp(r'\b(pequenos? negocios|emprendimientos?|emprendedores?|negocios locales|local business(es)?|small business(es)?|artesan[oa]s?)\b')), // Pequeños negocios
  ('nature', RegExp(r'\b(naturaleza|reservas?|bosques?|senderos?|nature|hiking|caminata|wildlife|aves|birds?)\b')), // Naturaleza
  ('volcano', RegExp(r'\b(volcan(es)?|volcano(es)?|crater)\b')), // Volcanes
  ('culture', RegExp(r'\b(cultura|museos?|tradiciones|culture|museums?|arte|art)\b')), // Cultura
  ('history', RegExp(r'\b(historia|historico|colonial|history|historic)\b')), // Historia
  ('adventure', RegExp(r'\b(aventura|adventure|kayak|canopy|rappel|sandboarding)\b')), // Aventura
  ('coffee', RegExp(r'\b(cafe|coffee|cafetal|finca de cafe)\b')), // Café
  ('nightlife', RegExp(r'\b(vida nocturna|fiesta|nightlife|bares?)\b')), // Vida nocturna
  ('family', RegExp(r'\b(familia|ninos|kids|family)\b')), // En familia
]; // Mismo orden que la web

String? _findDate(String t) {
  final iso = RegExp(r'\b(20\d{2})-(\d{2})-(\d{2})\b').firstMatch(t); // Fecha AAAA-MM-DD
  return iso != null ? '${iso.group(1)}-${iso.group(2)}-${iso.group(3)}' : null; // La fecha o null
}

/// Interpreta el texto del viaje.
TripIntent parseTripIntent(String text) {
  final t = _norm(text); // Texto normalizado
  final travelers = _findTravelers(t); // Personas y tipo de grupo
  final days = _findDays(t); // Días
  final budget = _findBudget(t); // Presupuesto
  final interests = [for (final (key, re) in _interestPatterns) if (re.hasMatch(t)) key]; // Intereses
  final startDate = _findDate(t); // Fecha de inicio
  final bool? hasVehicle = RegExp(r'\b(sin (carro|vehiculo|auto)|transporte publico|bus|no car|public transport)\b').hasMatch(t)
      ? false // Sin vehículo
      : RegExp(r'\b(alquilar(emos)? (un )?(carro|auto)|con (carro|vehiculo)|rent(ing)? a car|our car|nuestro carro)\b').hasMatch(t)
          ? true // Con vehículo
          : null; // No se dijo
  final accessibilityNeeds = RegExp(r'\b(silla de ruedas|movilidad reducida|accesib|wheelchair|reduced mobility|discapacidad|disability)\b').hasMatch(t); // Accesibilidad

  final missing = <String>[
    if (travelers.n == null) 'travelers', // Falta cuántos son
    if (days == null) 'days', // Faltan los días
    if (budget != null && budget.currency == null) 'budget_currency', // Falta la moneda
    if (startDate == null) 'dates', // Faltan las fechas
    if (hasVehicle == null) 'transport', // Falta el transporte
  ];

  return TripIntent(
    travelers: travelers.n, // Personas
    days: days, // Días
    budget: budget, // Presupuesto
    interests: interests, // Intereses
    startDate: startDate, // Fecha
    travelerType: travelers.type, // Tipo de grupo
    hasVehicle: hasVehicle, // Vehículo
    accessibilityNeeds: accessibilityNeeds, // Accesibilidad
    missing: missing, // Lo que falta
  );
}

num _round2(num n) => (n * 100).round() / 100; // Redondea a dos decimales

/// Presupuesto por persona y por día, solo si los datos lo permiten (sin redondeos engañosos).
BudgetBreakdown? budgetBreakdown(TripIntent intent) {
  final b = intent.budget; // Presupuesto mencionado
  if (b == null || b.currency == null) return null; // Sin moneda no se puede desglosar
  final people = intent.travelers, days = intent.days; // Personas y días
  num? total; // Total calculado
  if (b.scope == 'total' || b.scope == 'unknown') total = b.amount; // Ya es el total
  if (b.scope == 'per_person' && people != null && people != 0) total = b.amount * people; // Por persona por cantidad de personas
  if (b.scope == 'per_day' && days != null && days != 0) total = b.amount * days; // Por día por cantidad de días
  if (total == null) return null; // No alcanza la información
  final perPerson = people != null && people != 0 ? _round2(total / people) : null; // Por persona
  final perPersonPerDay = people != null && people != 0 && days != null && days != 0 ? _round2(total / people / days) : null; // Por persona al día
  return BudgetBreakdown(total, perPerson, perPersonPerDay, b.currency!); // Desglose
}
