#!/usr/bin/env python3
# Textos de la interfaz en 10 idiomas: valida content/i18n y los copia a la web (JSON) y a Android (Dart generado).
# Uso: python3 scripts/sync_i18n.py           -> valida y genera
#      python3 scripts/sync_i18n.py --check   -> solo comprueba que todo esté alineado (lo usa CI)

import json  # Leer y escribir JSON
import pathlib  # Rutas de archivos
import re  # Buscar {variables} en los textos
import sys  # Argumentos y salida con error

ROOT = pathlib.Path(__file__).resolve().parent.parent  # Raíz del repositorio
SOURCE = ROOT / "content" / "i18n"  # Fuente única de los textos
WEB = ROOT / "apps" / "web" / "src" / "content" / "i18n"  # Copia para la web
DART = ROOT / "apps" / "mobile" / "lib" / "core" / "i18n" / "strings.g.dart"  # Archivo generado para Android
AVISOS = ROOT / "supabase" / "functions" / "enviar-avisos" / "textos.ts"  # Textos de los avisos push para la función del servidor
LOCALES = ["es", "en", "zh-Hans", "ko", "it", "fr", "pt", "de", "ru", "ja"]  # Mismos idiomas que apps/web/src/i18n/config.ts
VAR = re.compile(r"\{([A-Za-z0-9_]+)\}")  # Variables como {amount} o {118}


def load() -> dict:
    """Lee y valida todos los idiomas; corta con un mensaje claro ante cualquier problema."""
    data = {}  # Textos por idioma
    for loc in LOCALES:  # Cada idioma
        path = SOURCE / f"{loc}.json"  # Archivo del idioma
        if not path.exists():  # Falta el archivo
            sys.exit(f"Falta content/i18n/{loc}.json")  # Error claro
        data[loc] = json.loads(path.read_text(encoding="utf-8"))  # Lee el JSON
    base = {k: v for k, v in data["es"].items() if k != "_meta"}  # Español: fuente de verdad
    problems = []  # Problemas encontrados
    for loc in LOCALES:  # Compara cada idioma con el español
        meta = data[loc].get("_meta", {})  # Metadatos
        if meta.get("status") not in ("source", "needs_review", "approved"):  # Estado obligatorio
            problems.append(f"{loc}: _meta.status debe ser source, needs_review o approved")  # Lo anota
        texts = {k: v for k, v in data[loc].items() if k != "_meta"}  # Textos del idioma
        for k in sorted(set(base) - set(texts)):  # Claves que faltan
            problems.append(f"{loc}: falta la clave {k}")  # Lo anota
        for k in sorted(set(texts) - set(base)):  # Claves que sobran
            problems.append(f"{loc}: clave desconocida {k} (agrégala primero en es.json)")  # Lo anota
        for k, v in texts.items():  # Cada texto
            if not isinstance(v, str) or not v.strip():  # Vacío o no es texto
                problems.append(f"{loc}: {k} está vacío")  # Lo anota
            elif k in base and set(VAR.findall(v)) != set(VAR.findall(base[k])):  # Variables distintas a las del español
                problems.append(f"{loc}: {k} debe tener las variables {sorted(set(VAR.findall(base[k])))}")  # Lo anota
    if problems:  # Hubo problemas
        sys.exit("Textos de la interfaz con problemas:\n  " + "\n  ".join(problems))  # Error claro
    return data  # Textos válidos


def dart_string(s: str) -> str:
    """Convierte un texto en literal de Dart entre comillas simples."""
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'").replace("$", "\\$").replace("\n", "\\n") + "'"  # Escapa lo necesario


def render_dart(data: dict) -> str:
    """Genera el archivo Dart con todos los textos (sin cargar archivos al abrir la app)."""
    lines = [
        "// ARCHIVO GENERADO por scripts/sync_i18n.py desde content/i18n. No editar a mano.",  # Aviso
        "// Textos de la interfaz en 10 idiomas; los comentarios por línea no aplican a datos generados.",  # Aclaración
        "",
        "/// Estado de cada idioma: source (original), needs_review (pendiente de revisión) o approved.",  # Documentación
        "const i18nStatus = <String, String>{",  # Inicio del mapa de estados
    ]
    for loc in LOCALES:  # Estado de cada idioma
        lines.append(f"  {dart_string(loc)}: {dart_string(data[loc]['_meta']['status'])},")  # Línea del estado
    lines += ["};", "", "/// Textos por idioma y clave.", "const i18nStrings = <String, Map<String, String>>{"]  # Inicio de los textos
    for loc in LOCALES:  # Cada idioma
        lines.append(f"  {dart_string(loc)}: {{")  # Inicio del idioma
        for k, v in data[loc].items():  # Cada texto
            if k != "_meta":  # Sin metadatos
                lines.append(f"    {dart_string(k)}: {dart_string(v)},")  # Clave y texto
        lines.append("  },")  # Fin del idioma
    lines.append("};")  # Fin del mapa
    return "\n".join(lines) + "\n"  # Archivo completo


def render_avisos(data: dict) -> str:
    """Genera los textos de los avisos push (claves push.*) para la función "enviar-avisos"."""
    lines = [
        "// ARCHIVO GENERADO por scripts/sync_i18n.py desde content/i18n (solo las claves push.*). No editar a mano.",  # Aviso
        "// Textos de los avisos push en 10 idiomas; los comentarios por línea no aplican a datos generados.",  # Aclaración
        "",
        "/** Textos por idioma y clave. */",  # Documentación
        "export const TEXTOS: Record<string, Record<string, string>> = {",  # Inicio del mapa
    ]
    for loc in LOCALES:  # Cada idioma
        lines.append(f"  {json.dumps(loc)}: {{")  # Inicio del idioma
        for k, v in data[loc].items():  # Cada texto
            if k.startswith("push."):  # Solo los de avisos push
                lines.append(f"    {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)},")  # Clave y texto como literales de TypeScript
        lines.append("  },")  # Fin del idioma
    lines.append("};")  # Fin del mapa
    return "\n".join(lines) + "\n"  # Archivo completo


def main() -> None:
    check = "--check" in sys.argv  # Si solo hay que comprobar
    data = load()  # Valida los textos
    outputs = {WEB / f"{loc}.json": (SOURCE / f"{loc}.json").read_text(encoding="utf-8") for loc in LOCALES}  # Copias para la web
    outputs[DART] = render_dart(data)  # Archivo de Android
    outputs[AVISOS] = render_avisos(data)  # Textos de los avisos push para el servidor
    stale = []  # Archivos desactualizados
    for path, content in outputs.items():  # Cada salida
        if check:  # Modo comprobación
            if not path.exists() or path.read_text(encoding="utf-8") != content:  # Falta o es distinto
                stale.append(str(path.relative_to(ROOT)))  # Lo anota
        else:  # Modo generación
            path.parent.mkdir(parents=True, exist_ok=True)  # Crea la carpeta si hace falta
            path.write_text(content, encoding="utf-8")  # Escribe el archivo
    if stale:  # Hay copias viejas
        sys.exit("Textos desactualizados (ejecuta python3 scripts/sync_i18n.py): " + ", ".join(stale))  # Error claro
    keys = len(data["es"]) - 1  # Cantidad de claves
    print(f"Interfaz: {keys} textos en {len(LOCALES)} idiomas {'alineados' if check else 'generados'}")  # Resultado


if __name__ == "__main__":  # Solo al ejecutar el archivo directamente
    main()  # Ejecuta
