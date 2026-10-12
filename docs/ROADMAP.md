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
| Pruebas RLS | en desarrollo | 34/34 PASS en PostgreSQL 16 local (PostGIS y pgvector simulados). Falta correr en Supabase real. |
| API NestJS (auth, /me, /health) | en desarrollo | Código escrito, **aún no compilado** (el entorno donde se generó no tenía acceso al registro npm). Primer paso al clonar: `pnpm install && pnpm typecheck`. **Bloqueado**: proyecto Firebase. |
| Web Next.js | en desarrollo | Esqueleto i18n (10 idiomas) + lectura pública de territorios. Sin diseño. **Aún no compilado** (mismo motivo). |
| Android Flutter | en desarrollo | Esqueleto Riverpod + lectura de territorios. No compilado (sin SDK en este entorno). |
| CI GitHub Actions | en desarrollo | `ci.yml` escrito, no ejecutado. **Bloqueado**: repositorio. |
| Despliegue (Hostinger/Cloudflare) | bloqueado | Falta plan Hostinger y dominio. |
| Diseño "Territorios vivos" | no iniciado | Fase 1: tres direcciones visuales para comparar. |
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
