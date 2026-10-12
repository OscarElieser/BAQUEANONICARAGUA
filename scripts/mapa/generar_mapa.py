#!/usr/bin/env python3
# Convierte los límites de Natural Earth (dominio público) en un mapa ilustrado liviano de los 17 territorios.
# Uso: python3 scripts/mapa/generar_mapa.py <admin1.geojson> <lagos.geojson> <salida.json>
# Los límites son aproximados (escala 1:10 millones): sirven para ilustrar, no son límites oficiales.

import json  # Leer y escribir GeoJSON
import math  # Coseno para la proyección
import sys  # Argumentos

ISO = {  # Códigos ISO 3166-2 de Nicaragua y la dirección de cada territorio en la plataforma
    "NI-BO": "boaco", "NI-CA": "carazo", "NI-CI": "chinandega", "NI-CO": "chontales", "NI-ES": "esteli",
    "NI-GR": "granada", "NI-JI": "jinotega", "NI-LE": "leon", "NI-MD": "madriz", "NI-MN": "managua",
    "NI-MS": "masaya", "NI-MT": "matagalpa", "NI-NS": "nueva-segovia", "NI-SJ": "rio-san-juan", "NI-RI": "rivas",
    "NI-AN": "costa-caribe-norte", "NI-AS": "costa-caribe-sur",
}
LAKES = {"Lago de Nicaragua": "cocibolca", "Lago de Managua": "xolotlan"}  # Lagos que se dibujan como agua
WIDTH = 1000  # Ancho del dibujo en unidades SVG
TOLERANCE = 0.004  # Simplificación en grados (unos 400 m): suficiente para un mapa ilustrado


def rings(geom):
    """Anillos exteriores e interiores de un Polygon o MultiPolygon."""
    polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]  # Lista de polígonos
    return [ring for poly in polys for ring in poly]  # Todos los anillos


def simplify(points, tol):
    """Douglas-Peucker: quita puntos que casi no cambian la forma."""
    if len(points) < 4:  # Muy pocos puntos: se dejan
        return points  # Sin cambios
    (x1, y1), (x2, y2) = points[0], points[-1]  # Extremos
    dx, dy = x2 - x1, y2 - y1  # Vector entre extremos
    norm = math.hypot(dx, dy) or 1e-12  # Largo (evita dividir entre cero)
    far, idx = 0.0, 0  # Punto más alejado de la recta
    for i in range(1, len(points) - 1):  # Revisa los puntos intermedios
        d = abs(dy * points[i][0] - dx * points[i][1] + x2 * y1 - y2 * x1) / norm  # Distancia a la recta
        if d > far:  # Más lejos que el anterior
            far, idx = d, i  # Lo guarda
    if far <= tol:  # Todo está cerca de la recta
        return [points[0], points[-1]]  # Basta con los extremos
    return simplify(points[: idx + 1], tol)[:-1] + simplify(points[idx:], tol)  # Divide y repite


def simplify_ring(ring, tol):
    """Simplifica un anillo cerrado: lo parte en el punto más lejano del inicio (si no, la recta inicio-fin no existe)."""
    if len(ring) < 5:  # Anillos mínimos: se dejan
        return ring  # Sin cambios
    x0, y0 = ring[0]  # Punto de inicio (igual al final)
    far = max(range(len(ring)), key=lambda i: (ring[i][0] - x0) ** 2 + (ring[i][1] - y0) ** 2)  # Punto más alejado del inicio
    return simplify(ring[: far + 1], tol)[:-1] + simplify(ring[far:], tol)  # Simplifica las dos mitades y las une


def inside(pt, ring):
    """Si un punto está dentro de un anillo (regla del rayo)."""
    x, y = pt  # Punto
    hit = False  # Cantidad de cruces impar = dentro
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):  # Cada lado
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:  # El rayo horizontal cruza el lado
            hit = not hit  # Cambia de lado
    return hit  # Resultado


def label_point(own_rings, water_rings):
    """Punto de etiqueta en tierra y dentro del territorio, lo más lejos posible de sus bordes."""
    outer = max(own_rings, key=len)  # Anillo principal
    xs, ys = [p[0] for p in outer], [p[1] for p in outer]  # Coordenadas
    best, best_d = None, -1.0  # Mejor punto hasta ahora
    steps = 40  # Rejilla de 40 x 40 puntos candidatos
    for i in range(1, steps):  # Columnas
        for j in range(1, steps):  # Filas
            c = (min(xs) + (max(xs) - min(xs)) * i / steps, min(ys) + (max(ys) - min(ys)) * j / steps)  # Candidato
            if sum(inside(c, r) for r in own_rings) % 2 == 0:  # Fuera del territorio (o en un hueco)
                continue  # Descarta
            if any(inside(c, w) for w in water_rings):  # Dentro de un lago
                continue  # Descarta
            d = min((c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 for r in own_rings for p in r)  # Distancia al borde más cercano
            if d > best_d:  # Más centrado que el anterior
                best, best_d = c, d  # Lo guarda
    return best or ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)  # El mejor punto (o el centro del recuadro)


def main():
    admin1 = json.load(open(sys.argv[1], encoding="utf-8"))  # Límites de primer nivel del mundo
    lakes_src = json.load(open(sys.argv[2], encoding="utf-8"))  # Lagos del mundo
    feats = [f for f in admin1["features"] if f["properties"].get("iso_3166_2") in ISO]  # Solo Nicaragua
    missing = set(ISO) - {f["properties"]["iso_3166_2"] for f in feats}  # Territorios que no aparecieron
    if missing:  # Falta alguno
        sys.exit(f"Faltan territorios en Natural Earth: {sorted(missing)}")  # Error claro
    lakes = [f for f in lakes_src["features"] if f["properties"].get("name") in LAKES]  # Cocibolca y Xolotlán

    pts = [p for f in feats for r in rings(f["geometry"]) for p in r]  # Todos los puntos del país
    min_lon, max_lon = min(p[0] for p in pts), max(p[0] for p in pts)  # Oeste y este
    min_lat, max_lat = min(p[1] for p in pts), max(p[1] for p in pts)  # Sur y norte
    kx = math.cos(math.radians((min_lat + max_lat) / 2))  # Corrección de la longitud a esta latitud
    scale = WIDTH / ((max_lon - min_lon) * kx)  # Unidades SVG por grado
    height = round((max_lat - min_lat) * scale, 1)  # Alto del dibujo

    def xy(p):
        """Proyecta longitud y latitud al plano del dibujo."""
        return (round((p[0] - min_lon) * kx * scale, 1), round((max_lat - p[1]) * scale, 1))  # x hacia el este, y hacia el sur

    def path(geom):
        """Camino SVG simplificado de una geometría."""
        parts = []  # Trozos del camino
        for ring in rings(geom):  # Cada anillo
            simple = simplify_ring(ring, TOLERANCE)  # Simplifica
            if len(simple) < 4:  # Islas diminutas: se omiten
                continue  # Siguiente anillo
            proj = [xy(p) for p in simple]  # Proyecta
            parts.append("M" + "L".join(f"{x} {y}" for x, y in proj) + "Z")  # Camino cerrado
        return "".join(parts)  # Camino completo

    water = [r for f in lakes for r in rings(f["geometry"])]  # Anillos de los lagos (en grados)

    def label(geom):
        """Punto para la etiqueta: en tierra, dentro del territorio y lejos de sus bordes."""
        return xy(label_point(rings(geom), water))  # Punto proyectado

    out = {
        "source": "Natural Earth 1:10m Admin 1 y Lakes (dominio público, naturalearthdata.com)",  # Fuente citada
        "note": "Límites aproximados para ilustración; no son límites oficiales. Los oficiales los publica INETER.",  # Aviso honesto
        "viewBox": f"0 0 {WIDTH} {height}",  # Tamaño del dibujo
        "territories": sorted(
            [{"iso": f["properties"]["iso_3166_2"], "slug": ISO[f["properties"]["iso_3166_2"]], "d": path(f["geometry"]), "label": label(f["geometry"])} for f in feats],
            key=lambda t: t["slug"],
        ),  # Un camino por territorio
        "lakes": [{"id": LAKES[f["properties"]["name"]], "d": path(f["geometry"])} for f in lakes],  # Lagos
    }
    json.dump(out, open(sys.argv[3], "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))  # Guarda compacto
    print(f"{len(out['territories'])} territorios, {len(out['lakes'])} lagos, {sum(len(t['d']) for t in out['territories'])} caracteres")  # Resumen


if __name__ == "__main__":  # Solo al ejecutar el archivo directamente
    main()  # Ejecuta
