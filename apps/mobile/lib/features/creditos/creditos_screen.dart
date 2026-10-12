import 'package:flutter/material.dart'; // Componentes visuales de Flutter
import 'package:url_launcher/url_launcher.dart'; // Abrir la página de origen de cada foto

import '../../core/data/fotos.dart'; // Fotos reales con licencia libre
import '../../core/i18n/t.dart'; // Textos traducidos
import '../../core/theme.dart'; // Colores y espaciados

/// Créditos de todas las fotos reales: lugar, autor, licencia y enlace a la original en Wikimedia Commons.
class CreditosScreen extends StatelessWidget {
  const CreditosScreen({super.key}); // Constructor constante

  @override
  Widget build(BuildContext context) {
    final fotos = FotosReales.todas(); // Todas las fotos
    final tv = context.tv; // Colores
    return Scaffold(
      appBar: AppBar(title: Text(context.t('credits.title'))), // Título
      body: ListView(
        padding: const EdgeInsets.all(TvSpace.s4), // Márgenes
        children: [
          Text(context.t('credits.intro'), style: TextStyle(color: tv.inkMuted)), // Agradecimiento
          const SizedBox(height: TvSpace.s4), // Espacio
          for (final f in fotos)
            Card(
              clipBehavior: Clip.antiAlias, // Recorta la foto a la tarjeta
              margin: const EdgeInsets.only(bottom: TvSpace.s4), // Separación
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start, // Alineado a la izquierda
                children: [
                  AspectRatio(aspectRatio: 16 / 10, child: Image.asset(f.asset, fit: BoxFit.cover, semanticLabel: f.lugar)), // Vista de la foto
                  ListTile(
                    title: Text(f.lugar), // Lugar
                    subtitle: Text(context.t('photo.credit', {'author': f.autor, 'license': f.licencia})), // Autor y licencia
                    trailing: const Icon(Icons.open_in_new), // Abre la original
                    onTap: () => launchUrl(Uri.parse(f.pagina), mode: LaunchMode.externalApplication), // Página en Commons
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
