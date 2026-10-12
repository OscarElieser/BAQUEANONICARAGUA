#!/usr/bin/env python3
# Copia los textos legales de content/legal a la web y a Android para que ambos muestren exactamente lo mismo.
# Uso: python3 scripts/sync_legal.py           -> copia los archivos
#      python3 scripts/sync_legal.py --check   -> solo comprueba que estén iguales (lo usa CI)

import json  # Para validar el contenido
import pathlib  # Para manejar rutas de archivos
import sys  # Para leer los argumentos y salir con error

ROOT = pathlib.Path(__file__).resolve().parent.parent  # Carpeta raíz del repositorio
SOURCE = ROOT / "content" / "legal"  # Fuente única de los textos
TARGETS = [ROOT / "apps" / "web" / "src" / "content" / "legal", ROOT / "apps" / "mobile" / "assets" / "legal"]  # Copias en web y Android
REQUIRED = {"sobre-nosotros", "privacidad", "cookies", "terminos", "accesibilidad", "contacto"}  # Páginas que deben existir


def validate(path: pathlib.Path) -> None:
    """Comprueba que el archivo tenga la forma esperada para no romper la web ni la app."""
    data = json.loads(path.read_text(encoding="utf-8"))  # Lee el JSON
    slugs = {p["slug"] for p in data["pages"]}  # Páginas presentes
    missing = REQUIRED - slugs  # Páginas que faltan
    if missing:  # Si falta alguna
        sys.exit(f"{path.name}: faltan las páginas {sorted(missing)}")  # Error claro
    for page in data["pages"]:  # Revisa cada página
        for key in ("slug", "title", "summary", "sections"):  # Campos obligatorios
            if not page.get(key):  # Si falta o está vacío
                sys.exit(f"{path.name}: la página {page.get('slug')} no tiene {key}")  # Error claro
        for section in page["sections"]:  # Revisa cada sección
            if not section.get("heading") or not (section.get("body") or section.get("items")):  # Debe tener título y texto
                sys.exit(f"{path.name}: sección incompleta en {page['slug']}")  # Error claro


def main() -> None:
    check = "--check" in sys.argv  # Si solo hay que comprobar
    problems = []  # Diferencias encontradas
    for src in sorted(SOURCE.glob("*.json")):  # Cada idioma disponible
        validate(src)  # Valida la fuente
        for target_dir in TARGETS:  # Cada destino
            dst = target_dir / src.name  # Archivo de destino
            if check:  # Modo comprobación
                if not dst.exists() or dst.read_bytes() != src.read_bytes():  # Falta o es distinto
                    problems.append(str(dst.relative_to(ROOT)))  # Lo anota
            else:  # Modo copia
                target_dir.mkdir(parents=True, exist_ok=True)  # Crea la carpeta si hace falta
                dst.write_bytes(src.read_bytes())  # Copia el archivo
    if problems:  # Hay copias desactualizadas
        sys.exit("Textos legales desactualizados (ejecuta python3 scripts/sync_legal.py): " + ", ".join(problems))  # Error claro
    print("Textos legales alineados en web y Android" if check else "Textos legales copiados")  # Resultado


if __name__ == "__main__":  # Solo al ejecutar el archivo directamente
    main()  # Ejecuta
