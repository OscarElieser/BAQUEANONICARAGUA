# Sonda de solo lectura: averigua qué está activado en Firebase y si la función de Supabase responde.
# Usa solo la clave pública de Firebase (la misma que va en la web). No crea cuentas ni datos.
import json  # Leer y escribir JSON
import urllib.error  # Errores HTTP
import urllib.request  # Peticiones HTTP

CLAVE = "AIzaSyB9Qe0XfaS54ew1IakQSZC_kxg398Lrfrc"  # Clave pública de Firebase (no es secreta)
PROYECTO = "baqueanonicaragua-95755"  # Proyecto de Firebase
SUPABASE = "https://nupjhqrvxjrngtpslfjq.supabase.co"  # Proyecto de Supabase
PUBLICABLE = "sb_publishable_RM56EpgYxprblYCVyXD9Lw_17qwdZPc"  # Clave publicable de Supabase (no es secreta)
IDT = "https://identitytoolkit.googleapis.com/v1"  # Servicio de identidad de Firebase


def pedir(url, cuerpo=None, cabeceras=None):
    """Hace una petición y devuelve (código, cuerpo como texto)."""
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None  # Cuerpo JSON si lo hay
    req = urllib.request.Request(url, data=datos, headers={"Content-Type": "application/json", **(cabeceras or {})})  # Petición
    try:
        with urllib.request.urlopen(req, timeout=20) as r:  # Envía
            return r.status, r.read().decode()  # Éxito
    except urllib.error.HTTPError as e:  # Respuesta con error
        return e.code, e.read().decode()  # Código y texto
    except Exception as e:  # Sin conexión u otro fallo
        return 0, str(e)  # Sin respuesta


def mensaje(texto):
    """Extrae el mensaje de error de Firebase (o el texto corto)."""
    try:
        return json.loads(texto)["error"]["message"]  # Mensaje de Firebase
    except Exception:
        return texto[:160]  # Texto corto


print("## Sonda de servicios\n")  # Título del resumen

c, t = pedir(f"{IDT}/projects?key={CLAVE}")  # Configuración pública del proyecto
dominios = json.loads(t).get("authorizedDomains", []) if c == 200 else []  # Dominios autorizados
print(f"- Configuración de Firebase: {'responde' if c == 200 else 'error ' + str(c) + ' ' + mensaje(t)}")  # Resultado
print(f"- Dominios autorizados: {', '.join(dominios) or 'ninguno'}")  # Lista

c, t = pedir(f"{IDT}/accounts:signInWithPassword?key={CLAVE}", {"email": "sonda-no-existe@example.invalid", "password": "sonda-12345678", "returnSecureToken": True})  # Cuenta que no existe: solo mira qué error da
m = mensaje(t)  # Error devuelto
correo = "desactivado" if "OPERATION_NOT_ALLOWED" in m or "PASSWORD_LOGIN_DISABLED" in m else ("activado" if m in ("EMAIL_NOT_FOUND", "INVALID_LOGIN_CREDENTIALS", "INVALID_PASSWORD") else f"no se sabe ({m})")  # Interpretación
print(f"- Correo y contraseña: {correo}")  # Resultado

c, t = pedir(f"{IDT}/accounts:createAuthUri?key={CLAVE}", {"providerId": "google.com", "continueUri": f"https://{PROYECTO}.firebaseapp.com/__/auth/handler"})  # Pide la dirección de Google sin iniciar nada
google = "activado" if c == 200 and "authUri" in t else f"desactivado o sin configurar ({mensaje(t)})"  # Interpretación
print(f"- Google: {google}")  # Resultado

c, t = pedir(f"{SUPABASE}/functions/v1/preparar-sesion", {}, {"apikey": PUBLICABLE})  # Sin token de Firebase: debe rechazar con 401
print(f"- Función preparar-sesion: {'desplegada (rechaza sin token, código ' + str(c) + ')' if c in (400, 401, 403) else 'código ' + str(c) + ' ' + t[:120]}")  # Resultado
