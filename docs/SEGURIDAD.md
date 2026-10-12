# Seguridad, privacidad y accesibilidad

Resumen de lo que está hecho y lo que falta. Si algo no figura aquí, no está hecho.

## Identidad y permisos

- Firebase Auth es la única autoridad de identidad. La función de Supabase `preparar-sesion` verifica el token (RS256 con las claves de Google), crea el perfil, bloquea cuentas suspendidas y agrega `role=authenticated`.
- Cada tabla tiene RLS; las acciones sensibles pasan por funciones que comprueban permisos y escriben en `audit.logs` (inmutable).
- El Ops Center exige verificación en dos pasos.
- Ninguna clave secreta en la web ni en Android. Los secretos viven en Supabase (funciones), en el servidor de la API y en GitHub Actions.

## Web

- Cabeceras en `apps/web/security-headers.mjs`, con pruebas:
  - CSP construida con las direcciones configuradas;
  - HSTS de 2 años, `nosniff` y `Referrer-Policy`;
  - `Permissions-Policy` restrictiva;
  - `frame-ancestors 'none'`.
- Las variables `NEXT_PUBLIC_*` se fijan al construir. Si se agrega un proveedor (por ejemplo, teselas del mapa), va en `CSP_EXTRA_CONNECT`.
- Pendiente: CSP con *nonce* para quitar `'unsafe-inline'` de los scripts. Requiere generar la página por petición; se evaluará cuando exista el despliegue en Hostinger.
- Los paneles privados se marcan `no-store` y `noindex`, y `robots.txt` los excluye.

## API

- Helmet con CSP `default-src 'none'`.
- Cuerpos de 100 kB como máximo.
- Límite de 120 peticiones por minuto.
- CORS solo para los orígenes configurados.
- `TRUST_PROXY_HOPS` para leer la IP real detrás de Cloudflare.
- Documentación `/docs` solo con `API_DOCS=true`.

## Docker

- Imágenes de varias etapas sobre `node:22-alpine`.
- Corren sin privilegios, con disco de solo lectura y `no-new-privileges`.
- Tienen comprobación de salud.
- CI construye ambas imágenes, arranca la web y comprueba las cabeceras y que el proceso no sea administrador.

## Cadena de dependencias

- `pnpm audit` (críticas) en CI.
- Dependabot semanal para npm, pub, Actions y Docker.
- CodeQL con reglas de seguridad ampliadas.

## Privacidad (Ley 787)

- Aviso de privacidad, cookies, términos, accesibilidad, contacto y "sobre nosotros" en `content/legal/`. Son borradores para revisión legal, con `[marcador: …]` donde falta un dato.
- Aviso de cookies sin trampas:
  - "Solo las necesarias" pesa lo mismo que aceptar;
  - la medición está apagada por defecto;
  - se respeta la señal Global Privacy Control;
  - la elección se cambia desde el pie de página.
- Medición de navegación (`analytics.navigation_events`):
  - sin usuario, IP ni parámetros;
  - nunca se miden las rutas privadas;
  - código de visita al azar por pestaña;
  - se borra a los 90 días (con pg_cron);
  - el resumen del Ops Center oculta lo que tenga menos de 5 visitas.
- Las ubicaciones de denuncias nunca se publican, y la identidad solo se comparte con autorización expresa.

## Accesibilidad

- Objetivo: WCAG 2.2 AA.
- Lo que ya está:
  - enlace "Saltar al contenido";
  - foco siempre visible;
  - Atkinson Hyperlegible;
  - contraste verificado por tokens;
  - movimiento reducido respetado;
  - descripciones para lectores de pantalla en el relieve 3D;
  - encabezados semánticos en Android.
- CI revisa 13 páginas con axe en tema claro y oscuro, y falla con problemas graves o críticos.

## Pendiente con datos del equipo

- Razón social, RUC, dirección y correos de contacto, privacidad, derechos de autor y accesibilidad.
- Regiones de alojamiento de los proveedores y tabla de retención por tipo de dato.
- Revisión de los textos por una abogada o un abogado en Nicaragua.
- `security.txt`, que necesita el dominio y un correo de seguridad.

## Protección de `main` en GitHub (lo configura la persona administradora del repositorio)

Settings → Rules → Rulesets → New branch ruleset:

- Nombre: `Proteger main`. Enforcement status: Active. Target branches: Include default branch.
- Restrict deletions (nadie puede borrar `main`).
- Block force pushes (nadie puede reescribir el historial).
- Require status checks to pass, con estos controles:
  - Sistema de diseño alineado (web + Android)
  - Lógica sin dependencias (asistente, Ops Center, funciones)
  - Web + API (tipos, pruebas, build)
  - Migraciones + pruebas RLS
  - Android (análisis y pruebas)
  - Imágenes Docker (web y API)
  - Análisis de seguridad (CodeQL)
- No marcar "Require a pull request before merging": el trabajo avanza `main` al mismo commit ya probado en `desarrollo`, y GitHub acepta el envío porque ese commit ya pasó los controles.

Settings → General → Pull Requests: activar "Automatically delete head branches" (las ramas de Dependabot se borran solas al fusionar o cerrar su propuesta).
