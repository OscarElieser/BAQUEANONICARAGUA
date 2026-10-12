#!/usr/bin/env python3
# Busca fotografías REALES de Nicaragua en Wikimedia Commons con licencia libre (CC0, dominio público,
# CC BY o CC BY-SA), guarda candidatas por territorio con su autor, licencia y página de origen,
# y descarga una vista de 1600 px de cada una para revisarlas antes de usarlas en la web y la app.
# Corre en GitHub Actions (allí hay acceso a internet); el resultado va a refs/datos/fotos.
import html  # Para quitar entidades HTML de los textos de Commons
import json  # Para leer las respuestas y escribir el resultado
import pathlib  # Rutas de archivos
import re  # Para limpiar etiquetas HTML y revisar licencias
import sys  # Argumentos de la línea de comandos
import time  # Pausas entre pedidos (cortesía con el servidor)
import urllib.parse  # Para armar las direcciones de búsqueda
import urllib.request  # Para pedir datos e imágenes

API = "https://commons.wikimedia.org/w/api.php"  # API pública de Wikimedia Commons
UA = "BaqueanoFotos/0.1 (https://github.com/OscarElieser/BAQUEANONICARAGUA)"  # Identificación pedida por Wikimedia

# Lugares reales de cada territorio que se buscan en Commons (de lo más representativo a lo más general)
BUSQUEDAS = {
    "portada": ["Ometepe Concepcion volcano", "Laguna de Apoyo Nicaragua", "Somoto Canyon", "Little Corn Island beach", "Granada Nicaragua cathedral"],
    "boaco": ["Boaco Nicaragua ciudad", "Boaco Nicaragua", "Laguna Las Canoas"],
    "carazo": ["La Boquita Nicaragua", "Diriamba Nicaragua", "Jinotepe Nicaragua"],
    "chinandega": ["San Cristobal volcano Nicaragua", "Cosiguina Nicaragua", "El Viejo Nicaragua", "Chinandega Nicaragua"],
    "chontales": ["Juigalpa Nicaragua", "Cuapa Nicaragua", "Chontales Nicaragua"],
    "costa-caribe-norte": ["Cayos Miskitos", "Bilwi Nicaragua", "Puerto Cabezas Nicaragua"],
    "costa-caribe-sur": ["Little Corn Island beach", "Pearl Lagoon Nicaragua", "Big Corn Island beach"],
    "esteli": ["Tisey Esteli", "Miraflor Nicaragua", "Esteli Nicaragua"],
    "granada": ["Granada Nicaragua cathedral", "Calzada Granada Nicaragua", "Isletas Granada Nicaragua", "Mombacho"],
    "jinotega": ["Lago de Apanas", "Pena de la Cruz Jinotega", "Jinotega Nicaragua"],
    "leon": ["Leon Cathedral Nicaragua", "Cerro Negro Nicaragua", "Leon Viejo ruins"],
    "madriz": ["Somoto Canyon", "Somoto Nicaragua"],
    "managua": ["Laguna de Tiscapa", "Malecon Managua", "Catedral Managua", "Momotombo"],
    "masaya": ["Masaya volcano crater", "Laguna de Apoyo Nicaragua", "Masaya Nicaragua market"],
    "matagalpa": ["Matagalpa Nicaragua", "Selva Negra Matagalpa", "Matagalpa mountains"],
    "nueva-segovia": ["Ocotal Nicaragua", "Dipilto Nicaragua", "Jalapa Nueva Segovia"],
    "rio-san-juan": ["Fortaleza El Castillo Nicaragua", "El Castillo Rio San Juan Nicaragua", "San Carlos Rio San Juan"],
    "rivas": ["Ometepe Concepcion", "San Juan del Sur bay", "Ometepe Maderas"],
}

LICENCIA_OK = re.compile(r"^(CC0|Public domain|CC BY(-SA)? (2\.0|2\.5|3\.0|4\.0)( .*)?)$", re.I)  # Licencias libres aceptadas
NO_FOTO = re.compile(r"\b(map|mapa|flag|bandera|coat of arms|escudo|logo|diagram|seal|sello)\b", re.I)  # Mapas, banderas, escudos: no son fotos de lugar


def pedir(params):
    """Hace un pedido a la API de Commons y devuelve el JSON."""
    url = API + "?" + urllib.parse.urlencode({**params, "format": "json", "formatversion": "2"})  # Dirección completa
    req = urllib.request.Request(url, headers={"User-Agent": UA})  # Con identificación
    with urllib.request.urlopen(req, timeout=60) as r:  # Pide los datos
        return json.load(r)  # Convierte la respuesta


def limpio(texto):
    """Quita etiquetas HTML y espacios de sobra de un texto de Commons."""
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", texto or ""))).strip()  # Texto plano


def candidatas(consulta):
    """Fotos de Commons para una búsqueda, con sus datos de licencia."""
    datos = pedir({
        "action": "query",  # Consulta
        "generator": "search",  # Usa el buscador
        "gsrnamespace": "6",  # Solo archivos
        "gsrsearch": f"{consulta} filetype:bitmap",  # Solo imágenes de mapa de bits (fotos)
        "gsrlimit": "40",  # Hasta 40 resultados
        "prop": "imageinfo",  # Datos de cada imagen
        "iiprop": "url|size|mime|extmetadata",  # Dirección, tamaño, tipo y metadatos (autor, licencia…)
        "iiurlwidth": "1600",  # Vista de 1600 px de ancho
    })
    res = []  # Fotos que pasan los filtros
    for p in datos.get("query", {}).get("pages", []):  # Cada resultado
        info = (p.get("imageinfo") or [{}])[0]  # Datos de la imagen
        meta = info.get("extmetadata", {})  # Metadatos
        lic = limpio(meta.get("LicenseShortName", {}).get("value"))  # Licencia corta
        ancho, alto = info.get("width", 0), info.get("height", 0)  # Tamaño original
        titulo = p.get("title", "")  # Nombre del archivo
        if info.get("mime") not in ("image/jpeg", "image/png", "image/webp"): continue  # Solo fotos
        if not LICENCIA_OK.match(lic): continue  # Licencia no libre o desconocida
        if ancho < 1600 or not (1.25 <= ancho / max(alto, 1) <= 2.4): continue  # Grande y apaisada
        if NO_FOTO.search(titulo): continue  # Mapas, banderas, escudos
        cats = limpio(meta.get("Categories", {}).get("value"))  # Categorías de Commons
        if "nicaragua" not in (titulo + " " + cats + " " + limpio(meta.get("ImageDescription", {}).get("value"))).lower(): continue  # Solo fotos tomadas en Nicaragua
        puntos = (100 if re.search(r"Quality images|Featured pictures", cats) else 0) + (40 if "Valued images" in cats else 0) + min(ancho, 6000) / 200  # Calidad reconocida y tamaño
        res.append({
            "archivo": titulo,  # Nombre en Commons
            "pagina": info.get("descriptionurl"),  # Página de origen (para el crédito)
            "original": info.get("url"),  # Imagen original
            "vista": info.get("thumburl"),  # Vista de 1600 px
            "ancho": ancho, "alto": alto,  # Tamaño original
            "autor": limpio(meta.get("Artist", {}).get("value"))[:160],  # Autor
            "licencia": lic,  # Licencia
            "licencia_url": limpio(meta.get("LicenseUrl", {}).get("value")),  # Texto de la licencia
            "descripcion": limpio(meta.get("ImageDescription", {}).get("value"))[:300],  # Descripción del autor
            "fecha": limpio(meta.get("DateTimeOriginal", {}).get("value"))[:40],  # Fecha de la foto
            "calidad": "destacada" if puntos >= 100 else "normal",  # Si Commons la reconoce como de calidad
            "puntos": round(puntos, 1),  # Orden de preferencia
        })
    return res


def main():
    salida = pathlib.Path(sys.argv[1])  # Carpeta del resultado
    salida.mkdir(parents=True, exist_ok=True)  # La crea si no existe
    resumen = {}  # Candidatas por territorio
    for clave, consultas in BUSQUEDAS.items():  # Cada territorio (y la portada)
        vistas, elegidas = set(), []  # Para no repetir archivos
        for q in consultas:  # Cada búsqueda
            for c in candidatas(q):  # Cada foto encontrada
                if c["archivo"] not in vistas:  # Sin repetidos
                    vistas.add(c["archivo"]); elegidas.append(c)  # La guarda
            time.sleep(1)  # Pausa de cortesía
        elegidas.sort(key=lambda c: -c["puntos"])  # Las mejores primero
        elegidas = elegidas[:9]  # Hasta 9 candidatas
        carpeta = salida / clave  # Carpeta del territorio
        carpeta.mkdir(exist_ok=True)  # La crea
        for i, c in enumerate(elegidas):  # Descarga la vista de cada candidata
            destino = carpeta / f"{i}.jpg"  # Archivo local
            req = urllib.request.Request(c["vista"], headers={"User-Agent": UA})  # Con identificación
            with urllib.request.urlopen(req, timeout=120) as r:  # Descarga
                destino.write_bytes(r.read())  # Guarda
            c["local"] = f"{clave}/{i}.jpg"  # Dónde quedó
            time.sleep(0.5)  # Pausa de cortesía
        resumen[clave] = elegidas  # Guarda las candidatas
        print(clave, len(elegidas), "candidatas")  # Avance en el registro
    (salida / "candidatas.json").write_text(json.dumps(resumen, ensure_ascii=False, indent=1), encoding="utf-8")  # Resumen


if __name__ == "__main__":
    main()  # Punto de entrada
