# Publicación (Fase 10)

El flujo `.github/workflows/deploy.yml` (Actions → **Publicar** → Run workflow) publica en `staging` o en `production`. Nunca corre solo: siempre lo inicia una persona.

## Qué garantiza

1. Solo publica el último commit de `main`, y solo si CI y CodeQL están en verde para ese commit.
2. Producción se detiene a esperar la aprobación de una persona. Eso se configura en el environment `production` con revisores obligatorios.
3. Antes de tocar nada revisa que estén todos los secretos y variables, y dice exactamente cuál falta.
4. Aplica las migraciones de Supabase y despliega la función `preparar-sesion` con sus secretos.
5. En el servidor descarga las imágenes de ese commit, las arranca y espera a que estén sanas. Si no lo están en 5 minutos, vuelve sola a la versión anterior.
6. Vacía la caché de Cloudflare y comprueba desde fuera que la web y la API responden con sus cabeceras de seguridad.

## Recorrido

```
GitHub Actions ──(imágenes por commit)──► GitHub Container Registry
       │
       ├──(CLI)──► Supabase: migraciones + función preparar-sesion
       │
       └──(SSH)──► Servidor Hostinger (VPS con Docker)
                    Caddy :443 ◄── Cloudflare (proxy, WAF, caché) ◄── visitantes
                      ├─ web :3000
                      └─ api :4000
```

## 1. Cuentas que hacen falta

| Servicio | Para qué | Plan mínimo |
| --- | --- | --- |
| Hostinger | VPS donde corren la web y la API | VPS KVM con Docker. El hosting compartido no sirve para Node + Docker. |
| Cloudflare | DNS, HTTPS, WAF y caché | Gratuito para empezar |
| Supabase | Base de datos y función de sesión | Un proyecto por entorno (staging y producción) |
| Firebase | Inicio de sesión | Un proyecto por entorno |
| GitHub | Código, CI e imágenes | El que ya existe |

## 2. Preparar el servidor (una sola vez)

En el VPS, como administrador:

1. Instalar Docker y el plugin Compose (Hostinger ofrece una plantilla de Ubuntu con Docker).
2. Crear el usuario `deploy` sin contraseña, solo con clave SSH, y agregarlo al grupo `docker`.
3. Crear las carpetas `/srv/nica/staging` y `/srv/nica/produccion`, con dueño `deploy`.
4. En cada carpeta, crear:
   - `.env` con:
     ```
     GHCR_OWNER=oscarelieser
     WEB_DOMAIN=…
     API_DOMAIN=…
     ```
   - `.env.api` con las variables de servidor de la API (ver `.env.example`: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_B64`, `CORS_ORIGINS=https://<dominio web>`).
   - `certs/origin.pem` y `certs/origin-key.pem`: el certificado de origen de Cloudflare (SSL/TLS → Origin Server → Create certificate, para ambos dominios).
5. Firewall: abrir solo el 22 (SSH) y el 443. Lo ideal es permitir el 443 solo desde los rangos de Cloudflare.
6. Staging y producción en el mismo VPS necesitan dominios distintos y otro Caddy por entorno, o un Caddy compartido. Lo más simple es un VPS por entorno.

## 3. Cloudflare

- DNS: registros A de los dos dominios apuntando al VPS, con la nube naranja (proxy) activada.
- SSL/TLS: modo **Full (strict)**.
- Revisar que los rangos de `deploy/servidor/Caddyfile` coincidan con cloudflare.com/ips.
- Token de API con el permiso **Zone → Cache Purge**, solo para la zona del sitio.

## 4. GitHub: environments, secretos y variables

En Settings → Environments, crear `staging` y `production`. En `production`, activar **Required reviewers**; esa es la aprobación manual.

**Secretos** (en cada environment):

| Nombre | Qué es |
| --- | --- |
| `SSH_HOST` | IP o nombre del VPS |
| `SSH_USER` | `deploy` |
| `SSH_PRIVATE_KEY` | Clave privada SSH del usuario `deploy`, creada solo para esto |
| `SSH_KNOWN_HOSTS` | Salida de `ssh-keyscan <host>` (evita conectarse a un servidor impostor) |
| `SUPABASE_ACCESS_TOKEN` | Token personal de la CLI de Supabase |
| `SUPABASE_DB_PASSWORD` | Contraseña de la base de datos del proyecto |
| `FIREBASE_SERVICE_ACCOUNT` | JSON de la cuenta de servicio de Firebase (para agregar el rol en la sesión) |
| `CLOUDFLARE_API_TOKEN` | Token con permiso de vaciar la caché |

**Variables** (en cada environment; son públicas o no sensibles):

| Nombre | Ejemplo |
| --- | --- |
| `SUPABASE_PROJECT_REF` | `nupjhqrvxjrngtpslfjq` (https://supabase.com/dashboard/project/nupjhqrvxjrngtpslfjq/) |
| `FIREBASE_PROJECT_ID` | `baqueanonicaragua-95755` |
| `WEB_DOMAIN` | `[marcador: dominio web]` |
| `API_DOMAIN` | `[marcador: dominio de la API]` |
| `CLOUDFLARE_ZONE_ID` | ID de la zona |
| `DEPLOY_DIR` | `/srv/nica/produccion` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publicable de Supabase |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Clave web de Firebase (es pública) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `<proyecto>.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ID de la app web de Firebase |
| `NEXT_PUBLIC_MAP_STYLE_URL` | Estilo del proveedor de mapas (opcional; vacío = mapa desactivado con aviso) |
| `CSP_EXTRA_CONNECT` | Dominios extra del proveedor de mapas, separados por espacios (opcional) |

## 5. Primera publicación

1. Ejecutar **Publicar** con `staging`, revisar el sitio y probar el inicio de sesión de punta a punta.
2. Ejecutar **Publicar** con `production`. Se detendrá hasta que una persona apruebe.
3. Si algo sale mal en el servidor, el script vuelve solo a la versión anterior y el flujo queda en rojo con el motivo.

## Reglas para las migraciones

- Cada migración debe funcionar con la versión anterior de la web y la API, porque la base se actualiza antes que el servidor. Por eso nunca se borra ni se renombra una columna en uso en el mismo despliegue que deja de usarla: primero se publica el código nuevo y la limpieza va en un despliegue posterior.
- Todo cambio de base de datos lleva RLS y pruebas en `supabase/tests/rls_smoke.sql` (CI las corre en cada commit).

## Buscadores (Google, Bing y los demás)

Lo que ya hace el sitio:

- `robots.txt` anuncia el sitemap y bloquea las zonas privadas (cuenta, mensajes, denuncias y Ops Center).
- `sitemap.xml` lista cada página pública en los 10 idiomas, con sus versiones alternativas (`hreflang`) y `x-default` en español. Incluye territorios, destinos y negocios publicados, y se regenera cada hora.
- Cada página tiene su dirección canónica, sus versiones por idioma, su título y su descripción traducidos, y vista previa para compartir.
- Datos estructurados (schema.org):
  - el sitio, con su buscador;
  - los territorios;
  - los destinos (TouristAttraction);
  - los negocios (LocalBusiness), solo con datos reales: sin precios, reseñas ni coordenadas inventadas.
- Paginación con enlaces reales: el mapa por páginas y Comunidad hacia atrás en el tiempo. Las búsquedas y las páginas siguientes llevan `noindex, follow`, para no llenar Google de páginas repetidas sin perder los enlaces.
- CI comprueba en cada commit el sitemap, el robots, las canónicas y el `noindex` de las búsquedas.

Lo que hay que hacer al publicar (necesita el dominio):

1. Definir la variable `WEB_DOMAIN`. El flujo la convierte en `NEXT_PUBLIC_SITE_URL` para canónicas y sitemap.
2. Google Search Console: agregar la propiedad de dominio y verificarla con un registro TXT en Cloudflare. Después enviar `https://<dominio>/sitemap.xml`.
3. Bing Webmaster Tools: importar el sitio desde Search Console. Bing también alimenta a DuckDuckGo, Yahoo y Ecosia.
4. Yandex Webmaster y Naver Search Advisor (opcional): útiles para el público de Rusia y de Corea. Se verifican con una etiqueta o un registro TXT, que se agrega cuando existan las cuentas.
5. Baidu: requiere registro con datos de empresa en China. No se hace por ahora.


## BAQÜI (Google Gemini)

- La función `baqui` de Supabase llama a Gemini con el secreto `GEMINI_API_KEY`. Se carga en Supabase → Edge Functions → Secrets, o en GitHub como secreto `GEMINI_API_KEY` del environment (el flujo Publicar lo copia a Supabase). Nunca va en la web ni en Android.
- `GEMINI_MODEL` es opcional (por defecto `gemini-2.5-flash`).
- Sin la clave, BAQÜI responde 503 y la web y la app dicen "No disponible todavía".

## Historial de migraciones en producción

Las migraciones que se aplicaron con la herramienta de Supabase quedaron registradas con su hora real como versión (`20261012192731`, `20261013035526`, `20261013042928`). Para no tocar el historial de producción, los archivos del repositorio usan esos mismos números, así `supabase db push` del flujo Publicar ve todo alineado y solo aplica lo nuevo (por ejemplo, `20261013061500_metricas_viajeros.sql`).

Regla para lo que venga: si una migración se aplica con la herramienta de Supabase, el archivo del repositorio se renombra con la versión que quedó registrada (`list_migrations`).

## Superadministrador inicial

- La primera vez que la cuenta del dueño inicia sesión (web o Android) con su correo ya verificado, la función `preparar-sesion` llama a `session_bootstrap_superadmin` y la base le da el rol `superadmin`. Queda en `audit.logs` como `role.bootstrap`.
- Sirve una sola vez: si ya existe un superadministrador, o si la marca ya se usó, no hace nada. Ningún cliente puede llamarla (solo la clave de servicio, que vive en Supabase).
- El repositorio es público, así que el correo no está escrito en ningún archivo: la migración guarda solo su huella SHA-256 (correo en minúsculas, sin espacios).
- Para dar o quitar roles después se usa el Ops Center (`admin_grant_role` / `admin_revoke_role`, con su protección del último superadministrador).
- Las operaciones del Ops Center piden además la verificación en dos pasos de Firebase.

## Firma de Android y huellas para Firebase

Firebase pide las huellas SHA-1 y SHA-256 del certificado con el que se firma la app (`com.baqueano.nicaragua`) para el inicio de sesión con Google y para verificar la app. Las huellas no son secretas; el archivo de la llave y sus contraseñas sí lo son y nunca van al repositorio ni al chat.

**Llave de pruebas (la de tu computadora).** Android Studio la crea sola la primera vez que corres la app. Sus huellas:

```
# Windows (Símbolo del sistema, con Android Studio instalado)
"C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -alias androiddebugkey -keystore "%USERPROFILE%\.android\debug.keystore" -storepass android
# Mac o Linux
keytool -list -v -alias androiddebugkey -keystore ~/.android/debug.keystore -storepass android
```

**Llave de publicación (para Google Play).** Se crea una sola vez en la computadora del dueño y se guarda con copia de seguridad (si se pierde y no se usa la firma de apps de Google Play, no se puede actualizar la app):

```
keytool -genkeypair -v -keystore baqueano-publicacion.jks -alias baqueano -keyalg RSA -keysize 2048 -validity 10000
keytool -list -v -keystore baqueano-publicacion.jks -alias baqueano
```

Luego se crea `apps/mobile/android/key.properties` (git lo ignora) con:

```
storeFile=C:/ruta/a/baqueano-publicacion.jks
storePassword=la contraseña del almacén
keyAlias=baqueano
keyPassword=la contraseña de la llave
```

Con ese archivo, `flutter build appbundle` firma con la llave propia; sin él, la versión de publicación usa la llave de pruebas (sirve para probar, no para Google Play).

**En Firebase:** ⚙️ Configuración del proyecto → General → Tus apps → app Android → Agregar huella digital (una vez la SHA-1 y otra la SHA-256, de cada llave). Si la app se publica en Google Play con la firma de apps de Google, también se agregan las huellas que muestra Play Console → Integridad de la app. Después se descarga de nuevo `google-services.json`.

## Avisos push (web y Android)

- **Clave pública de la web (VAPID):** ya está en `apps/web/src/config/publica.json` (`firebaseVapidKey`). No es secreta; se puede cambiar con `NEXT_PUBLIC_FIREBASE_VAPID_KEY`. La privada de ese par nunca sale de Firebase.
- **Registro:** la persona activa los avisos en Cuenta (web) o en Perfil (Android). El navegador o el teléfono piden permiso y el token se guarda con `push_register` (exige sesión). Al cerrar sesión se borra. En Android el registro automático de Firebase está apagado: el teléfono solo se registra si la persona lo pide.
- **Envío:** la función `enviar-avisos` toma los avisos pendientes (`push_claim`), los manda con FCM (API v1) y anota el resultado real (`push_report`): enviado, fallido (tras 3 intentos) u omitido (sin dispositivos o de hace más de un día). Borra los tokens que Firebase da de baja.
- **Quién la despierta:** `pg_cron` cada minuto, solo si hay avisos pendientes y solo en producción (la dirección `avisos_url` se guarda en `app.settings` cuando el proyecto de Firebase es el oficial).
- **Secreto que necesita:** el mismo `FIREBASE_SERVICE_ACCOUNT` de `preparar-sesion` (permiso solo para enviar mensajes). Sin él, la función responde 503 y no toca los avisos. `SITIO_URL` es opcional (por defecto `https://baqueanonicaragua.com`).
- **El Ops Center** ve solo cifras: navegadores y teléfonos con avisos, y avisos entregados o fallidos en 24 h.
- **Android:** para que FCM funcione hace falta el `google-services.json` de la app Android registrada en Firebase (con sus huellas SHA-1 y SHA-256).

## Verificación en dos pasos (Ops Center)

La API del Ops Center solo acepta sesiones que entraron con el segundo paso (código de una app de autenticación, TOTP). La web ya trae todo: activar o quitar la verificación en Cuenta y pedir el código al iniciar sesión (también en Android). Falta encenderla en el proyecto de Firebase, una sola vez:

1. Firebase → Authentication → Configuración → **Actualizar a Firebase Authentication con Identity Platform**. No pide método de pago; en el plan sin costo el límite es de 3.000 personas activas por día.
2. Encender TOTP (Firebase no tiene botón para esto; se hace con una llamada de administrador). En la consola de Google Cloud del proyecto, abrir **Cloud Shell** y pegar:

```
curl -X PATCH "https://identitytoolkit.googleapis.com/admin/v2/projects/baqueanonicaragua-95755/config?updateMask=mfa" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "X-Goog-User-Project: baqueanonicaragua-95755" \
  -H "Content-Type: application/json" \
  -d '{"mfa":{"providerConfigs":[{"state":"ENABLED","totpProviderConfig":{"adjacentIntervals":5}}]}}'
```

3. Entrar a la web con la cuenta de superadministrador, verificar el correo si hace falta, y en **Cuenta → Verificación en dos pasos** cargar la clave en la app de autenticación y confirmar con el código.
4. Cerrar sesión y volver a entrar con el código: desde ese momento el Ops Center acepta las acciones.

Mientras TOTP no esté encendido, la web lo dice ("No disponible todavía") y no simula nada.
