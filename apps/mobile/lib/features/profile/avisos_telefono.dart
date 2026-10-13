import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Proveedores de Riverpod

import '../../core/data/avisos.dart'; // Avisos push
import '../../core/i18n/t.dart'; // Textos traducidos
import '../../core/theme.dart'; // Colores y espaciados

/// Avisos de este teléfono, dentro del Perfil. Dice la verdad en cada estado (los mismos textos que la web).
class AvisosTelefono extends ConsumerStatefulWidget {
  const AvisosTelefono({super.key}); // Constructor

  @override
  ConsumerState<AvisosTelefono> createState() => _AvisosTelefonoState(); // Crea el estado
}

class _AvisosTelefonoState extends ConsumerState<AvisosTelefono> {
  EstadoAvisos? _estado; // null mientras revisa
  bool _ocupado = false; // Si está activando o apagando
  bool _fallo = false; // Si la última acción falló

  @override
  void initState() {
    super.initState(); // Inicio normal
    ref.read(avisosRepositoryProvider).estado().then((e) {
      if (mounted) setState(() => _estado = e); // Estado real al abrir
    });
  }

  Future<void> _cambiar(Future<EstadoAvisos> Function() accion) async {
    setState(() {
      _ocupado = true; // Bloquea el botón
      _fallo = false; // Limpia el error anterior
    });
    try {
      final e = await accion(); // Ejecuta
      if (mounted) setState(() => _estado = e); // Nuevo estado real
    } catch (_) {
      if (mounted) setState(() => _fallo = true); // Error claro
    } finally {
      if (mounted) setState(() => _ocupado = false); // Libera el botón
    }
  }

  @override
  Widget build(BuildContext context) {
    final tv = context.tv; // Colores
    final repo = ref.read(avisosRepositoryProvider); // Avisos
    final activado = _estado == EstadoAvisos.activado; // Si ya recibe avisos
    return Container(
      padding: const EdgeInsets.all(TvSpace.s4), // Relleno
      decoration: BoxDecoration(color: tv.groundRaised, borderRadius: BorderRadius.circular(16), border: Border.all(color: tv.line)), // Tarjeta
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
        children: [
          Text(context.t('avisos.title_app'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)), // Título
          const SizedBox(height: TvSpace.s2), // Espacio
          Text(context.t('avisos.text'), style: TextStyle(color: tv.inkMuted, fontSize: 14)), // Para qué sirven
          const SizedBox(height: TvSpace.s3), // Espacio
          if (_estado == null) Text('${context.t('common.loading')}…', style: TextStyle(color: tv.inkMuted)), // Revisando
          if (_estado == EstadoAvisos.noSoportado) Text(context.t('avisos.unsupported_app')), // No se puede aquí
          if (_estado == EstadoAvisos.bloqueado) Text(context.t('avisos.blocked_app'), style: TextStyle(color: tv.oroText)), // Cómo desbloquearlos
          if (activado) Text(context.t('avisos.on_app'), style: TextStyle(color: tv.statusVerified, fontWeight: FontWeight.w700)), // Confirmación
          if (_estado == EstadoAvisos.apagado || activado) ...[
            const SizedBox(height: TvSpace.s2), // Espacio
            activado
                ? OutlinedButton(onPressed: _ocupado ? null : () => _cambiar(repo.apagar), child: Text(_ocupado ? context.t('avisos.working') : context.t('avisos.disable'))) // Apagar
                : FilledButton(onPressed: _ocupado ? null : () => _cambiar(repo.activar), child: Text(_ocupado ? context.t('avisos.working') : context.t('avisos.enable'))), // Activar
          ],
          if (_fallo) ...[
            const SizedBox(height: TvSpace.s2), // Espacio
            Text(context.t('avisos.error'), style: TextStyle(color: tv.statusAlert)), // Error claro
          ],
        ],
      ),
    );
  }
}
