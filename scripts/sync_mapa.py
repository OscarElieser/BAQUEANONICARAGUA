#!/usr/bin/env python3
# Copia el mapa ilustrado (content/territorios/mapa.json) a la web y a Android, y comprueba que esté completo.
# Uso: python3 scripts/sync_mapa.py           -> copia
#      python3 scripts/sync_mapa.py --check   -> solo comprueba (lo usa CI)
# El mapa se regenera con el flujo "Datos del mapa" (scripts/mapa/generar_mapa.py).

import json  # Validar el contenido
import pathlib  # Rutas
import sys  # Argumentos y errores

ROOT = pathlib.Path(__file__).resolve().parent.parent  # Raíz del repositorio
SOURCE = ROOT / "content" / "territorios" / "mapa.json"  # Fuente única
TARGETS = [ROOT / "apps" / "web" / "src" / "content" / "mapa.json", ROOT / "apps" / "mobile" / "assets" / "mapa" / "mapa.json"]  # Copias


def main() -> None:
    data = json.loads(SOURCE.read_text(encoding="utf-8"))  # Lee el mapa
    slugs = {t["slug"] for t in data["territories"]}  # Territorios presentes
    if len(slugs) != 17 or any(not t["d"] for t in data["territories"]):  # Deben ser los 17, todos con forma
        sys.exit("El mapa debe tener los 17 territorios con su forma")  # Error claro
    if "source" not in data or "note" not in data:  # Fuente y aviso obligatorios
        sys.exit("El mapa debe citar su fuente y su aviso de límites aproximados")  # Error claro
    stale = []  # Copias desactualizadas
    for target in TARGETS:  # Cada copia
        if "--check" in sys.argv:  # Solo comprobar
            if not target.exists() or target.read_bytes() != SOURCE.read_bytes():  # Falta o difiere
                stale.append(str(target.relative_to(ROOT)))  # Lo anota
        else:  # Copiar
            target.parent.mkdir(parents=True, exist_ok=True)  # Crea la carpeta
            target.write_bytes(SOURCE.read_bytes())  # Copia
    if stale:  # Hay copias viejas
        sys.exit("Mapa desactualizado (ejecuta python3 scripts/sync_mapa.py): " + ", ".join(stale))  # Error claro
    print("Mapa de los 17 territorios alineado en web y Android")  # Resultado


if __name__ == "__main__":  # Solo al ejecutar el archivo
    main()  # Ejecuta
