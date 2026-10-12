# Ops Center — inventario de secciones y acciones

Cada botón ejecuta una función real de la base de datos o de la API, con su permiso y auditoría. Lo que aún no existe aparece en la interfaz como **No disponible todavía**, nunca como botón que no hace nada.

Estados: **Listo** (función existente y probada) · **Esta fase** (se construye en la migración 0014) · **Pendiente** (depende de otra fase o de una cuenta externa).

"Eliminar" sigue el principio de trazabilidad: el contenido publicado se **archiva** (recuperable, con historial). Solo se borra de forma definitiva un **borrador que nunca se publicó**. Las cuentas de usuario se **eliminan con anonimización** (Ley 787), no se borran sus registros de auditoría.

| Sección | Botón / acción | Función real | Permiso | Estado |
|---|---|---|---|---|
| Panel | Indicadores (usuarios activos, negocios publicados y en revisión, verificaciones, reportes, denuncias, publicaciones y conversaciones de 7 días, propuestas de IA) | `ops_dashboard_metrics()` | cualquier rol del equipo | Esta fase |
| Usuarios | Buscar por nombre, usuario o estado | `profiles` (RLS `users.read`) | `users.read` | Listo |
| Usuarios | Suspender / Reactivar | `admin_set_user_status()` | `users.suspend` | Esta fase |
| Usuarios | Eliminar cuenta (anonimiza) | `admin_set_user_status('deleted')` | `users.suspend` | Esta fase (cuenta Firebase: Pendiente) |
| Usuarios | Asignar rol / Quitar rol | `admin_grant_role()` / `admin_revoke_role()` | `roles.manage` | Esta fase |
| Territorios | Editar secciones editoriales por idioma | `admin_save_content('territory_sections')` | `content.edit` | Esta fase |
| Territorios | Publicar municipios tras confirmar fuente | `admin_set_editorial('municipalities')` | `content.publish` | Esta fase |
| Destinos | Nuevo · Editar · Enviar a revisión | `admin_save_content('destinations')` | `content.edit` | Esta fase |
| Destinos | Publicar · Ocultar · Archivar | `admin_set_editorial()` | `content.publish` | Esta fase |
| Destinos | Eliminar borrador | `admin_delete_draft()` | `content.publish` | Esta fase |
| Destinos | Ver historial | `content_revisions` | `content.edit` | Esta fase |
| Negocios | Cola de verificación: Aprobar (con alcance) · Pedir información · Rechazar | `review_business_verification()` | `verifications.review` + MFA | Listo |
| Negocios | Editar ficha | `admin_save_content('businesses')` | `content.edit` | Esta fase |
| Negocios | Suspender (ocultar) · Reactivar | `admin_set_editorial('businesses')` | `businesses.review` | Esta fase |
| Negocios | Reclamaciones: Aprobar · Rechazar | `admin_review_claim()` | `businesses.review` | Esta fase |
| Comunidad | Reportes: Ocultar · Eliminar · Restaurar | `moderate_content()` | `community.moderate` | Listo |
| Comunidad | Reportes: Descartar | `admin_dismiss_report()` | `community.moderate` | Esta fase |
| Comunidad | Suspender autor | `admin_set_user_status()` | `users.suspend` | Esta fase |
| Denuncias | Cambiar estado (con nota visible u oculta) | `update_incident_state()` | `reports.manage` + MFA | Listo |
| Denuncias | Preparar remisión · Registrar transmisión | `prepare_incident_referral()` / `record_referral_transmission()` | `reports.manage` + MFA | Listo |
| IA | Propuestas de corrección: Aprobar (aplica y versiona) · Rechazar | `admin_review_ai_correction()` | `ai.review` | Esta fase |
| IA | Evaluaciones y versiones de prompt | `ai_evaluations`, `ai_prompt_versions` | `ai.review` | Listo (lectura) |
| Cultura y música | Nuevo · Editar · Publicar · Ocultar · Archivar · Eliminar borrador (patrimonio, línea de tiempo, artistas, obras, licencias, relatos) | `admin_save_content()` / `admin_set_editorial()` / `admin_delete_draft()` | `content.edit` / `content.publish` | Esta fase |
| Fuentes y datos | Nueva fuente · Editar · Marcar no disponible | `admin_save_content('data_sources')` | `content.edit` | Esta fase |
| Mensajería | Solo métricas agregadas (nunca contenido) | `ops_dashboard_metrics()` | equipo | Esta fase |
| Auditoría | Buscar y filtrar · Exportar CSV | `audit_log_search()` | `audit.read` | Listo |
| Configuración | Editar ajustes permitidos | `admin_set_setting()` (lista blanca) | `settings.manage` | Esta fase |
| Notificaciones | Campañas segmentadas | — | `notifications.send` | Pendiente (worker push/correo) |
| Traducciones | Aprobar y versionar | — | `translations.approve` | Pendiente (Fase 9) |
| SEO | Metadatos, sitemap, indexación | — | `content.publish` | Pendiente (Fase 9) |

## Un solo editor, no formularios repetidos

La interfaz no tiene un formulario escrito a mano por pantalla. Cada recurso editable se describe una vez en `apps/web/src/ops/resources.ts` (campos, tipos, validación, columnas de la tabla, filtros) y el mismo registro existe como **lista blanca en la base de datos** (`app.admin_resources`): el servidor rechaza cualquier campo que no esté declarado, aunque alguien manipule la petición.
