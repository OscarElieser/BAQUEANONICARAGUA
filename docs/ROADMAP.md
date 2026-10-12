# Plan de trabajo y estado real de módulos

Estados: `no iniciado` · `en desarrollo` · `bloqueado` · `probado` · `publicado`
Regla: un módulo solo pasa a `probado` cuando cumple los criterios de la sección 30 del prompt maestro **en staging**.

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
| Android Flutter | en desarrollo | Esqueleto Riverpod + lectura de territorios. No compilado (sin SDK en este entorno). |
| CI GitHub Actions | en desarrollo | `ci.yml` escrito, no ejecutado. **Bloqueado**: repositorio. |
| Despliegue (Hostinger/Cloudflare) | bloqueado | Falta plan Hostinger y dominio. |
| Relieve vivo 3D | en desarrollo | Web: Three.js con capas de curvas de nivel, giro por arrastre, cimas tocables, pausa fuera de pantalla; versión SVG automática con movimiento reducido, ahorro de datos o sin WebGL. Android: proyección en perspectiva con giro por gesto y prueba de widget; se detiene con "quitar animaciones". |
| Diseño: tres direcciones | probado | `design/fase1-direcciones/`: A Curvas de nivel, B Hamaca y añil, C Cocibolca (web + Android). |
| Sistema de diseño "Territorios vivos" | en desarrollo | Síntesis elegida: base A + franja tejida de B + Atkinson Hyperlegible de C. `design/sistema/`, `docs/DESIGN_SYSTEM.md`. Contraste AA calculado en ambos temas; `scripts/check_tokens.py` verifica que web y Android usan los mismos colores (en CI). |
| Web con el sistema aplicado | en desarrollo | Portada Descubrir, página de territorio, selector de experiencia, tema claro/oscuro/automático, páginas honestas "No disponible todavía" para Mi aventura, Comunidad, Mapa y Cuenta. Sin compilar aún. |
| Android con el sistema aplicado | en desarrollo | Tema Flutter con los mismos tokens, CurvasDeNivel, FranjaTejida, EstadoVerificacion, navegación de 4 secciones. Sin compilar aún. |
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
