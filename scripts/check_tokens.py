#!/usr/bin/env python3
"""Verifica que web (globals.css) y Android (theme.dart) usan exactamente los colores
de design/sistema/tokens.json en ambos temas. Sale con código 1 si hay diferencias."""
import json
import pathlib
import re
import sys

root = pathlib.Path(__file__).resolve().parent.parent
tokens = json.loads((root / "design/sistema/tokens.json").read_text(encoding="utf-8"))
css = (root / "apps/web/src/app/globals.css").read_text(encoding="utf-8").upper()
dart = (root / "apps/mobile/lib/core/theme.dart").read_text(encoding="utf-8").upper()

missing = []
for t in tokens["color"]["tokens"]:
    values = t["value"] if isinstance(t["value"], dict) else {"all": t["value"]}
    for theme, hexv in values.items():
        h = hexv.lstrip("#").upper()
        if f"#{h}" not in css:
            missing.append(f"web: {t['name']} ({theme}) #{h}")
        if f"0XFF{h}" not in dart:
            missing.append(f"android: {t['name']} ({theme}) #{h}")

# Ningún color fuera del sistema en los tokens de la web
allowed = {
    v.lstrip("#").upper()
    for t in tokens["color"]["tokens"]
    for v in (t["value"].values() if isinstance(t["value"], dict) else [t["value"]])
}
for h in set(re.findall(r"#([0-9A-F]{6})\b", css)):
    if h not in allowed:
        missing.append(f"web: color #{h} no está en el sistema")

if missing:
    print("Desalineación con el sistema de diseño:")
    print("\n".join(f"  - {m}" for m in sorted(missing)))
    sys.exit(1)
print(f"OK: {len(tokens['color']['tokens'])} tokens de color alineados en web y Android.")
