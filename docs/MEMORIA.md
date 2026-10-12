# Memoria del proyecto

Resumen de todo lo conversado y decidido con el dueño del proyecto, para que cualquier persona o sesión nueva de Claude siga sin perder el hilo. **Leer antes de trabajar.** Se actualiza al final de cada etapa.

Última actualización: 2026-10-12 (destinos y negocios con mundo propio).

## 1. Qué estamos construyendo

**Ecosistema Turístico Inteligente de Nicaragua**, construido desde cero en este repositorio:

- web: PWA con Next.js;
- app Android: Flutter;
- API: NestJS;
- datos: Supabase (PostgreSQL con RLS) y funciones de Supabase (Edge Functions);
- identidad: Firebase Auth;
- infraestructura: Hostinger (VPS con Docker), Cloudflare y GitHub Actions;
- interfaz en 10 idiomas: es, en, zh-Hans, ko, it, fr, pt, de, ru y ja.

El nombre de la marca aún no está definido: se muestra como `[Marca]`.

## 2. Reglas del dueño (siempre vigentes)

1. **Cada línea de código lleva un comentario en español** que explique qué hace y para qué. Está en `CLAUDE.md`.
2. **Diseño único y original.** No usar plantillas de terceros (por ejemplo Envato), por licencia y porque no serían únicas. El dueño lo aceptó: "estamos construyendo desde cero".
3. **Cada página con identidad propia** ("modo pro premium"), manteniendo la identidad de Nicaragua. Se pidieron animaciones, galería en movimiento, tarjetas y 3D.
4. **CI siempre en verde** ("que no salga la X").
5. **No inventar datos:** ni precios, horarios, rutas, negocios, coordenadas, estadísticas ni datos legales o de contacto. Lo que falta se muestra como "por cotizar", "sin confirmar" o `[marcador: …]`. Las ilustraciones se presentan como ilustraciones, nunca como fotos.
6. **Ninguna clave secreta en la web ni en Android.** Nada de `service_role` ni de cuenta de servicio de Firebase en el cliente.
7. **No alterar sistemas existentes sin autorización.** Producción solo con aprobación de una persona.
8. **SEO mundial:** paginación, indexación, sitemap y `hreflang` para que Google y los demás buscadores reconozcan el sitio.
9. **Seguridad, privacidad, accesibilidad y trazabilidad de navegación** son prioridad. La medición solo corre con consentimiento y sin datos personales.
10. **Páginas institucionales:** Sobre nosotros, Privacidad, Cookies, Términos, Accesibilidad y Contacto.

## 3. Cómo se trabaja en el repositorio

- **Una sola rama de trabajo: `desarrollo`.** Cuando CI (6 trabajos) y CodeQL están en verde, `main` avanza a ese mismo commit con `git push origin desarrollo:main`. No se crean ramas nuevas.
- Las capturas de pantalla se guardan en la referencia oculta `refs/capturas/ultima`, que genera el flujo `capturas.yml` en cada cambio de `desarrollo`. El mapa generado se guarda en `refs/datos/mapa`, que genera `datos-mapa.yml`. Ninguna de las dos es una rama.
- **Fuentes únicas, copiadas y verificadas por CI:**
  - textos de interfaz: `content/i18n`, con `scripts/sync_i18n.py`;
  - textos legales: `content/legal`, con `scripts/sync_legal.py`;
  - mapa de los territorios: `content/territorios/mapa.json`, con `scripts/sync_mapa.py`;
  - colores: `design/sistema/tokens.json`, verificados por `scripts/check_tokens.py`.
- Toda tabla nueva lleva RLS y pruebas en `supabase/tests/rls_smoke.sql`.
- Las traducciones sin revisión nativa van marcadas `needs_review`, y la web y la app lo avisan.

## 4. Historia de lo pedido y hecho (en orden)

1. **Fases 0 a 6:**
   - arquitectura y esquemas de base de datos con RLS (identidad, territorio, turismo, auditoría, viajes, comunidad, mensajería, denuncias, IA y cultura);
   - núcleo del asistente (`packages/ai-core`);
   - Ops Center con permisos y auditoría;
   - denuncias confidenciales;
   - cultura y música con licencias;
   - clima.
2. **Login completo** en web y Android con Firebase Auth.
3. **Funciones de Supabase en lugar de Firebase Functions.** Fue pedido del dueño. La función `preparar-sesion` verifica el token de Firebase, crea el perfil, bloquea cuentas suspendidas y asigna el rol.
4. **Relieve vivo 3D** (Ometepe) en web y Android.
5. **Docker, Riverpod, seguridad, privacidad, accesibilidad y medición de navegación anónima con consentimiento.** Incluye:
   - páginas legales;
   - aviso de cookies con Global Privacy Control;
   - cabeceras de seguridad, CodeQL, Dependabot y `pnpm audit`;
   - revisión axe WCAG 2.2 AA en CI.
6. **Fase 7:** paridad de Android con la web en catálogo, fichas, Mi aventura, Comunidad y mensajería.
7. **Fase 9:** interfaz en 10 idiomas en web y Android.
8. **Ramas:** el dueño pidió proteger `main` y quitar las ramas extra. Claude no tiene permisos de administrador y el proxy bloquea borrar ramas, así que se adoptó la rama única `desarrollo`. Los pasos para que el dueño proteja `main` están en `docs/SEGURIDAD.md`.
9. **Fase 10:** flujo de publicación manual con aprobación y vuelta atrás automática. Ver `docs/DESPLIEGUE.md`.
10. **SEO:**
    - sitemap en 10 idiomas, canónicas, `hreflang` y `x-default`;
    - datos estructurados de schema.org;
    - paginación real, con `noindex, follow` en búsquedas y páginas siguientes.
11. **"Muéstrame la página en Chrome":** se resolvió con capturas automáticas en Chromium desde CI.
12. **Mapa ilustrado de los 17 territorios** en web y Android:
    - fuente: Natural Earth, dominio público;
    - aviso de que los límites oficiales los publica INETER;
    - cada territorio se resalta y, si está publicado, abre su ficha.
13. **Diseño "pro premium", con un mundo propio por sección:**
    - **Común a todo:** verde territorial, oro, curvas de nivel y letra de lectura Atkinson Hyperlegible.
    - **Portada:** Young Serif, desfile en movimiento de las 17 portadas (con pausa, pausa al apuntar y al usar el teclado, y sin movimiento si se pide), mapa vivo y entrada a Cultura.
    - **Territorios:**
      - cada portada sale de la silueta real del territorio, con curvas de nivel;
      - colores según su zona de paisaje: Pacífico volcánico, Centro-norte de montaña, y Caribe y Río San Juan (es una agrupación de diseño, no oficial);
      - la ficha tiene un relieve 3D "tejido en columnas" de la silueta; las alturas son ilustrativas y así se dice.
    - **Cultura:** barro de San Juan de Oriente, greca precolombina que se traza al cargar y letra Caprasimo. Existe en web y Android.
    - **Comunidad:** hamacas de Masaya (franja que se teje al cargar), letra Bricolage Grotesque y relatos colgados de hilos de colores.
    - **Mi aventura:** buses pintados (añil con franjas), rótulo en Anybody que se estira al llegar y ruta ilustrativa que se dibuja.
    - **Destinos:** cabecera en forma de boleto de viaje con talón perforado, que lleva la portada de su territorio real y enlaza a él. Las tarifas van como talones con fecha y fuente. Existe en web y Android.
    - **Negocios:** mundo de Nuestra gente (franja de hamaca y Bricolage Grotesque). Lo que ofrece va como pizarra de pulpería, oscura y con puntos guía hasta el precio. Existe en web y Android.
    - **Mapa y páginas legales:** calma, solo la letra de lectura.
14. **Skills sugeridas por el dueño:**
    - Ya activas: Frontend Design, PDF, Word, PowerPoint, Excel y Skill Creator.
    - No se pudieron instalar desde aquí (el registro npm está bloqueado y son de terceros sin revisar): UI/UX Pro Max, Impeccable, Superpowers, Super Memory, MCP Builder y el pack de Marketing.
    - "Webapp testing" ya lo cubren el CI y las capturas, y "memoria" la cubren este archivo y `CLAUDE.md`.

## 4b. Estado del proyecto oficial (revisado el 2026-10-12)

- Supabase `nupjhqrvxjrngtpslfjq`: las 15 migraciones originales ya están aplicadas por el dueño. Hay 17 territorios, todos en borrador (0 publicados), y ningún destino ni negocio. `app.settings.firebase_project_id` está vacío (el seed no corrió).
- La web y la app traen por defecto la configuración pública del proyecto oficial (`apps/web/src/config/publica.json` y `apps/mobile/lib/core/env.dart`). El entorno puede reemplazarla. Nunca se ponen claves secretas.
- La migración 0016 (search_path fijo en 8 funciones) está en el repositorio, pero no se ha aplicado en producción: falta la aprobación del dueño.
- Avisos del asesor de seguridad que quedan:
  - las vistas `public_*` con SECURITY DEFINER (es a propósito: exponen solo lo publicado; revisar si se pasan a security_invoker);
  - `public.rls_auto_enable()` se puede ejecutar sin sesión; no es de nuestras migraciones.
- Android: falta registrar la app Android en Firebase (paquete `com.baqueano.nicaragua`) y agregar su `google-services.json`. Sin ese archivo, `flutter build apk` falla. Hoy usa el appId de la app web.

## 5. Pendiente del dueño (Claude no puede hacerlo)

- Proteger `main` en GitHub y borrar las ramas viejas: ci-verde, fase-6, login, ops-center, relieve-3d, funciones-supabase, seguridad-legal, fase-7-android, fase-9-idiomas e idiomas-lote-2. Cerrar los PR viejos de Dependabot.
- Dar las cuentas para publicar: VPS de Hostinger, Cloudflare, dominio y proveedor de mapas (cuentas de Firebase `baqueanonicaragua-95755` y Supabase `nupjhqrvxjrngtpslfjq` ya agregadas y configuradas).
- Revisión legal de los textos de `content/legal` y los datos de la empresa (hoy van como `[marcador]`).
- Revisión nativa de las 9 traducciones.
- Elegir el nombre de la marca y el proveedor de IA para el chat.

## 6. Próximos pasos propuestos

1. Conectar Supabase de staging para ver las fichas reales (territorio, destino y negocio) en las capturas.
2. Al tener las cuentas: desplegar en staging, probar el inicio de sesión de punta a punta, y luego Search Console y Bing Webmaster Tools.
3. Fotos reales verificadas que reemplacen a las ilustraciones en la galería, siempre con crédito y licencia.

## 7. Límites del entorno donde trabaja Claude

- El registro npm y raw.githubusercontent están bloqueados; GitHub sí funciona. No hay Flutter, Dart ni Deno locales, así que las pruebas de Android corren en CI.
- Para ver la web localmente se usa un arnés de vista previa con esbuild, Tailwind y Playwright; las fuentes salen de github.com/google/fonts.
- Los registros de CI no se pueden descargar. Los errores se leen como anotaciones.
