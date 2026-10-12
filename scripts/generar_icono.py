#!/usr/bin/env python3
# Genera el icono de la app y de la web: la silueta real de Nicaragua (los 17 territorios del mapa)
# repetida en bandas que se encogen hacia el centro, como curvas de nivel. Oro sobre verde territorial.
# Uso: python3 scripts/generar_icono.py  -> escribe apps/web/public/icono.svg (los PNG se sacan de este SVG)

import json  # Leer el mapa
import pathlib  # Rutas

ROOT = pathlib.Path(__file__).resolve().parent.parent  # Raíz del repositorio
MAPA = json.loads((ROOT / "content" / "territorios" / "mapa.json").read_text(encoding="utf-8"))  # Mapa generado desde Natural Earth
VERDE, ORO, TERRACOTA = "#0D5448", "#E4B063", "#C65F3E"  # Colores del sistema de diseño (ground oscuro, oro y terracota)
CENTRO = (500, 470)  # Punto hacia el que se encogen las bandas (centro aproximado del país en el dibujo)
ESCALAS = [1.0, 0.74, 0.5, 0.28]  # Bandas: oro, verde, oro, verde… de afuera hacia adentro


def main() -> None:
    silueta = " ".join(t["d"] for t in MAPA["territories"])  # Todos los territorios juntos: la silueta del país
    cx, cy = CENTRO  # Centro de las bandas
    usos = []  # Copias encogidas de la silueta
    for i, s in enumerate(ESCALAS):  # Cada banda
        color = ORO if i % 2 == 0 else VERDE  # Alterna oro y verde: así no se ven los límites internos
        usos.append(f'<use href="#pais" fill="{color}" stroke="{color}" stroke-width="{3 / s:.1f}" stroke-linejoin="round" transform="translate({cx} {cy}) scale({s}) translate({-cx} {-cy})"/>')  # Copia encogida hacia el centro (el borde del mismo color tapa las rendijas entre territorios)
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-120 -150 1240 1240">'  # Lienzo cuadrado con margen
        f'<rect x="-120" y="-150" width="1240" height="1240" rx="260" fill="{VERDE}"/>'  # Fondo verde con esquinas redondeadas
        f'<defs><path id="pais" d="{silueta}"/></defs>'  # La silueta, definida una sola vez
        + "".join(usos)  # Las bandas
        + f'<circle cx="{cx}" cy="{cy}" r="34" fill="{TERRACOTA}"/>'  # La cima, en terracota volcánica
        + "</svg>"
    )
    destino = ROOT / "apps" / "web" / "public" / "icono.svg"  # Archivo de salida
    destino.write_text(svg, encoding="utf-8")  # Guarda el icono
    print(f"Icono generado: {destino.relative_to(ROOT)} ({len(svg)} caracteres)")  # Resultado


if __name__ == "__main__":  # Solo al ejecutar el archivo
    main()  # Ejecuta
