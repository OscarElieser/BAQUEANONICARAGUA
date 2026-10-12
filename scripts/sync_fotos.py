#!/usr/bin/env python3
# Copia el catálogo de fotos reales (content/fotos/fotos.json) a la web y a Android, copia las vistas
# de 800 px a la app, y comprueba que cada foto tenga autor, licencia libre, página de origen y archivo.
# Uso: python3 scripts/sync_fotos.py           -> copia
#      python3 scripts/sync_fotos.py --check   -> solo comprueba (lo usa CI)

import json  # Validar el contenido
import pathlib  # Rutas
import re  # Revisar licencias
import sys  # Argumentos y errores

ROOT = pathlib.Path(__file__).resolve().parent.parent  # Raíz del repositorio
SOURCE = ROOT / "content" / "fotos" / "fotos.json"  # Fuente única del catálogo
WEB_JSON = ROOT / "apps" / "web" / "src" / "content" / "fotos.json"  # Copia para la web
APP_DIR = ROOT / "apps" / "mobile" / "assets" / "fotos"  # Carpeta de la app
PUBLIC = ROOT / "apps" / "web" / "public"  # Archivos públicos de la web
LICENCIA_OK = re.compile(r"^(CC0|Public domain|CC BY(-SA)? (2\.0|2\.5|3\.0|4\.0)( .*)?)$", re.I)  # Licencias libres aceptadas


def main() -> None:
    data = json.loads(SOURCE.read_text(encoding="utf-8"))  # Lee el catálogo
    errores = []  # Problemas encontrados
    for clave, f in data["fotos"].items():  # Cada foto
        for campo in ("lugar", "archivo", "pagina", "autor", "licencia", "imagen", "imagen_movil"):  # Datos obligatorios
            if not f.get(campo): errores.append(f"{clave}: falta {campo}")  # Sin ese dato no se publica
        if not LICENCIA_OK.match(f.get("licencia", "")): errores.append(f"{clave}: licencia no libre ({f.get('licencia')})")  # Solo licencias libres
        if not str(f.get("pagina", "")).startswith("https://commons.wikimedia.org/"): errores.append(f"{clave}: la página de origen debe ser de Commons")  # Origen verificable
        for img in (f.get("imagen", ""), f.get("imagen_movil", "")):  # Archivos de la web
            if not (PUBLIC / img.lstrip("/")).exists(): errores.append(f"{clave}: no existe {img}")  # Debe estar en public/
    if errores: sys.exit("Catálogo de fotos con problemas:\n  " + "\n  ".join(errores))  # Error claro
    copias = [(SOURCE, WEB_JSON), (SOURCE, APP_DIR / "fotos.json")]  # El catálogo en web y app
    copias += [(PUBLIC / f["imagen_movil"].lstrip("/"), APP_DIR / pathlib.Path(f["imagen_movil"]).name) for f in data["fotos"].values()]  # Vistas de 800 px para la app
    viejas = []  # Copias desactualizadas
    for origen, destino in copias:  # Cada copia
        if "--check" in sys.argv:  # Solo comprobar
            if not destino.exists() or destino.read_bytes() != origen.read_bytes(): viejas.append(str(destino.relative_to(ROOT)))  # Falta o difiere
        else:  # Copiar
            destino.parent.mkdir(parents=True, exist_ok=True)  # Crea la carpeta
            destino.write_bytes(origen.read_bytes())  # Copia
    if viejas: sys.exit("Fotos desactualizadas (ejecuta python3 scripts/sync_fotos.py): " + ", ".join(viejas))  # Error claro
    print(f"Fotos reales: {len(data['fotos'])} con autor y licencia libre, alineadas en web y Android")  # Resultado


if __name__ == "__main__":  # Solo al ejecutar el archivo
    main()  # Ejecuta
