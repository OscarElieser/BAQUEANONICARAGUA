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
15. **"Modo pro premium" (diseño, frontend, backend, web y Android), 12 de octubre de 2026:**
    - Rendimiento: las formas del mapa se dibujan una sola vez por página (`SpriteMapa`) y la galería y las tarjetas se dibujan en el servidor. El HTML de la portada pasó de 1,25 MB a unos 140 KB.
    - Auditoría con la guía de interfaz (`web-design-guidelines`):
      - la barra del navegador sigue el tema claro u oscuro;
      - toques sin espera ni destello gris;
      - títulos con líneas parejas;
      - cifras del mismo ancho en tarifas y pizarras;
      - el borde punteado de los territorios en verificación vuelve a verse.
    - Mapa por zonas de paisaje (web y Android): cada territorio lleva el color de su zona, el mismo de su portada. Una leyenda con botones resalta una zona y avisa que la agrupación no es oficial.
    - El dueño subió el 12 de octubre librerías oficiales (Firebase, Supabase, Octokit, Cloudflare, ssh2 y `firebase_analytics`). En el mismo envío entraron archivos que no son del proyecto: `.claude/data/healthcare/…sqlite`, `.snapshots/` y `apps/mobile/.flutter-plugins*`. Falta que el dueño confirme si se quitan.

16. **Prompt maestro de BAQUEANO y directiva de integración (12 de octubre de 2026):**
    - El dueño entregó la especificación general del producto:
      - nombre BAQUEANO;
      - eslogan "Descubre lo que no sale en el mapa";
      - asistente BAQÜI;
      - paleta naranja `#F65E01`, turquesa `#165D6F`, verde `#4A7A5A` y azules `#0D1B2A` y `#102A43`;
      - 19 secciones de navegación;
      - BAQUEANO no gestiona reservas: facilita el descubrimiento y el contacto directo;
      - dominio `baqueanonicaragua.com` y correo `baqueanonicaragua@gmail.com`.
    - Directiva de integración:
      - trabajar solo sobre Firebase `baqueanonicaragua-95755`, Supabase `nupjhqrvxjrngtpslfjq`, el repositorio `BAQUEANONICARAGUA`, Cloudflare y Hostinger;
      - sin Azure;
      - conservar el stack actual;
      - no escribir en producción sin migración revisada y respaldo;
      - no declarar completo un módulo solo porque existan tablas o rutas.
    - Hecho: auditoría de la Fase 0 en `docs/AUDITORIA.md`, con una matriz de cinco niveles por módulo, seguridad, riesgos y las decisiones pendientes del dueño. La paleta nueva queda pendiente de decisión y no se aplicó.

17. **Referencias visuales del dueño aplicadas (12 de octubre de 2026):**
    - **Tokens de marca:** `marca-naranja #F65E01`, `marca-turquesa` (`#165D6F` en claro, `#7FC4D2` en oscuro), `marca-verde #4A7A5A`, `marca-nocturno #0D1B2A` y `marca-profundo #102A43`. Se agregaron sin reemplazar la paleta; reemplazarla queda pendiente de decisión del dueño.
    - **Portada** (cartel de Guerrero y video de inmobiliaria):
      - ventana pintada a brochazos con semilla fija (`lib/pincel.ts`, la misma en Android);
      - tres escenas ilustradas por zona, con palabra gigante entre capas;
      - eslogan en dos pesos (Archivo) y firma "Nicaragua" (Kaushan Script);
      - barras para cambiar de escena;
      - botones Explorar Nicaragua y Crear mi viaje.
    - **Explorador a pantalla completa** (VoyageX, Meridian y video): la tarjeta crece hasta ser el fondo con View Transitions; contador 01/17 y riel de avance.
    - **Galería en arco 3D** (referencia de tarjetas y video del carrusel): vista desde dentro de un cilindro, ligada al desplazamiento. Reemplaza al desfile automático.
    - **Ops Center** (Stakent): tema nocturno, barra lateral por grupos y tarjetas con cifras reales, sin gráficas inventadas.
    - **Inicio de sesión** (tarjeta de vidrio y video): arco de luz, pestañas, campos con icono, orbe de marca y tarjeta que se despliega. Solo correo y Google; Apple y teléfono no están configurados.
    - **Cabecera** (video de neumorfismo): selector en relieve con un indicador que se desliza.
    - **Planes para negocios** (`/planes`):
      - precios en C$ y US$, cada uno fijado a mano en `config/planes-negocios.json`;
      - todo queda "Por definir" hasta que el dueño defina nombre, precio y beneficios;
      - sin cobro, porque no hay pasarela de pago;
      - la página no se indexa mientras no esté confirmada.
    - Android tiene la portada, el explorador, la galería en arco, el login de vidrio y la palabra gigante. El Ops Center y los planes solo están en la web.
    - Regla aprendida: no importar `react-dom` en la web (el proyecto no trae sus tipos y CI falla).

18. **"Hacerlo más real" (12 de octubre de 2026):**
    - El dueño eligió usar fotos de Wikimedia Commons ahora y reemplazarlas por fotos propias después.
    - Cómo se consiguen las fotos:
      - el flujo "Datos de fotos" (`scripts/fotos/buscar_fotos.py`) busca candidatas en Commons y las deja en `refs/datos/fotos`;
      - solo entran fotos tomadas en Nicaragua con licencia libre (CC0, dominio público, CC BY o CC BY-SA);
      - las 20 finales se eligieron a mano, mirándolas una por una.
    - Dónde viven:
      - el catálogo único es `content/fotos/fotos.json` (lugar, autor, licencia y origen);
      - las imágenes van en WebP de 1600 y 800 px en `apps/web/public/fotos`;
      - `scripts/sync_fotos.py` valida el catálogo y lo copia a web y Android (paso de CI).
    - Dónde se usan, siempre con crédito visible o en `/creditos`:
      - la portada, dentro de la ventana de pincel;
      - el explorador;
      - la galería, con la silueta del territorio en la esquina;
      - la ficha de cada territorio;
      - Android, que además tiene su propia pantalla de créditos.
    - Las ilustraciones quedan como respaldo donde no haya foto.
    - Próximo paso propuesto: relieves con alturas reales (modelo de elevación público, generado en Actions) y un mapa con proveedor de teselas cuando el dueño lo elija.
19. **Prototipo "BAQUEANO Design Experience" del dueño, tomado como referencia (12 de octubre de 2026):**
    - Lectura elegida: se adoptan sus piezas que encajan sin romper el sistema actual; no se copia tal cual.
    - Adoptado:
      - "Explora a tu manera": mosaico de fotos reales con su crédito (web: 6 caminos a páginas que existen; Android: 4, a mapa, Cultura, Comunidad y Mi aventura);
      - acceso en dos mitades: foto real (Corn Island) con "El mundo es grande. Nicaragua es inolvidable." y el formulario de vidrio al lado (en Android, como cabecera).
    - No adoptado, y por qué:
      - sus fotos de Unsplash no son de Nicaragua;
      - su mapa y sus barras de demostración serían datos inventados;
      - BAQÜI no existe todavía, así que no hay botón ni franja de BAQÜI;
      - la barra lateral del prototipo encaja como estructura del Ops Center (ya la tiene), no en el sitio público;
      - el "che" del saludo no es nicaragüense; los textos siguen el tono de la web.
20. **11 maquetas del dueño (destinos, territorios, gastronomía, música, historia, BAQÜI, experiencias), tomadas como referencia (12 de octubre de 2026):**
    - Adoptado, con datos reales:
      - "17 territorios — 15 departamentos y 2 regiones autónomas" como cifra grande de la sección de territorios;
      - índice de los 17 con foto redonda, tipo (departamento o región autónoma) y estado real de la ficha; solo los publicados se abren (web y Android);
      - fila de fotos redondas de los 17 dentro del explorador (web): al tocar una, ese territorio pasa al frente.
    - Pendiente hasta tener datos reales: conteos por tipo ("42 playas"), valoraciones con estrellas, precios "desde C$", eventos con fechas, testimonios, personas con nombre, cifras como "+260 destinos" o "25K viajeros". Las maquetas los inventan; aquí no se muestran.
    - Gastronomía, música e historia como mundos propios: se harán cuando haya contenido verificado (platos, artistas, hechos con fuente).
    - Maqueta "Departamentos" (catálogo y ficha de Managua): nueva página `/territorios` con los 15 departamentos y las 2 regiones autónomas, foto real, silueta real en el color de su zona y estado de la ficha (solo las publicadas tienen botón). Sin conteos de municipios, destinos, población ni altitud hasta tenerlos comprobados y con fuente. En Android ya está el índice de los 17 en Descubrir.
    - Maqueta "Departamentos y Granada": migas de pan y buscador por nombre en `/territorios`; en la ficha, el nombre va sobre la foto real, "Información general" con datos reales (tipo, cabecera del catálogo, zona) y "Sin confirmar" para población, extensión y altitud, y atajos fijos a cada sección publicada. Los conteos de destinos, municipios y experiencias de la maqueta no se muestran hasta tenerlos.
    - Paquete del dueño "17 departamentos y regiones paginados" (prototipo HTML): se adoptó la lista paginada de municipios (6 por página) en `/territorios/<slug>/municipios?pagina=N`, leyendo Supabase. RLS solo muestra municipios publicados; hoy los 153 están en borrador, así que la página dice que la lista oficial está en revisión. La ficha muestra "N confirmados" o "Sin confirmar" y tiene atajo a Municipios. No se usaron las fotos del paquete (conceptuales, no de cada lugar), ni sus lemas y descripciones (sin fuente), ni su mapa conceptual.
    - Maqueta "Crónicas": nueva página `/cronicas` con relatos reales de `public_feed` (Supabase), filtro por territorio con fotos redondas (`?territorio=slug`), tarjetas con la silueta del territorio, autor, fecha y reacciones reales, y paginación por fecha. "Publicar mi crónica" dice "No disponible todavía" porque la web aún no tiene formulario de publicación. Sin crónicas de ejemplo, vistas ni "crónica del mes".
    - El menú principal ahora tiene cinco opciones (Descubrir, Mi aventura, Territorios, Comunidad, Crónicas); en el teléfono la píldora se desliza.
    - Maqueta de páginas legales (Nosotros, Términos, Privacidad, Cookies): encabezado con foto real y lema escrito a mano, índice lateral y tarjeta "Imprimir o guardar PDF" (usa la impresión del navegador). Los textos siguen saliendo solo de `content/legal/`; no se agregaron las cifras ni los avisos de la maqueta.
    - Paquete "Nosotros, Términos, Privacidad, Cookies" (prototipo HTML del dueño): se adoptó el aviso destacado de reservas (campo opcional `aviso` en las secciones de `content/legal/`, validado por `sync_legal.py` y mostrado en web y Android) y un panel real de preferencias de cookies en `/cookies`, que guarda el mismo consentimiento que el aviso. No se tomaron sus textos de privacidad (el propio prototipo dice que son ilustrativos), ni las cifras, ni su centro de cookies con categorías que no usamos (personalización, marketing).
    - Pendiente de confirmar con el dueño: el correo baqueanonicaragua@gmail.com aparece en el prototipo; no se puso en los textos legales hasta que el dueño confirme que es el contacto oficial.
    - Maquetas "Mi Viaje" y "Mapa": el mapa tiene ahora encabezado con foto real, buscador de vidrio y la lista de los 17 territorios como filtro real (`?departamento=N`, mismo filtro que ya usaba la búsqueda). Mi aventura conserva su mundo (añil, ruta pintada) con una foto real de fondo. No se agregaron pestañas de reservas, contactos, QR, descargas ni historial, costos estimados, valoraciones ni conteos por territorio: no existen todavía o serían datos inventados. Los números de territorio se comparten en `apps/web/src/lib/idsTerritorio.ts`.
    - Paquete "Aliados, Mi negocio, Testimonios, Denuncias": Denuncias y Registrar negocio tienen ahora encabezado con foto real y sello; Denuncias lleva al costado los números de emergencia y qué pasa con la denuncia; Registrar negocio muestra los 4 pasos reales del proceso (sesión, revisión del equipo, aparece en el mapa, contacto directo). No se hicieron Aliados (los logos e instituciones serían alianzas no confirmadas y marcas de terceros) ni Testimonios (el propio paquete dice que son de ejemplo); se harán cuando haya acuerdos firmados y reseñas reales.
    - Paquete "Aviso legal, Ayuda, Favoritos, Contactos, Perfil": se hizo el Centro de ayuda (`/ayuda`) con guías a páginas reales y 9 preguntas frecuentes con respuestas verdaderas (en `<details>`, sin JavaScript), enlazado en el pie y en el mapa del sitio. No se tomaron el aviso legal (borrador sin revisión jurídica; los textos legales solo salen de `content/legal/`), ni los favoritos, consultas y perfil de muestra.
    - El correo de soporte de la página de Contacto es `baqueanonicaragua@gmail.com` (dato del dueño en el prompt maestro). Los correos de privacidad, derechos de autor, accesibilidad y prensa siguen como marcador hasta que el dueño diga si son el mismo o uno distinto.
    - El dueño pidió tomar `baqueanonicaragua.com` como referencia; no se pudo leer desde aquí porque el sitio no permite lectores automáticos (robots.txt).
21. **"Finalizar en modo ultra premium, nada a medias ni falso" (12 de octubre de 2026, noche):**
    - Decisiones del dueño: publicar los 17 territorios con datos oficiales; Firebase con correo y Google activados (la sonda lo confirmó); BAQÜI con Google Gemini; publicar en un VPS de Hostinger; la superadministradora será **otra cuenta** (la dio el 13 de octubre; ver punto 22).
    - Hecho y en producción: migración 0017 (17 territorios con cabecera o sede de la Ley 59 y fuente ISO 3166-2:NI, respaldo en `supabase/respaldos/`, auditoría), migración 0018 y función `baqui` (sin clave todavía: responde 503).
    - Hecho en el código (CI verde): PWA con modo sin conexión; viajes y favoritos en web y Android con las mismas tablas; publicar crónicas en web y Android; BAQÜI en web (`/baqui`) y Android; indicadores de viajeros en el Ops Center (migración 0019, sin aplicar en producción); sonda de servicios en Actions.
    - Historial de migraciones alineado sin tocar producción (13 de octubre, aprobado por el dueño): editar `supabase_migrations` desde la herramienta se cancela, así que los archivos del repositorio se renombraron con las versiones que ya están registradas en producción (`20261013035526`, `20261013042928`) y se agregó la copia `20261012192731_search_path.sql`. La métrica de viajeros quedó como `20261013061500` y la aplicará el flujo Publicar. Regla: migración aplicada con la herramienta → renombrar el archivo con su versión registrada.
    - Falta del dueño: `GEMINI_API_KEY`, el `google-services.json` de la app Android, los secretos del environment `production` en GitHub (VPS, Cloudflare, Supabase) y agregar `baqueanonicaragua.com` a los dominios autorizados de Firebase.
22. **Superadministrador, Android que compila, avisos push y dos pasos (13 de octubre de 2026):**
    - El dueño dio el correo de la cuenta superadministradora. **El repositorio es público: el correo no se escribe en ningún archivo.** La migración `superadmin_inicial` guarda solo su huella SHA-256 en `app.settings`. La primera vez que esa cuenta entra con el correo verificado, `preparar-sesion` llama a `session_bootstrap_superadmin` (solo service_role) y la base le da `superadmin` una sola vez, con registro `role.bootstrap` en `audit.logs`. Si ya hay un superadmin, no hace nada.
    - **Descubierto:** la integración de Supabase con GitHub aplica las migraciones y despliega las funciones cuando `main` avanza (la métrica de viajeros quedó aplicada con su versión de archivo y las funciones se redesplegaron 35 segundos después de mover `main`). Por eso: `main` = producción para la base y las funciones; nunca avanzar `main` sin CI y CodeQL en verde, y con respaldo antes (`supabase/respaldos/2026-10-13_antes_superadmin_y_avisos.json`).
    - **Android compila de verdad:** CI ahora genera un APK de depuración. Hizo falta subir a Gradle 8.14.3, plugin de Android 8.11.1, Kotlin 2.3.20 y Java 17 (mínimos de Flutter estable; Kotlin 2.3 para leer Firebase compilado con Kotlin 2.4). Quedan avisos de "pronto": Gradle 9.1 y plugin 9.0.1 cuando los plugins de FlutterFire lo permitan. La firma de publicación sale de `android/key.properties` (ignorado por git); sin él usa la llave de pruebas. Pasos y huellas SHA-1/SHA-256 en DESPLIEGUE.
    - **Avisos push reales (web y Android):** el dueño mandó la clave pública VAPID (va en `publica.json`, no es secreta). Registro con `push_register` (exige sesión), envío con la función `enviar-avisos` (FCM API v1, cuenta de servicio solo con permiso de mensajería), resultado honesto (`sent`, `failed` tras 3 intentos, `skipped` sin dispositivos o viejo), `pg_cron` cada minuto solo si hay pendientes y solo en producción. El Ops Center ve solo cifras. En Android el registro automático de FCM está apagado hasta que la persona activa los avisos.
    - **Verificación en dos pasos (TOTP):** activarla en Cuenta (web), y el código se pide al entrar en web y Android. El Ops Center avisa si la sesión entró sin el segundo paso. Falta encenderla en Firebase (Identity Platform + una llamada de administrador; comando en DESPLIEGUE).
    - El dueño pegó un ejemplo de Genkit con Gemini 1.5 Flash: no hace falta; BAQÜI llama a Gemini por REST desde la función `baqui` con `gemini-2.5-flash`.

## 4b. Estado del proyecto oficial (revisado el 2026-10-12)

- Supabase `nupjhqrvxjrngtpslfjq`: las 15 migraciones originales ya están aplicadas por el dueño. Hay 17 territorios, todos en borrador (0 publicados), y ningún destino ni negocio. `app.settings.firebase_project_id` está vacío (el seed no corrió).
- La web y la app traen por defecto la configuración pública del proyecto oficial (`apps/web/src/config/publica.json` y `apps/mobile/lib/core/env.dart`). El entorno puede reemplazarla. Nunca se ponen claves secretas.
- Aplicado en producción con aprobación del dueño (12 de octubre de 2026):
  - `app.settings.firebase_project_id` = `baqueanonicaragua-95755`;
  - la migración 0016 (`search_path`), registrada en Supabase como `search_path`.
- Integración Third-Party Auth con Firebase activa en Supabase.
- Secretos de la función: `FIREBASE_SERVICE_ACCOUNT` y `FIREBASE_PROJECT_ID`, los cargó el dueño. `preparar-sesion` está activa (versión 2, desplegada por el dueño). Falta `ALLOWED_ORIGINS` cuando haya dominio.
- Avisos del asesor de seguridad que quedan:
  - las vistas `public_*` con SECURITY DEFINER (es a propósito: exponen solo lo publicado; revisar si se pasan a security_invoker);
  - `public.rls_auto_enable()` se puede ejecutar sin sesión; no es de nuestras migraciones.
- Android: falta registrar la app Android en Firebase (paquete `com.baqueano.nicaragua`) y agregar su `google-services.json`. Sin ese archivo, `flutter build apk` falla. Hoy usa el appId de la app web.
- Actualizado el 13 de octubre de 2026: en producción están aplicadas hasta `20261013061500` (metricas_viajeros); `superadmin_inicial` y `avisos_push` entran al avanzar `main` (integración de GitHub). En CI, el APK se compila con el `google-services.json.example` (mismo paquete, solo datos públicos).

## 5. Pendiente del dueño (Claude no puede hacerlo)

- **Para usar el Ops Center como superadministrador:** (1) Firebase → Authentication → Configuración → actualizar a Identity Platform; (2) encender TOTP con el comando de `docs/DESPLIEGUE.md` en Cloud Shell; (3) entrar una vez con la cuenta superadministradora (correo verificado); (4) activar la verificación en dos pasos en Cuenta y volver a entrar con el código.
- **Android:** registrar las huellas SHA-1 y SHA-256 en Firebase (la de la llave de pruebas y, al publicar, la de la llave propia y la de Google Play), descargar y adjuntar `google-services.json`, y crear la llave de publicación (`key.properties`, nunca en el repositorio ni en el chat).
- `GEMINI_API_KEY` en los secretos de Supabase; los secretos del environment `production` en GitHub; `baqueanonicaragua.com` en los dominios autorizados de Firebase.
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
- Para revisar SQL rápido sin CI se puede levantar un Postgres 16 local con el usuario `pgtest` (datos en `/home/pgtest`, puerto 5499) y tablas de prueba mínimas; pg_net y pg_cron se simulan. La prueba completa siempre es la de CI (Supabase local).
- `npm`/`pnpm` no llegan al registro desde aquí: las dependencias nuevas solo se pueden probar en CI.
