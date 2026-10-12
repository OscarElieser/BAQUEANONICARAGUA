# Arquitectura técnica — Ecosistema Turístico de Nicaragua

> Estado del documento: **v0.1 — Fase 0 (borrador para aprobación)**
> Fecha: 2026-10-11
> Regla: nada de lo aquí descrito se considera implementado hasta que aparezca como `probado` en `docs/ROADMAP.md`.

---

## 1. Vista general

```
                   ┌───────────────────────────────┐
                   │          Cloudflare           │  DNS · CDN · WAF · TLS
                   │ (no cachea rutas autenticadas)│
                   └──────────────┬────────────────┘
                                  │
          ┌───────────────────────┼────────────────────────┐
          │                       │                        │
 ┌────────▼────────┐    ┌─────────▼─────────┐    ┌─────────▼─────────┐
 │  apps/web (PWA) │    │   apps/api        │    │ apps/mobile       │
 │  Next.js + TS   │───▶│   NestJS + TS     │◀───│ Flutter + Riverpod│
 │  SSR/ISR, i18n  │    │   REST + OpenAPI  │    │ Android           │
 └────────┬────────┘    └───┬──────────┬────┘    └─────────┬─────────┘
          │                 │          │                   │
          │   lectura       │ service  │ colas             │ lectura
          │   pública + RLS │ role     │ (workers)         │ pública + RLS
          ▼                 ▼          ▼                   ▼
 ┌────────────────────────────────────────────────────────────────┐
 │ Supabase: PostgreSQL + PostGIS + pgvector · Storage · Realtime │
 └────────────────────────────────────────────────────────────────┘
          ▲                                               ▲
          │ ID token (JWT) con claim role=authenticated   │
 ┌────────┴───────────────────────────────────────────────┴───────┐
 │ Firebase: Authentication (email, Google) · Cloud Messaging     │
 └────────────────────────────────────────────────────────────────┘
```

### Reparto de responsabilidades

| Pieza | Responsabilidad | No hace |
|---|---|---|
| Firebase Auth | Única autoridad de identidad (registro, login, Google, verificación, recuperación). | No guarda perfiles ni roles de negocio. |
| Supabase Postgres | Fuente de verdad de todos los datos, roles internos y permisos. RLS en todas las tablas expuestas. | No emite identidades. |
| NestJS API | Lógica de negocio compartida web/Android, operaciones privilegiadas, IA, integraciones, colas. | No expone la `service_role` key. |
| Next.js | Páginas públicas indexables, PWA, paneles (incluido Ops Center). | No contiene lógica de negocio duplicada. |
| Flutter | Experiencia Android nativa sobre la misma API y datos. | No es un WebView. |
| Cloudflare | Borde: DNS, CDN de estáticos y páginas públicas, WAF, rate limit perimetral. | No cachea respuestas con `Authorization` o cookies de sesión. |
| Hostinger | Ejecuta web y API (ver ADR-004). | — |
| GitHub + Actions | Código, revisión, CI/CD con aprobación manual a producción. | No despliega a producción sin aprobación. |

---

## 2. Identidad: Firebase → Supabase (verificado contra la documentación oficial de Supabase, oct. 2026)

1. El usuario inicia sesión con Firebase (web o Android).
2. Firebase debe incluir el claim personalizado `role: "authenticated"` en el ID token. Sin él, Supabase trata la petición como `anon`.
   - Lo agrega la **función de Supabase `preparar-sesion`** (`supabase/functions/preparar-sesion`), no Firebase Functions: no hace falta Identity Platform ni el plan Blaze para funciones.
   - El cliente la llama justo después de iniciar sesión con su ID token de Firebase. La función verifica el token con las claves públicas de Google (firma RS256, emisor, proyecto, vencimiento), y si falta el claim lo agrega con la API de Identity Toolkit (`accounts:update`) usando la cuenta de servicio, conservando otros atributos. Responde `needs_refresh: true` y el cliente fuerza `getIdToken(true)`.
   - `verify_jwt = false` en `supabase/config.toml` para esta función, porque el token es de Firebase y lo verifica la propia función.
   - Secretos de la función: `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT`, `ALLOWED_ORIGINS`. Nunca en web ni Android.
3. El cliente Supabase (web: `accessToken`, Flutter: equivalente) envía el ID token de Firebase.
4. Supabase (integración *Third-Party Auth* configurada con el Project ID de Firebase) valida el token y rechaza proyectos Firebase no registrados.
5. **Importante:** el `sub` de Firebase **no es un UUID**. Por eso:
   - No se usa `auth.uid()` en políticas (castea a `uuid` y fallaría).
   - Se usa `auth.jwt() ->> 'sub'` a través de la función `app.current_firebase_uid()`.
   - `profiles.id` es un UUID interno; `profiles.firebase_uid` (texto, único) lo vincula con Firebase.
6. Los **roles de la plataforma** (superadmin, moderador, emprendedor…) viven en Postgres (`user_roles`, `role_permissions`), no en claims de Firebase. Así se revocan al instante y quedan auditados.
7. La misma función crea el perfil (idempotente), mantiene `email_verified` al día, asegura el rol base `user` y responde 403 si la cuenta está suspendida o eliminada; en ese caso no agrega el claim y el cliente cierra la sesión.
8. MFA obligatorio para roles administrativos: se exige en Firebase (MFA de Identity Platform) y la API comprueba el claim `firebase.sign_in_second_factor` antes de operaciones de Ops Center.

---

## 3. Modelo de datos

Esquemas:

- `public` — tablas de dominio expuestas con RLS.
- `app` — funciones auxiliares de seguridad (`current_profile_id()`, `has_permission()`), no expuestas por la Data API.
- `audit` — registro inmutable de acciones privilegiadas (solo inserción vía funciones `security definer`).

Dominios y estado:

| Dominio | Tablas | Estado |
|---|---|---|
| Identidad y permisos | profiles, roles, permissions, role_permissions, user_roles, organizations, organization_memberships, verification_requests | Migración 0001 escrita |
| Territorio | departments, municipalities, localities, data_sources | Migración 0002 escrita; seed de 17 territorios |
| Turismo | destination_categories, destinations, destination_category_links, businesses, business_claims, opening_hours, contacts, media_assets | Migración 0003 escrita |
| Auditoría y revisión | audit.logs, content_revisions | Migración 0004 escrita |
| Viajes, comunidad, mensajería, cultura, IA, operación | ver lista lógica del prompt maestro | Fases 4–8 |

Principios aplicados en el esquema:

- **Trazabilidad**: toda entidad publicable tiene `source_id`, `verified_at`, `verification_status`, `editorial_status`.
- **Ubicación protegida**: `location_precision` (`exact`, `approximate`, `restricted`). Las vistas públicas devuelven la geometría difuminada o nula según el valor.
- **Precios con fecha**: no hay columna "precio" suelta; las tarifas guardan `observed_at` y fuente.
- **Niveles de negocio**: `listing_tier` = `community_info` | `claimed` | `verified`, con `verified_scope` (qué se comprobó).
- **Nada se borra físicamente** en contenido editorial: `archived_at` + revisiones.

---

## 4. API (NestJS)

- Prefijo versionado `/v1`. Contrato fuente en `packages/contracts/openapi.yaml`; los clientes TS y Dart se generan desde ahí.
- Guard global `FirebaseAuthGuard` (verifica ID token con Firebase Admin, revocación incluida) + `PermissionsGuard` (consulta `app.has_permission`).
- Validación con `class-validator`/`zod`, errores en formato RFC 9457 (`application/problem+json`).
- Rate limiting por IP y por usuario.
- Colas: BullMQ sobre Redis para notificaciones, importaciones, embeddings y tareas de IA (requiere Redis — ver ADR-004).
- La `service_role` key solo existe en la API y en los workers.

## 5. Web (Next.js)

- App Router, rutas `/[locale]/...` con 10 idiomas iniciales; slugs estables, `hreflang` y `canonical` por idioma.
- Páginas públicas con ISR; paneles privados renderizados en cliente/servidor sin caché compartida.
- PWA: manifiesto, Service Worker (Serwist), caché *stale-while-revalidate* para fichas públicas e itinerarios guardados.
- 3D (Three.js / MapLibre terrain) cargado de forma diferida y desactivado con `prefers-reduced-motion`, `saveData` o hardware limitado.

## 6. Android (Flutter)

- Estructura por funcionalidades (`lib/features/<feature>/{data,domain,presentation}`), Riverpod, go_router.
- `firebase_auth`, `firebase_messaging`, `supabase_flutter` con `accessToken` de Firebase.
- Caché local con Drift (SQLite) para favoritos, itinerarios y fichas visitadas.

## 7. IA

- Orquestación en la API; el modelo nunca habla directamente con la base de datos.
- Herramientas tipadas (buscar destinos, ruta y distancia, clima, generar/guardar itinerario…), cada una con su permiso.
- RAG sobre `ai_knowledge_chunks` (pgvector) poblado **solo** con contenido en estado `published`.
- Las correcciones propuestas por la IA van a `ai_correction_proposals` → revisión humana en Ops Center.
- Acciones con efectos (guardar, enviar mensaje, publicar) requieren confirmación explícita del usuario en la UI.

---

## 8. Decisiones de arquitectura (ADR)

**ADR-001 Monorepo con pnpm + Turborepo.** Web, API y contratos comparten tipos; Flutter vive en `apps/mobile` con su propio toolchain.

**ADR-002 Firebase como única autoridad de identidad.** No se habilita Supabase Auth para usuarios finales. Roles de negocio en Postgres.

**ADR-003 Escrituras sensibles por la API, lecturas públicas directas con RLS.** Los clientes pueden leer contenido publicado directamente de Supabase (rápido, cacheable). Toda escritura que implique verificación, moderación, IA o notificaciones pasa por la API. RLS sigue activa como segunda barrera.

**ADR-004 Hosting — pendiente de confirmar el plan de Hostinger.** La API NestJS + workers + Redis necesita procesos persistentes. Recomendación: **VPS de Hostinger** con Docker (web, api, worker, redis) detrás de Cloudflare. El hosting Node.js gestionado de Hostinger sirve para Next.js, pero no está claro que soporte workers y Redis; se verificará en Fase 0 antes de comprometerse.

**ADR-005 Mapas.** MapLibre GL + proveedor de teselas con licencia comercial (p. ej. MapTiler, Stadia o teselas propias generadas desde OpenStreetMap con Protomaps). Rutas y tiempos desde un proveedor de enrutamiento (OpenRouteService con plan comercial, GraphHopper o Valhalla propio). Nunca tiles públicos gratuitos de OSM en producción.

**ADR-006 Clima.** Proveedor con licencia (p. ej. Open-Meteo comercial o similar) + enlace a avisos oficiales de INETER. No se presentan alertas oficiales como integradas mientras no exista una integración verificada.

---

## 9. Riesgos principales

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Alcance muy amplio para el equipo disponible | Alto | Fases con criterios de aceptación; MVP = Fases 0–4 en web. |
| Ausencia de APIs públicas en INTUR/MARENA/INETER | Medio | Carga editorial con fuente y fecha; acuerdos formales antes de cualquier importación masiva. |
| Datos de municipios no verificados | Medio | Importación solo desde fuente oficial citada; el seed actual incluye solo los 17 territorios. |
| Costos de IA y mapas | Medio | Límites por usuario, caché de rutas, panel de costos en Ops Center. |
| Cumplimiento Ley 787 | Alto | Revisión jurídica antes de publicar; minimización de datos; registro de consentimientos. |
| Moderación de comunidad y denuncias | Alto | Red social y denuncias no se abren al público sin moderadores asignados. |

---

## 10. Dependencias externas (bloqueantes para conectar servicios reales)

- [ ] Proyecto Firebase (dev / staging / prod) y cuenta de servicio para la función `preparar-sesion`. Identity Platform solo si se quiere MFA administrado por Firebase.
- [ ] Proyectos Supabase (dev / staging / prod) con PostGIS y pgvector habilitados.
- [ ] Plan de Hostinger concreto (VPS recomendado).
- [ ] Dominio en Cloudflare.
- [ ] Repositorio GitHub y secrets de Actions.
- [ ] Proveedor de mapas, rutas, clima, correo transaccional e IA (cuentas y presupuestos).
- [ ] Nombre definitivo de la marca (aún sin definir).
