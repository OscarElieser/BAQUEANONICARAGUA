import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Acceso a los proveedores

import '../../core/i18n/t.dart'; // Textos traducidos
import '../../core/theme.dart'; // Colores y espaciados del sistema de diseño
import 'legal_content.dart'; // Textos legales

/// Lista de páginas institucionales y legales: Sobre nosotros, Privacidad, Cookies, Términos, Accesibilidad, Contacto.
class LegalIndexScreen extends ConsumerWidget {
  const LegalIndexScreen({super.key}); // Constructor constante

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final legal = ref.watch(legalProvider); // Textos cargados (o cargando)
    return Scaffold(
      appBar: AppBar(title: Text(context.t('profile.legal'))), // Barra superior con botón de volver
      body: legal.when(
        loading: () => const Center(child: CircularProgressIndicator()), // Mientras carga
        error: (_, __) => Center(child: Text(context.t('legal.load_error'))), // Error claro
        data: (file) => ListView(
          padding: const EdgeInsets.symmetric(vertical: TvSpace.s4), // Margen vertical
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: TvSpace.s6), // Margen lateral
              child: _BorradorChip(note: file.statusNote), // Aviso de borrador visible
            ),
            const SizedBox(height: TvSpace.s3), // Espacio
            for (final page in file.pages)
              ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: TvSpace.s6, vertical: TvSpace.s1), // Área táctil amplia
                title: Text(page.title, style: Theme.of(context).textTheme.titleLarge), // Título de la página
                subtitle: Text(page.summary), // Resumen
                trailing: const Icon(Icons.chevron_right), // Indica que se abre
                onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => LegalPageScreen(page: page, file: file))), // Abre la página
              ),
          ],
        ),
      ),
    );
  }
}

/// Una página legal con sus secciones como un sendero de lectura.
class LegalPageScreen extends StatelessWidget {
  const LegalPageScreen({super.key, required this.page, required this.file}); // Recibe la página y el archivo
  final LegalPage page; // Página a mostrar
  final LegalFile file; // Archivo (para la versión y el aviso)

  @override
  Widget build(BuildContext context) {
    final tv = context.tv; // Colores del tema
    final text = Theme.of(context).textTheme; // Estilos de texto
    return Scaffold(
      appBar: AppBar(title: Text(page.title)), // Barra con el título
      body: ListView(
        padding: const EdgeInsets.fromLTRB(TvSpace.s6, TvSpace.s4, TvSpace.s6, TvSpace.s12), // Márgenes
        children: [
          Text(page.summary, style: text.bodyLarge?.copyWith(color: tv.inkMuted)), // Resumen
          const SizedBox(height: TvSpace.s3), // Espacio
          Wrap(
            spacing: TvSpace.s2, // Espacio horizontal
            runSpacing: TvSpace.s2, // Espacio vertical
            children: [
              Chip(label: Text(context.t('legal.version', {'date': _fecha(file.version)}))), // Fecha de la versión
              _BorradorChip(note: file.statusNote), // Aviso de borrador
            ],
          ),
          const SizedBox(height: TvSpace.s6), // Espacio
          for (final s in page.sections)
            Container(
              decoration: BoxDecoration(border: Border(left: BorderSide(color: tv.line))), // Línea del sendero
              padding: const EdgeInsets.only(left: TvSpace.s4, bottom: TvSpace.s6), // Separación de la línea
              child: Semantics(
                header: true, // Para lectores de pantalla, la sección empieza con un encabezado
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
                  children: [
                    Text(s.heading, style: text.headlineSmall), // Título de la sección
                    for (final p in s.body)
                      Padding(padding: const EdgeInsets.only(top: TvSpace.s2), child: _TextoLegal(text: p)), // Párrafo
                    for (final it in s.items)
                      Padding(
                        padding: const EdgeInsets.only(top: TvSpace.s2), // Espacio entre puntos
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start, // Viñeta alineada arriba
                          children: [
                            const Padding(padding: EdgeInsets.only(right: TvSpace.s2), child: Text('•')), // Viñeta
                            Expanded(child: _TextoLegal(text: it)), // Texto del punto
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// Convierte "2026-10-12" en "12/10/2026" (formato de Nicaragua).
  static String _fecha(String iso) {
    final p = iso.split('-'); // Año, mes y día
    return p.length == 3 ? '${p[2]}/${p[1]}/${p[0]}' : iso; // Día/mes/año
  }
}

/// Aviso de borrador con borde punteado, igual que en la web.
class _BorradorChip extends StatelessWidget {
  const _BorradorChip({required this.note}); // Recibe el texto
  final String note; // Texto del aviso

  @override
  Widget build(BuildContext context) {
    final tv = context.tv; // Colores
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: TvSpace.s3, vertical: TvSpace.s1 + 2), // Relleno
      decoration: BoxDecoration(border: Border.all(color: tv.oroText), borderRadius: BorderRadius.circular(999)), // Píldora con borde
      child: Text(note, style: TextStyle(color: tv.oroText)), // Texto en oro legible
    );
  }
}

/// Texto que resalta los [marcador: …] para que nadie los confunda con datos reales.
class _TextoLegal extends StatelessWidget {
  const _TextoLegal({required this.text}); // Recibe el texto
  final String text; // Texto completo

  @override
  Widget build(BuildContext context) {
    final tv = context.tv; // Colores
    final base = Theme.of(context).textTheme.bodyLarge; // Estilo base
    return Text.rich(
      TextSpan(
        style: base, // Estilo general
        children: [
          for (final part in splitMarkers(text))
            TextSpan(
              text: part.text, // Trozo de texto
              style: part.marker ? TextStyle(color: tv.oroText, fontWeight: FontWeight.w700, decoration: TextDecoration.underline, decorationStyle: TextDecorationStyle.dashed) : null, // Marcador resaltado
            ),
        ],
      ),
    );
  }
}
