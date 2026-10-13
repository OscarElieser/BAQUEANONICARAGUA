import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod
import 'package:intl/intl.dart'; // Formato de fechas y dinero

import '../../core/data/viajes.dart'; // Viajes y favoritos
import '../../core/i18n/t.dart'; // Textos traducidos
import '../../core/theme.dart'; // Colores y espaciados
import '../auth/auth_repository.dart'; // Sesión
import '../catalog/business_screen.dart'; // Ficha de negocio
import '../catalog/destination_screen.dart'; // Ficha de destino
import 'trip_intent.dart'; // Lo entendido

/// Formulario para guardar lo entendido como viaje. Sin sesión, explica que hay que entrar.
class GuardarViaje extends ConsumerStatefulWidget {
  const GuardarViaje({super.key, required this.intent}); // Constructor
  final TripIntent intent; // Lo entendido

  @override
  ConsumerState<GuardarViaje> createState() => _GuardarViajeState(); // Crea el estado
}

class _GuardarViajeState extends ConsumerState<GuardarViaje> {
  late final TextEditingController _titulo; // Nombre del viaje
  String _estado = 'idle'; // idle, saving, saved o error

  @override
  void initState() {
    super.initState(); // Estado base
    _titulo = TextEditingController(); // Se completa al dibujar (necesita el idioma)
  }

  @override
  void dispose() {
    _titulo.dispose(); // Libera el controlador
    super.dispose(); // Libera el resto
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authStateProvider).valueOrNull; // Persona con sesión (o null)
    if (user == null) return Padding(padding: const EdgeInsets.only(top: TvSpace.s4), child: Text(context.t('trips.sign_in_to_save_app'), style: TextStyle(color: context.tv.inkMuted))); // Sin sesión
    if (_titulo.text.isEmpty) _titulo.text = widget.intent.days != null ? context.t('trips.default_title_days', {'n': widget.intent.days!}) : context.t('trips.default_title'); // Nombre sugerido
    return Padding(
      padding: const EdgeInsets.only(top: TvSpace.s4), // Separación
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
        children: [
          TextField(controller: _titulo, maxLength: 120, decoration: InputDecoration(labelText: context.t('trips.name'))), // Nombre editable
          FilledButton(
            onPressed: _estado == 'saving' || _estado == 'saved'
                ? null // Ya se guardó o está guardando
                : () async {
                    setState(() => _estado = 'saving'); // Guardando
                    try {
                      await ref.read(viajesRepositoryProvider).guardar(_titulo.text, widget.intent, budgetBreakdown(widget.intent)); // Guarda en Supabase
                      ref.invalidate(misViajesProvider); // Recarga la lista
                      if (mounted) setState(() => _estado = 'saved'); // Listo
                    } catch (_) {
                      if (mounted) setState(() => _estado = 'error'); // Falló
                    }
                  },
            child: Text(context.t(_estado == 'saved' ? 'trips.saved' : 'trips.save')), // Guardar / Guardado
          ),
          if (_estado == 'saved') Text(context.t('trips.saved_note'), style: TextStyle(color: context.tv.statusVerified)), // Dónde verlo
          if (_estado == 'error') Text(context.t('trips.error'), style: TextStyle(color: context.tv.statusAlert)), // Error claro
        ],
      ),
    );
  }
}

/// Lista de viajes y lugares guardados con la cuenta (los mismos de la web).
class MisViajes extends ConsumerWidget {
  const MisViajes({super.key}); // Constructor

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tv = context.tv; // Colores
    final text = Theme.of(context).textTheme; // Estilos
    final user = ref.watch(authStateProvider).valueOrNull; // Sesión
    final locale = Localizations.localeOf(context).toLanguageTag(); // Idioma para formatos
    final titulo = Semantics(header: true, child: Text(context.t('trips.title'), style: text.titleLarge)); // "Mis viajes y lugares guardados"
    if (user == null) return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [titulo, const SizedBox(height: TvSpace.s2), Text(context.t('trips.sign_in_app'), style: TextStyle(color: tv.inkMuted))]); // Sin sesión
    final datos = ref.watch(misViajesProvider); // Viajes y favoritos
    String fecha(String iso) => DateFormat.yMMMd(locale).format(DateTime.parse(iso)); // Fecha legible
    String dinero(num n, String c) => NumberFormat.simpleCurrency(locale: locale, name: c).format(n); // Dinero
    Widget falta() => Text(context.t('planner.not_given'), style: TextStyle(color: tv.oroText)); // Dato que no se dio
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
      children: [
        titulo,
        const SizedBox(height: TvSpace.s2), // Espacio
        datos.when(
          loading: () => const LinearProgressIndicator(), // Cargando
          error: (_, __) => Text(context.t('trips.error'), style: TextStyle(color: tv.statusAlert)), // Error
          data: (d) => Column(
            crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
            children: [
              if (d.$1.isEmpty) Text(context.t('trips.empty'), style: TextStyle(color: tv.inkMuted)), // Aún no hay viajes
              for (final v in d.$1)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(TvSpace.s4), // Relleno
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
                      children: [
                        Text(v.title, style: text.titleMedium), // Nombre
                        Text('${context.t('planner.travelers')}: ${v.travelers ?? '—'}'), // Personas
                        Row(children: [Text('${context.t('trips.dates')}: '), if (v.startsOn != null) Text('${fecha(v.startsOn!)}${v.endsOn != null ? ' – ${fecha(v.endsOn!)}' : ''}') else falta()]), // Fechas
                        Row(children: [Text('${context.t('planner.budget')}: '), if (v.budgetAmount != null && v.budgetCurrency != null) Text(dinero(v.budgetAmount!, v.budgetCurrency!)) else falta()]), // Presupuesto
                        if (v.interests.isNotEmpty) Text('${context.t('planner.interests')}: ${v.interests.map((i) => context.t('interest.$i')).join(', ')}'), // Intereses
                        Align(
                          alignment: Alignment.centerRight, // A la derecha
                          child: TextButton(
                            onPressed: () async {
                              final ok = await showDialog<bool>(context: context, builder: (c) => AlertDialog(content: Text(c.t('trips.delete_confirm')), actions: [TextButton(onPressed: () => Navigator.pop(c, false), child: Text(c.t('common.cancel'))), FilledButton(onPressed: () => Navigator.pop(c, true), child: Text(c.t('trips.delete')))])); // Pide confirmación
                              if (ok == true) {
                                await ref.read(viajesRepositoryProvider).borrar(v.id); // Borra
                                ref.invalidate(misViajesProvider); // Recarga
                              }
                            },
                            child: Text(context.t('trips.delete')), // Borrar
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: TvSpace.s4), // Espacio
              Text(context.t('trips.saved_places'), style: text.titleMedium), // "Lugares guardados"
              if (d.$2.isEmpty) Text(context.t('trips.no_places'), style: TextStyle(color: tv.inkMuted)), // Aún no hay lugares
              for (final f in d.$2)
                ListTile(
                  contentPadding: EdgeInsets.zero, // Sin márgenes extra
                  title: Text(f.name), // Nombre
                  subtitle: Text(context.t(f.tipo == 'destino' ? 'search.destination' : 'search.business')), // Tipo
                  trailing: const Icon(Icons.chevron_right), // Se abre
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => f.tipo == 'destino' ? DestinationScreen(slug: f.slug, name: f.name) : BusinessScreen(slug: f.slug, name: f.name))), // Abre la ficha
                ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Botón "Guardar" de las fichas. Sin sesión no se muestra (la ficha ya invita a entrar desde Perfil).
class BotonFavorito extends ConsumerStatefulWidget {
  const BotonFavorito({super.key, required this.tipo, required this.id}); // Constructor
  final String tipo; // 'destino' o 'negocio'
  final String id; // Identificador del lugar

  @override
  ConsumerState<BotonFavorito> createState() => _BotonFavoritoState(); // Crea el estado
}

class _BotonFavoritoState extends ConsumerState<BotonFavorito> {
  bool? _guardado; // null = todavía no se sabe

  @override
  void initState() {
    super.initState(); // Estado base
    Future.microtask(() async {
      if (ref.read(authStateProvider).valueOrNull == null) return; // Sin sesión no se consulta
      try {
        final g = await ref.read(viajesRepositoryProvider).esFavorito(widget.tipo, widget.id); // Estado real
        if (mounted) setState(() => _guardado = g); // Lo muestra
      } catch (_) {
        if (mounted) setState(() => _guardado = false); // Si falla, como no guardado
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (ref.watch(authStateProvider).valueOrNull == null) return const SizedBox.shrink(); // Sin sesión
    return OutlinedButton.icon(
      onPressed: _guardado == null
          ? null // Consultando
          : () async {
              try {
                final nuevo = await ref.read(viajesRepositoryProvider).alternar(widget.tipo, widget.id, _guardado!); // Cambia
                ref.invalidate(misViajesProvider); // Recarga la lista de guardados
                if (mounted) setState(() => _guardado = nuevo); // Muestra el estado nuevo
              } catch (_) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.t('trips.error')))); // Error claro
              }
            },
      icon: Icon(_guardado == true ? Icons.bookmark : Icons.bookmark_border), // Icono según el estado
      label: Text(context.t(_guardado == true ? 'fav.saved' : 'fav.save')), // Texto según el estado
    );
  }
}
