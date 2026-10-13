# Plan de trabajo y estado real de módulos

Estados: `no iniciado` · `en desarrollo` · `bloqueado` · `probado` · `publicado`
Regla: un módulo solo pasa a `probado` cuando cumple los criterios de la sección 30 del prompt maestro **en staging**.

> **Actualización del 12 de octubre de 2026.** La auditoría `docs/AUDITORIA.md` tiene el estado vigente de cada módulo, en cinco niveles: esquema, código, integración, prueba y producción.
> Donde la tabla de abajo dice "sin compilar", ya no es cierto: CI compila y prueba web, API, Android, funciones y migraciones en cada cambio.
> Ningún módulo está validado en producción todavía.

## Avance del 13 de octubre de 2026

| Módulo | Estado | Evidencia |
|---|---|---|
| Superadministrador inicial | probado (CI) | Migración `superadmin_inicial`: la cuenta del dueño recibe `superadmin` una sola vez al entrar con el correo verificado, con registro en `audit.logs`. En el repositorio solo está la huella SHA-256 del correo. 12 pruebas RLS y 3 de la función. Falta el primer inicio de sesión del dueño. |
| App Android (compilación) | probado (CI) | CI compila un APK de depuración en cada cambio (Gradle 8.14.3, plugin de Android 8.11.1, Kotlin 2.3.20, Java 17). Firma de publicación lista para `key.properties`. Falta el `google-services.json` real y las huellas SHA en Firebase. |
| Avisos push (web + Android) | probado (CI) | Migración `avisos_push` (registro con sesión, reserva y resultado honesto, `pg_cron` solo en producción), función `enviar-avisos` (FCM API v1) con 7 pruebas, 21 pruebas RLS, tarjetas en Cuenta y Perfil con sus 4 estados. Falta probarlo en vivo con una cuenta y un teléfono reales. |
| Verificación en dos pasos | probado (CI) | Activarla en Cuenta y código al entrar en web y Android; el Ops Center avisa si falta. Falta encender TOTP en Firebase (Identity Platform + comando de DESPLIEGUE). |
| Ops Center: avisos | probado (CI) | El panel cuenta navegadores y teléfonos con avisos, y avisos entregados o fallidos en 24 h (solo cifras). |
| Revelación del logotipo (Android) | probado (CI) | Video del dueño recortado a 3 s, sin sonido, encima de la app mientras carga; se salta, no aparece con las animaciones quitadas y abre directo si el video no se prepara. 4 pruebas. Falta decidir si la Q es el logo oficial. |
| BAQÜI en persona (web + Android) | probado (CI) | Video del dueño (10 s, sin sonido): se presenta solo la primera vez que se ve, señala cada respuesta si está a la vista, botón para pausar, quieto con movimiento reducido. Su cara acompaña los mensajes (piensa y responde). 7 pruebas en Android y vista previa web. Faltan los clips de pensar y explorar, y la voz. |

## Avance del 12 de octubre de 2026 (noche)

| Módulo | Estado | Evidencia |
|---|---|---|
| Inicio de sesión (Firebase) | probado (sonda) | Sonda de solo lectura en Actions (`refs/datos/sonda`): correo y contraseña activados, Google activado, `preparar-sesion` desplegada y rechaza sin token. Falta agregar el dominio `baqueanonicaragua.com` en los dominios autorizados de Firebase. |
| 17 territorios | publicado | Migración 0017 aplicada en producción con respaldo (`supabase/respaldos/`) y 17 registros en `audit.logs`: nombre e ISO 3166-2:NI, cabecera o sede según la Ley 59 (La Gaceta, 6 de octubre de 1989). Sin textos ni cifras inventadas. |
| PWA | probado (CI) | Manifiesto BAQUEANO con icono enmascarable y atajos; trabajador sin conexión que nunca guarda cuenta, mensajes, Ops Center ni denuncias; página sin conexión en 10 idiomas. |
| Viajes y favoritos (web + Android) | probado (CI) | Mismas tablas (`trips`, `favorites`) con RLS; guardar desde Mi aventura, lista "Mis viajes y lugares guardados", botón Guardar en fichas. Falta probar con una cuenta real en vivo. |
| Crónicas (web + Android) | probado (CI) | Publicar con la cuenta (`posts`, tipo `chronicle`), límite de 10 por hora, publicidad identificada, moderación existente. |
| BAQÜI (Gemini) | desplegado sin clave | Función `baqui` en Supabase (versión 1) y migración 0018 en producción: sesión y límite de 40 mensajes/día en la base de datos, datos publicados delimitados, cifras sin fuente reemplazadas por "por cotizar", respuestas guardadas solo por el servidor. Responde 503 hasta que se cargue `GEMINI_API_KEY`. Web `/baqui` y Android desde Mi aventura. |
| Ops Center: indicadores de viajeros | publicado | Migración `20261013061500_metricas_viajeros`, aplicada por la integración de Supabase con GitHub al avanzar `main`: viajes, favoritos, crónicas y uso de BAQÜI, solo cifras. |

## Estado al 2026-10-11

| Módulo | Estado | Evidencia / bloqueo |
|---|---|---|
| Arquitectura técnica (Fase 0) | en desarrollo | `docs/ARCHITECTURE.md` v0.1, pendiente de aprobación |
| Esquema identidad/permisos | en desarrollo | Migración 0001; 14/14 pruebas RLS locales pasan (PostgreSQL 16 con PostGIS simulado). Falta correr en Supabase real. |
| Esquema territorio | en desarrollo | Migración 0002 + seed de 17 territorios en `draft`. Municipios: **bloqueado** hasta tener fuente oficial citada. |
| Esquema turismo / Vitrina | en desarrollo | Migración 0003; protección contra autoverificación probada. |
| Auditoría | en desarrollo | Migración 0004; inmutabilidad probada. |
| Esquema viajes / itinerarios / favoritos | en desarrollo | Migración 0005; costos "verificados" exigen observación con fuente y los tiempos de traslado exigen origen (probado). |
| Esquema comunidad y mensajería | en desarrollo | Migración 0006; mensaje turista→prestador visible desde otra sesión, bloqueos, no edición de mensajes, sin acceso de moderadores a chats, sin autorreseñas (probado). |
| Esquema denuncias e IA | en desarrollo | Migración 0007; denuncias visibles solo para denunciante y `reports.manage`; remisión "transmitida" exige acuse; correcciones de IA exigen revisor humano (probado). |
| Pruebas RLS | probado | 79/79 PASS localmente y en CI con Supabase real (PostGIS incluido). |
| Comunidad y mensajería (BD) | probado (local) | Migración 0011: consultas a negocios (reanuda conversación, bloqueos, 10 nuevas/día), no leídos, notificaciones con estado real por canal, feed cronológico, moderación auditada, límites anti-spam. Escenario Mensajería de la sección 30 probado. |
| API comunidad / mensajería / notificaciones | en desarrollo | Endpoints de feed, publicaciones, comentarios, reacciones, reportes, bloqueos, moderación, conversaciones, tokens push y preferencias. Sin compilar. |
| Web comunidad / mensajes | en desarrollo | Feed en Comunidad, botón "Escribir por la plataforma" en fichas, bandeja con tiempo real (Supabase Realtime). Desactivados con aviso hasta tener Firebase. Sin compilar. |
| Núcleo del asistente (`packages/ai-core`) | probado | 32/32 pruebas: interpretación de solicitudes, presupuesto y viabilidad (escenario IA de la sección 30), herramientas con niveles y confirmación, defensa contra inyección, verificación de cifras. En CI. Ver `docs/AI.md`. |
| Asistente en API y web | en desarrollo | "Mi aventura" interpreta el viaje sin proveedor (en el navegador, también sin conexión). Chat con modelo: bloqueado hasta elegir proveedor de IA. Sin compilar. |
| Denuncias confidenciales | probado (BD) / en desarrollo (API, web) | Migración 0012: envío con límite diario, transiciones válidas, notas internas ocultas al denunciante, respuesta a "requiere información", remisión solo con consentimiento y transmisión con acuse; notificación de avances. Página /denunciar con números de emergencia verificados (118, 115, 128) siempre visibles. |
| Cultura, historia y música | probado (BD) / en desarrollo (API, web) | Migración 0013: licencias, patrimonio con consentimiento comunitario, hechos controvertidos con perspectivas y segunda revisión, artistas con contactos autorizados, música solo con reproductores oficiales o licencia que permita alojar. Página /cultura con línea de tiempo. |
| Clima | en desarrollo | Adaptador del plan comercial de Open-Meteo con fuente y hora; sin proveedor responde 503. Sin alertas oficiales hasta tener integración verificada. Bloqueado: contratar proveedor. |
| Envío push/correo (worker) | no iniciado | Requiere Firebase Cloud Messaging y proveedor de correo; el registro de pendientes ya existe. |
| Municipios | en desarrollo | 153 en borrador (migración 0009) con fuente citada y contrastada con una segunda referencia. Antes de publicar: confirmar con INIDE/INETER. |
| Búsqueda y alta de negocios (BD) | probado (local) | `search_catalog` (sin acentos, rotación diaria, sin patrocinados), `register_business`, `review_business_verification` con auditoría; escenario Emprendedor de la sección 30 probado. `nearby_catalog` y `map_points` requieren PostGIS: se prueban en CI con Supabase local. |
| API catálogo / negocios / Ops verificaciones | en desarrollo | Endpoints y contrato OpenAPI escritos; validación zod; acciones ejecutadas con el token del usuario. Sin compilar. |
| Web Fase 3 | en desarrollo | Fichas de destino y negocio, búsqueda + mapa MapLibre (desactivado con aviso si no hay proveedor), registro de negocio (desactivado con aviso hasta tener Firebase). Sin compilar. |
| Inicio y cierre de sesión | en desarrollo | Web (/cuenta y menú en la cabecera) y Android (pestaña Perfil): correo y contraseña, Google, crear cuenta con verificación de correo, recuperar contraseña, cerrar sesión; perfil y rol de Supabase con la función de Supabase `preparar-sesion` (verifica el token de Firebase, crea el perfil, bloquea cuentas suspendidas; 7 pruebas sin red en CI). Ya no se usan Firebase Functions. Bloqueado para probar en vivo: proyecto Firebase, cuenta de servicio y proyecto Supabase. |
| Páginas legales e institucionales | en desarrollo | Sobre nosotros, Privacidad (Ley 787), Cookies, Términos, Accesibilidad y Contacto en web y Android desde una sola fuente (`content/legal`, verificada en CI). Borradores para revisión legal con marcadores para los datos de la empresa. |
| Consentimiento y medición de navegación | probado (local) | Aviso de cookies con elección real y Global Privacy Control; medición anónima con consentimiento, retención de 90 días y resumen con umbral de 5 visitas en el Ops Center (6 pruebas RLS). |
| Seguridad y Docker | en desarrollo | Cabeceras de seguridad con pruebas, límites en la API, imágenes Docker sin privilegios probadas en CI, `pnpm audit`, Dependabot y CodeQL. Ver docs/SEGURIDAD.md. |
| Accesibilidad automatizada | en desarrollo | axe (WCAG 2.2 AA) en 13 páginas y dos temas en CI; enlace de salto; pruebas de widgets en Android. |
| API NestJS (auth, /me, /health) | en desarrollo | Código escrito, **aún no compilado** (el entorno donde se generó no tenía acceso al registro npm). Primer paso al clonar: `pnpm install && pnpm typecheck`. **Bloqueado**: proyecto Firebase. |
| Web Next.js | en desarrollo | Esqueleto i18n (10 idiomas) + lectura pública de territorios. Sin diseño. **Aún no compilado** (mismo motivo). |
| Android Flutter (Fase 7) | en desarrollo | Paridad con la web: Descubrir con búsqueda, ficha de territorio, destino y negocio (verificación, horarios ISO, tarifas con fecha y fuente, contactos seguros); Mi aventura con el mismo intérprete que la web (22 casos de `intent_golden.json` iguales en TypeScript y Dart); Comunidad con relatos cronológicos; Mis mensajes con bandeja y conversación. Datos directo a Supabase con RLS. Analizado y probado en CI (`dart analyze` + `flutter test`). Bloqueado para probar en un teléfono: proyecto Supabase y Firebase. |
| Interfaz en 10 idiomas (Fase 9) | en desarrollo | Fuente única `content/i18n` (323 textos), validada en CI: mismas claves y variables en es, en, zh-Hans, ko, it, fr, pt, de, ru y ja. Web: selector de idioma, títulos y `hreflang` por idioma, cabecera, pie, aviso de cookies, inicio, Mi aventura, Comunidad y páginas legales (el texto legal sigue en español y se avisa). Android: pestañas, Descubrir, Mi aventura, Comunidad, errores y Perfil siguen el idioma del teléfono. Las 9 traducciones están marcadas "pendiente de revisión nativa" y se avisa en pantalla. Ya traducidos también: cuenta e inicio de sesión (con errores de Firebase), denuncias, registro de negocios, mapa, cultura, fichas, verificación, mensajería y relieve 3D. Queda en español a propósito el Ops Center (herramienta interna). El contenido editorial de la base de datos se traduce aparte (con marca de traducción automática). El intérprete de viajes entiende español e inglés y lo dice en los demás idiomas. |
| Publicación (Fase 10) | en desarrollo | Flujo manual `Publicar`: solo el último commit de main con CI y CodeQL en verde; aprobación obligatoria en producción; imágenes por commit en GHCR; migraciones y función de Supabase; despliegue por SSH con vuelta automática a la versión anterior; Caddy con certificado de origen de Cloudflare; vaciado de caché y prueba externa. Revisado en CI con actionlint y shellcheck. Bloqueado: VPS de Hostinger, zona de Cloudflare, proyectos de Supabase y Firebase y dominios (ver docs/DESPLIEGUE.md). |
| Buscadores (SEO) | en desarrollo | `sitemap.xml` con los 10 idiomas y `hreflang`, `robots.txt` con sitemap, canónica y alternativas por página, títulos y descripciones traducidos, Open Graph, datos estructurados (WebSite con buscador, AdministrativeArea, TouristAttraction, LocalBusiness solo con datos reales), paginación con enlaces reales y `noindex, follow` en búsquedas. Probado en CI contra el contenedor. Pendiente con el dominio: Search Console, Bing Webmaster, Yandex y Naver (docs/DESPLIEGUE.md). |
| CI GitHub Actions | en desarrollo | `ci.yml` escrito, no ejecutado. **Bloqueado**: repositorio. |
| Despliegue (Hostinger/Cloudflare) | bloqueado | Falta plan Hostinger y dominio. |
| Relieve vivo 3D | en desarrollo | Web: Three.js con capas de curvas de nivel, giro por arrastre, cimas tocables, pausa fuera de pantalla; versión SVG automática con movimiento reducido, ahorro de datos o sin WebGL. Android: proyección en perspectiva con giro por gesto y prueba de widget; se detiene con "quitar animaciones". |
| Diseño: tres direcciones | probado | `design/fase1-direcciones/`: A Curvas de nivel, B Hamaca y añil, C Cocibolca (web + Android). |
| Sistema de diseño "Territorios vivos" | en desarrollo | Síntesis elegida: base A + franja tejida de B + Atkinson Hyperlegible de C. `design/sistema/`, `docs/DESIGN_SYSTEM.md`. Contraste AA calculado en ambos temas; `scripts/check_tokens.py` verifica que web y Android usan los mismos colores (en CI). |
| Web con el sistema aplicado | en desarrollo | Portada Descubrir, página de territorio, selector de experiencia, tema claro/oscuro/automático, páginas honestas "No disponible todavía" para Mi aventura, Comunidad, Mapa y Cuenta. Sin compilar aún. |
| Android con el sistema aplicado | en desarrollo | Tema Flutter con los mismos tokens, CurvasDeNivel, FranjaTejida, EstadoVerificacion, navegación de 4 secciones con contenido real. Analizado y probado en CI. |
| Mapa, IA, itinerarios, comunidad, mensajería, cultura, música, denuncias, clima, notificaciones, Ops Center | no iniciado | Fases 3–8 |

## Fases y criterios de salida

**Fase 0 — Diagnóstico.** Salida: arquitectura aprobada; proveedores de mapas/rutas/clima/correo/IA elegidos con costo estimado; plan Hostinger confirmado; catálogo inicial de fuentes con licencia de reutilización.

**Fase 1 — Identidad y experiencia.** Salida: tres direcciones visuales comparadas → una aprobada; design system (tokens web + Flutter); prototipos de Descubrir, Mi aventura, Comunidad, ficha de destino, ficha de negocio y Ops Center.

**Fase 2 — Fundaciones.** Salida: repo en GitHub con ramas protegidas; Supabase dev/staging con migraciones aplicadas y pruebas RLS en CI; Firebase con claim `role` y MFA admin; API desplegada en staging con `/health` en verde; escenario "crear cuenta → iniciar sesión → cerrar sesión" probado en web.

**Fase 3 — Plataforma turística.** Salida: 17 territorios publicados con fuente; municipios importados desde fuente oficial; fichas de destino y negocio; búsqueda y filtros; mapa MapLibre con capas y precisión de ubicación respetada.

**Fase 4 — Emprendedores y comunidad.** Salida: escenario "registra negocio → pendiente → verificado → aparece en mapa"; perfiles; publicaciones con moderación; mensajería turista↔prestador probada entre dos sesiones.

**Fase 5 — IA.** Salida: herramientas tipadas; RAG solo sobre contenido publicado; itinerario que recalcula al cambiar presupuesto; bandeja de correcciones; batería de pruebas de alucinación e inyección.

**Fase 6 — Cultura, ambiente, servicios.** Biblioteca cultural y musical con licencias; denuncias confidenciales; clima con fuente y hora; notificaciones y correo con entrega real registrada.

**Fase 7 — Android.** Paridad de funciones núcleo; favoritos e itinerarios sincronizados con la PWA; build firmada.

**Fase 8 — Ops Center.** Todos los módulos administrativos con permisos por recurso; escenario del auditor sin capacidad de escritura.

**Fase 9 — i18n y calidad.** 10 idiomas sin recarga; WCAG 2.2 AA; Core Web Vitals; pruebas de carga y seguridad.

**Fase 10 — Lanzamiento controlado.** Aceptación en staging, aprobación, despliegue y monitoreo; rollback probado.

## MVP recomendado
Fases 0–4 solo en web, con 2–3 territorios piloto completamente verificados, antes de abrir Android, IA y red social al público.

## Ops Center (2026-10-12)

| Módulo | Estado | Evidencia |
|---|---|---|
| Inventario y diseño | probado | `docs/OPS_CENTER.md` y lienzo "Ops Center — mapa y pantallas": cada botón con su función real, permiso y estado. |
| Funciones de administración (BD) | probado | Migración 0014: editor genérico con lista blanca, publicar/ocultar/archivar, borrar solo borradores nunca publicados, suspender/reactivar/eliminar (anonimizar) cuentas, roles con protección del último superadmin, reclamaciones, reportes, propuestas de IA, ajustes, métricas. 105/105 pruebas. |
| API del Ops Center | en desarrollo | `/v1/ops/*` con segundo factor obligatorio. |
| Interfaz del Ops Center | en desarrollo | `/ops`: panel, editor generado para 11 recursos, usuarios, negocios, comunidad, denuncias, IA, auditoría con exportación CSV, configuración. Se activa con Firebase. La definición de recursos se verifica contra la BD en CI. |
