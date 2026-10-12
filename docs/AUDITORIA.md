# Auditoría técnica de BAQUEANO — Fase 0

Fecha: 12 de octubre de 2026. Hecha sobre el commit `49f7ccc` de `desarrollo` (igual a `main`) y sobre el proyecto de Supabase `nupjhqrvxjrngtpslfjq`, **solo en modo lectura**: no se cambió ningún dato ni ajuste de producción.

## 1. Resumen

- La arquitectura existente (Next.js, NestJS, Flutter, Supabase con RLS, Firebase Auth, GitHub Actions) **se conserva**: compila, pasa sus pruebas en CI y no hay motivo técnico para empezar de cero.
- La base de datos está **bien protegida y casi vacía**. Tiene 71 tablas en `public`, `app` y `audit`, y las 68 de `public` tienen RLS. Los únicos datos son 17 territorios y 153 municipios, todos en borrador, más los catálogos de roles y permisos.
- **Nada está validado en producción todavía.** No hay web publicada ni dominio apuntando a un servidor. La API no está desplegada y nadie ha iniciado sesión: hay 0 perfiles y la función `preparar-sesion` no recibió llamadas en las últimas 24 horas.
- El cuello de botella no es el código sino el **contenido verificado**: sin destinos ni negocios reales, el mapa, BAQÜI y Mi Viaje no tienen qué mostrar.
- El prompt maestro trae decisiones nuevas que **chocan con lo construido**: nombre y eslogan BAQUEANO, paleta naranja y azules, asistente BAQÜI y 19 secciones de navegación. Están en la sección 7 y las decide el dueño.

## 2. Cómo se midió

| Fuente | Qué se revisó |
|---|---|
| Repositorio | Rutas, controladores, pantallas, migraciones, pruebas y flujos de CI |
| Pruebas locales sin dependencias | Núcleo del asistente: 33 de 33 pasan. Ops Center contra la base de datos: 4 de 4. `preparar-sesion`: 7 de 7. Cabeceras de seguridad: 3 de 3. Además pasan las validaciones de idiomas, textos legales, mapa y colores. |
| CI de GitHub | Última ejecución (`38304533320`) con los 6 trabajos en verde, más CodeQL. Los registros detallados no se pueden descargar desde este entorno, así que los totales de pruebas de CI salen del código. |
| Supabase (solo lectura) | Proyecto, migraciones, conteo exacto de filas, RLS y políticas, funciones con privilegios, asesores de seguridad y rendimiento, Edge Functions y registros de las últimas 24 horas |
| Firebase, Cloudflare, Hostinger | **No verificables desde aquí**: no hay conector y la red del entorno bloquea sus APIs. Lo que se dice de ellos sale del código o de lo que informó el dueño. |

## 3. Infraestructura

| Servicio | Estado comprobado | Evidencia |
|---|---|---|
| GitHub `OscarElieser/BAQUEANONICARAGUA` | Activo, público, rama por defecto `main` | API de GitHub |
| GitHub: protección de `main` | **No comprobable** (sin permiso para leerla) | Error 403 de la API |
| GitHub: ramas viejas | Siguen 10 ramas viejas y 2 PR abiertos de Dependabot (#18 y #19) | API de GitHub |
| GitHub: alertas de Dependabot | **Desactivadas** en el repositorio | Error 403 de la API: "Dependabot alerts are disabled" |
| Supabase | Activo y sano: PostgreSQL 17, región us-east-2, con PostGIS 3.3, `vector` 0.8, `unaccent` y `pg_trgm` | `get_project` y lista de extensiones |
| Supabase: migraciones | Las 16 del repositorio, aplicadas. `search_path` aparece dos veces (versión `…000016` y `…192731`) con el mismo contenido, sin efecto dañino. | `list_migrations` |
| Supabase: función `preparar-sesion` | Activa, versión 3. `verify_jwt` desactivado a propósito, porque verifica el token de Firebase por su cuenta. | `list_edge_functions` |
| Firebase `baqueanonicaragua-95755` | La configuración pública está en web y Android. Supabase tiene `firebase_project_id` cargado. **No se pudo comprobar** qué métodos de inicio de sesión están activos. | `app.settings` y `apps/web/src/lib/firebase.ts` |
| Android en Firebase | **Sin registrar**: no hay `google-services.json` (solo el `.example`) y la app usa el appId de la web | `apps/mobile/android/app/` |
| Cloudflare | **No verificado**: no hay acceso a la cuenta ni zona DNS comprobada | — |
| Hostinger | **No verificado**: el plan y la modalidad (VPS o Node) siguen pendientes | `deploy.yml` asume VPS por SSH |
| Dominio `baqueanonicaragua.com` | No configurado en la web (`SITE_URL` usa `localhost` si falta la variable) | `apps/web/src/lib/seo.ts` |

## 4. Datos reales en producción

| Tabla | Filas | Estado |
|---|---|---|
| `departments` (territorios) | 17 | Todos en borrador. Sin límites geográficos en la base (`boundary` vacío): el mapa usa un archivo de Natural Earth. |
| `municipalities` | 153 | Todos en borrador y sin centroide. Fuente: Statoids (2009), en borrador. Falta contrastarla con INIDE o INETER. |
| `roles` / `permissions` / `role_permissions` | 8 / 17 / 40 | Catálogo del sistema |
| `app.admin_resources` | 11 | Recursos del Ops Center |
| `data_sources` | 1 | La fuente de municipios |
| **Todo lo demás** | **0** | Destinos, negocios, perfiles, viajes, reseñas, comunidad, cultura, música, denuncias, IA y auditoría |

Consecuencias:
- No existe ningún superadministrador, así que el Ops Center no se puede usar todavía.
- `audit.logs` está vacío porque aún no ha habido acciones sensibles.

Registros de las últimas 24 horas:
- Hubo lecturas públicas con respuesta 200 a `departments`, `public_feed`, `search_catalog`, `heritage_items`, `public_businesses`, `history_timeline` y `public_destinations`. La lectura anónima por RLS funciona.
- No hay ninguna llamada a `/functions/v1/preparar-sesion`.

## 5. Matriz de cobertura en cinco niveles

Niveles:
1. Esquema creado
2. Código desarrollado
3. Servicio integrado
4. Prueba ejecutada
5. Validado en producción

Valores: **sí** · **parcial** · **no**.

| Módulo | 1 | 2 | 3 | 4 | 5 | Qué falta para el nivel siguiente |
|---|---|---|---|---|---|---|
| Identidad, roles y sesión (Firebase → Supabase) | sí | sí | parcial | sí | no | Activar correo y Google en Firebase, primer inicio de sesión real y crear el superadmin |
| Territorios (17) | sí | sí | sí | sí | no | Contenido verificado y publicarlos (hoy 0 publicados) |
| Municipios (153) | sí | no | no | parcial | no | Fuente oficial (INIDE o INETER), centroides, página propia |
| Destinos | sí | sí | sí | sí | no | 0 registros; hace falta la carga editorial verificada |
| Negocios y emprendedores | sí | sí | parcial | sí | no | Registro y verificación de punta a punta con una cuenta real |
| Búsqueda | sí | sí | sí | sí | no | Contenido publicado que buscar |
| Mapa interactivo (MapLibre) | sí | sí | parcial | parcial | no | Proveedor de teselas y de rutas (sin elegir) |
| Mi Viaje (viajes, itinerarios, favoritos) | sí | parcial | no | parcial | no | Hoy solo interpreta el viaje en el navegador; nada se guarda. Falta la persistencia en web y Android, el PDF, el QR y compartir. |
| BAQÜI (asistente) | sí | parcial | no | sí | no | Proveedor de IA, RAG sobre contenido publicado, herramientas conectadas y evaluaciones con datos reales |
| Comunidad y reseñas | sí | parcial | parcial | sí | no | Las reseñas no tienen código en clientes; las publicaciones dependen de la API, que no está desplegada |
| Mensajería turista ↔ prestador | sí | sí | parcial | sí | no | Sesión real y negocios publicados |
| Denuncias ambientales | sí | sí | parcial | sí | no | Sesión real, API desplegada y revisión humana operativa |
| Cultura e historia | sí | sí | sí | sí | no | 0 artículos y 0 eventos con fuente |
| Música | sí | parcial | no | sí | no | Interfaz pública, artistas y licencias |
| Ops Center | sí | sí | parcial | sí | no | Superadmin, segundo factor y API desplegada |
| Notificaciones push y correo | sí | parcial | no | parcial | no | Firebase Cloud Messaging y proveedor de correo |
| Clima | no | parcial | no | parcial | no | Contratar proveedor (hoy responde 503 a propósito) |
| Medición de navegación con consentimiento | sí | sí | parcial | sí | no | Dominio y despliegue |
| 10 idiomas de interfaz | — | sí | sí | sí | no | 360 textos alineados; falta la revisión nativa de 9 idiomas y la traducción de los textos legales |
| Páginas legales | — | sí | sí | sí | no | 18 `[marcador]` (razón social, RUC, correos, dirección…) y revisión legal |
| SEO (sitemap, hreflang, Open Graph, schema.org) | — | sí | parcial | sí | no | Dominio real, Search Console y Bing |
| Accesibilidad (WCAG 2.2 AA) | — | sí | — | sí | no | axe en CI sobre 15 rutas en dos temas; falta la revisión manual con lector de pantalla |
| PWA | — | parcial | — | parcial | no | Hay manifest e iconos, pero **no hay service worker** ni página sin conexión |
| Android | — | sí | parcial | sí | no | `google-services.json`, build firmada y prueba en teléfono |
| Despliegue (Hostinger + Cloudflare) | — | sí | no | parcial | no | Plan de Hostinger, zona de Cloudflare y dominio. `deploy.yml` está revisado pero nunca se ejecutó. |
| API NestJS | — | sí | no | parcial | no | Compila y arranca en Docker en CI; no está desplegada en ningún lado |

## 6. Seguridad

**Bien:**
- RLS activo en todas las tablas públicas (68), con políticas.
- Los esquemas `app` y `audit` no dan permisos a `anon` ni a `authenticated`.
- Las 31 funciones con privilegios del proyecto fijan `search_path` vacío.
- Las funciones administrativas comprueban el permiso (`app.require`) y escriben en `audit.logs`.
- No hay claves secretas en web ni en Android: solo la clave publicable de Supabase y la configuración pública de Firebase.
- La cuenta de servicio de Firebase vive como secreto de la función.
- CodeQL en verde.

**Pendiente (de mayor a menor):**
1. **Dependabot sin alertas.** Hay que activarlas en *Settings → Code security*.
2. **Protección de `main` sin confirmar.** Hay que exigir CI y CodeQL antes de avanzar `main`.
3. **`public.rls_auto_enable()`** se puede ejecutar sin sesión. No viene de nuestras migraciones y conviene quitarle el permiso de ejecución a `anon` y `authenticated` (requiere aprobación).
4. **Vistas `public_*` con SECURITY DEFINER** (aviso del asesor). Son a propósito, porque solo exponen lo publicado, pero conviene pasarlas a `security_invoker` con políticas equivalentes.
5. **Clave de API de Firebase sin restricción comprobada.** Es pública por diseño, pero en Google Cloud se debe limitar al dominio y a la app Android.
6. **Archivos ajenos al proyecto** en el commit `b72f3b4`: `.claude/data/healthcare/…sqlite` (base vacía de una herramienta de investigación), `.snapshots/` (extensión de editor) y `apps/mobile/.flutter-plugins*` (generados por Flutter). No contienen datos personales. Hay que quitarlos y agregarlos a `.gitignore`, si el dueño lo aprueba.
7. **Rendimiento de la base** (aviso informativo): 97 claves foráneas sin índice, 31 casos de varias políticas permisivas en una tabla y 28 índices sin uso. Hoy no afecta porque la base está vacía; conviene una migración de índices antes de cargar contenido.

## 7. Diferencias entre el prompt maestro y lo construido

| Tema | Prompt maestro | Hoy | Recomendación |
|---|---|---|---|
| Nombre y eslogan | BAQUEANO, "Descubre lo que no sale en el mapa" | El título del sitio es "Nicaragua, curva por curva" y la palabra BAQUEANO no aparece en la interfaz | Adoptar el nombre y el eslogan en los 10 idiomas (es un cambio de textos, bajo riesgo) |
| Paleta | Naranja explorador `#F65E01`, turquesa `#165D6F`, verde `#4A7A5A` y azules nocturnos | Sistema "Territorios vivos": verde selva `#0D5448`, oro, añil, terracota | **Decisión del dueño**: reemplazar, o integrar el naranja como acento de marca dentro del sistema actual. Hay que comprobar el contraste AA del naranja sobre fondos claros. |
| Tipografía | Editorial más sans (sugiere Playfair, DM Sans, Manrope o Inter, "o equivalentes") | Young Serif y Atkinson Hyperlegible, más una letra propia por sección | Se puede conservar: cumple "editorial más sans legible" y ya pasa accesibilidad |
| Asistente | BAQÜI con RAG, herramientas y memoria | Núcleo del asistente probado (33 pruebas), sin proveedor de IA ni nombre | Nombrarlo BAQÜI y elegir proveedor de IA |
| Navegación | 19 secciones | La barra principal tiene 3 secciones (Descubrir, Mi aventura y Comunidad). Además existen Mapa, Cultura, Denunciar, Cuenta, las fichas y las páginas legales. | Agrupar en menús: Explorar, Viajar, Cultura y Comunidad. Crear una página solo cuando tenga contenido real. |
| Hero | Foto o video de paisajes | Relieve 3D de Ometepe (sin fotos verificadas todavía) | Mantener el relieve hasta tener fotos con licencia; nunca usar fotos de banco presentadas como reales |
| Mi Viaje | Persistente, con PDF, QR y compartir | Solo interpretación local | Prioridad alta tras el inicio de sesión |
| PWA | Service worker y modo sin conexión | No existe | Prioridad media |
| Repositorio | El prompt dice `APP-BAQUEANO` | El oficial es `BAQUEANONICARAGUA` | Se usa `BAQUEANONICARAGUA`, como dice la directiva de integración |

## 8. Riesgos principales

1. **Catálogo vacío.** Es el riesgo de producto más grande: sin destinos ni negocios verificados no hay experiencia que mostrar. Mitigación: 2 o 3 territorios piloto completos, con fuente y fecha, cargados desde el Ops Center.
2. **Inicio de sesión sin probar de punta a punta.** Sin esto no hay superadmin, Ops Center, registro de negocios, mensajería ni Mi Viaje.
3. **Sin despliegue.** Mientras no haya plan de Hostinger, zona de Cloudflare y dominio, nada puede llegar al nivel 5.
4. **Proveedores sin elegir** (teselas y rutas del mapa, IA, correo, clima). Bloquean el mapa, BAQÜI y las notificaciones.
5. **Municipios con fuente de 2009.** No deben publicarse sin contraste oficial.
6. **ROADMAP desactualizado.** Varias filas dicen "sin compilar" cuando hoy CI compila y prueba todo. Se corrige junto con este informe.

## 9. Decisiones que necesita el dueño

1. Paleta: reemplazar el sistema actual por la paleta del prompt, o integrar el naranja `#F65E01` como acento de marca.
2. Activar Email/Password y Google en Firebase y hacer el primer inicio de sesión. Después, aprobar que esa cuenta sea superadmin.
3. Plan de Hostinger (VPS o Node administrado) y acceso a la zona de Cloudflare de `baqueanonicaragua.com`.
4. Proveedores: IA para BAQÜI, teselas y rutas del mapa, y correo.
5. Datos legales para los 18 marcadores. ¿Se usa `baqueanonicaragua@gmail.com` como correo de soporte y privacidad?
6. Aprobar los cambios de seguridad en producción: permiso de `rls_auto_enable` y vistas `security_invoker`.
7. Quitar del repositorio los archivos ajenos señalados en la sección 6.

## 10. Plan propuesto (siguientes fases)

| Orden | Trabajo | Depende de |
|---|---|---|
| 1 | Marca BAQUEANO en la interfaz (nombre, eslogan, BAQÜI) y paleta según la decisión 1 | Decisión 1 |
| 2 | Inicio de sesión real, superadmin y Ops Center operativo | Decisión 2 |
| 3 | Migración de índices y endurecimiento de seguridad (con respaldo y aprobación) | Decisión 6 |
| 4 | Mi Viaje persistente (web y Android) | Paso 2 |
| 5 | Territorios piloto con contenido verificado | Paso 2 y equipo editorial |
| 6 | PWA con service worker y modo sin conexión | — |
| 7 | Staging en Hostinger y Cloudflare, y luego producción | Decisión 3 |
| 8 | BAQÜI con RAG sobre contenido publicado | Decisión 4 y paso 5 |
