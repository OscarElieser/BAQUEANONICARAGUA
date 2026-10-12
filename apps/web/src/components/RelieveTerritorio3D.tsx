'use client'; // Solo corre en el navegador (WebGL)

import { useEffect, useRef, useState } from 'react'; // Referencias, efectos y estado
import { PortadaTerritorio } from './PortadaTerritorio'; // Versión ligera (SVG)
import { CURVAS, PALETA_3D, anillosDe, cajaDe, lagos, territorio } from '@/lib/portadas'; // Forma y colores
import { t } from '@/i18n/t'; // Textos traducidos

/** Si el equipo puede mostrar 3D sin perjudicar a la persona (igual que el relieve de la portada). */
function puedeUsar3D(): boolean {
  if (typeof window === 'undefined') return false; // En el servidor no hay 3D
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false; // Respeta "reducir movimiento"
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection; // Datos de la conexión
  if (conn?.saveData) return false; // Respeta el ahorro de datos
  const c = document.createElement('canvas'); // Lienzo de prueba
  return Boolean(c.getContext('webgl2') ?? c.getContext('webgl')); // Solo con WebGL
}

/** Si un punto está dentro de una forma de varios anillos (regla par-impar: los huecos quedan fuera). */
function dentro(x: number, y: number, anillos: Array<Array<[number, number]>>): boolean {
  let adentro = false; // Empieza afuera
  for (const r of anillos) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i]!, [xj, yj] = r[j]!; // Lado del anillo
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) adentro = !adentro; // El rayo cruza este lado
    }
  }
  return adentro; // Resultado
}

/**
 * Relieve 3D de un territorio: su silueta real tejida en columnas que suben en escalones hacia la cima,
 * con los colores de su zona. Las alturas son ilustrativas (lo dice el texto al pie).
 */
export function RelieveTerritorio3D({ slug, name, locale, className }: { slug: string; name: string; locale: string; className?: string }) {
  const contenedor = useRef<HTMLDivElement>(null); // Donde se dibuja
  const [modo, setModo] = useState<'cargando' | '3d' | 'ligero'>('cargando'); // Versión mostrada

  useEffect(() => {
    const ter = territorio(slug); // Forma del territorio
    if (!ter || !puedeUsar3D()) {
      setModo('ligero'); // Sin 3D: portada SVG
      return; // No carga Three.js
    }
    let cancelado = false; // Si se desmontó mientras cargaba
    let limpiar: (() => void) | undefined; // Libera la escena

    (async () => {
      const THREE = await import('three'); // Three.js solo cuando hace falta
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js'); // Girar con el dedo o el ratón
      const el = contenedor.current; // Contenedor
      if (cancelado || !el) return; // Ya no hay dónde dibujar

      const escena = new THREE.Scene(); // Escena vacía
      const camara = new THREE.PerspectiveCamera(34, el.clientWidth / el.clientHeight, 0.1, 100); // Cámara
      camara.position.set(0, 6.2, 7.4); // Elevada, en diagonal
      const render = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Bordes suaves, fondo transparente
      render.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Nitidez sin gastar de más
      render.setSize(el.clientWidth, el.clientHeight); // Tamaño del contenedor
      el.appendChild(render.domElement); // Inserta el lienzo
      escena.add(new THREE.HemisphereLight(0xf2efe5, 0x071c1b, 1.1)); // Luz ambiente: marfil arriba, selva abajo
      const sol = new THREE.DirectionalLight(0xffffff, 1.4); // Sol que marca las terrazas
      sol.position.set(-4, 8, 5); // Desde el noroeste
      escena.add(sol); // Agrega la luz

      const caja = cajaDe(ter.d); // Tamaño de la silueta
      const [lx, ly] = ter.label as [number, number]; // Punto de la cima
      const color = PALETA_3D[ter.zone]; // Colores de su zona
      const anillos = anillosDe(ter.d); // Contornos del territorio
      const cercanos = lagos.filter((l) => {
        const c = cajaDe(l.d); // Caja del lago
        return c.x < caja.x + caja.w && c.x + c.w > caja.x && c.y < caja.y + caja.h && c.y + c.h > caja.y; // Se cruza con el territorio
      }).map((l) => anillosDe(l.d)); // Lagos que tocan al territorio
      const N = 72; // Columnas en el lado mayor: el relieve se arma como un tejido de columnas
      const celda = Math.max(caja.w, caja.h) / N; // Tamaño de cada columna en unidades del mapa
      const k = 5.2 / Math.max(caja.w, caja.h); // Escala: el lado mayor mide 5,2 unidades (cabe al girar)
      const alto = 0.2; // Altura de cada escalón
      const piezas: Array<{ x: number; z: number; h: number; c: InstanceType<typeof THREE.Color> }> = []; // Columnas a dibujar
      const tonos = CURVAS.map((_, i) => {
        const v = i / (CURVAS.length - 1); // 0 en la orilla, 1 en la cima
        return v < 0.5 ? new THREE.Color(color.base).lerp(new THREE.Color(color.curva), v * 2) : new THREE.Color(color.curva).lerp(new THREE.Color(color.cima), (v - 0.5) * 2); // Del fondo de la zona a su cima
      }); // Color de cada escalón
      const agua = new THREE.Color(0x22306b); // Añil (band-anil)
      for (let gx = caja.x + celda / 2; gx < caja.x + caja.w; gx += celda) {
        for (let gy = caja.y + celda / 2; gy < caja.y + caja.h; gy += celda) {
          // Cada punto de la cuadrícula sobre el territorio
          const x = (gx - lx) * k, z = (gy - ly) * k; // Posición en la escena (centrada en la cima)
          if (!dentro(gx, gy, anillos)) continue; // Fuera del territorio: nada
          if (cercanos.some((r) => dentro(gx, gy, r))) {
            piezas.push({ x, z, h: 0.06, c: agua }); // Parte del lago dentro del territorio: baldosa baja en añil
            continue; // El lago no lleva relieve
          }
          let nivel = 0; // Cuántas curvas contienen este punto
          for (const s of CURVAS) {
            if (dentro(lx + (gx - lx) / s, ly + (gy - ly) / s, anillos)) nivel++; // Dentro de la curva encogida: un escalón más
          }
          piezas.push({ x, z, h: Math.max(nivel, 1) * alto, c: tonos[Math.max(nivel, 1) - 1]! }); // Columna con su altura y color
        }
      }
      const geo = new THREE.BoxGeometry(celda * k * 0.9, 1, celda * k * 0.9); // Una columna (se estira con la matriz)
      geo.translate(0, 0.5, 0); // Crece desde el suelo hacia arriba
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.04 }); // Material mate
      const columnas = new THREE.InstancedMesh(geo, mat, piezas.length); // Todas las columnas en un solo dibujo (rápido)
      const m = new THREE.Matrix4(); // Matriz de cada columna
      piezas.forEach((p, i) => {
        columnas.setColorAt(i, p.c); // Color de la columna
      });
      escena.add(columnas); // Agrega el relieve
      const desechables: Array<{ dispose: () => void }> = [geo, mat, columnas]; // Para liberar memoria
      const crecer = (f: number) => {
        piezas.forEach((p, i) => {
          m.makeScale(1, Math.max(p.h * f, 0.001), 1).setPosition(p.x, 0, p.z); // Altura según el avance
          columnas.setMatrixAt(i, m); // La aplica
        });
        columnas.instanceMatrix.needsUpdate = true; // Avisa que cambiaron
      }; // Ajusta la altura de todas las columnas
      crecer(0); // Empieza plano
      const inicio = performance.now(); // Momento en que empieza a crecer

      const controles = new OrbitControls(camara, render.domElement); // Girar arrastrando
      controles.enableDamping = true; // Con inercia
      controles.enableZoom = false; // La rueda sigue desplazando la página
      controles.enablePan = false; // Sin mover de lado
      controles.minPolarAngle = Math.PI * 0.12; // No tan desde arriba
      controles.maxPolarAngle = Math.PI * 0.4; // Ni desde abajo
      controles.autoRotate = true; // Gira despacio solo
      controles.autoRotateSpeed = 0.45; // Velocidad
      controles.target.set(0, 0.5, 0); // Mira al centro del relieve

      let visible = true; // Si está en pantalla
      const observador = new IntersectionObserver(([e]) => { visible = Boolean(e?.isIntersecting); }); // Avisa al entrar o salir de la pantalla
      observador.observe(el); // Observa
      const redimension = new ResizeObserver(() => {
        camara.aspect = el.clientWidth / Math.max(el.clientHeight, 1); // Nueva proporción
        camara.updateProjectionMatrix(); // La aplica
        render.setSize(el.clientWidth, el.clientHeight); // Nuevo tamaño
      }); // Se adapta al tamaño
      redimension.observe(el); // Observa el tamaño

      let cuadro = 0; // Cuadro de animación
      const animar = () => {
        cuadro = requestAnimationFrame(animar); // Siguiente cuadro
        if (!visible || document.hidden) return; // Fuera de pantalla no dibuja
        const f = Math.min((performance.now() - inicio) / 1400, 1); // Avance del crecimiento (1,4 s)
        if (f < 1 || columnas.userData.f !== 1) {
          crecer(1 - Math.pow(1 - f, 3)); // Sube con frenado suave, una sola vez
          columnas.userData.f = f; // Recuerda el avance
        }
        controles.update(); // Inercia y giro
        render.render(escena, camara); // Dibuja
      }; // Bucle de dibujo
      animar(); // Arranca
      setModo('3d'); // 3D activo

      limpiar = () => {
        cancelAnimationFrame(cuadro); // Detiene la animación
        observador.disconnect(); // Deja de observar la visibilidad
        redimension.disconnect(); // Deja de observar el tamaño
        controles.dispose(); // Libera los controles
        desechables.forEach((d) => d.dispose()); // Libera geometrías y materiales
        render.dispose(); // Libera el motor
        render.domElement.remove(); // Quita el lienzo
      }; // Limpieza al salir
    })().catch(() => {
      if (!cancelado) setModo('ligero'); // Si falla, versión SVG
    });

    return () => {
      cancelado = true; // Ya no está en pantalla
      limpiar?.(); // Libera la escena
    };
  }, [slug]); // Se rehace si cambia el territorio

  if (modo === 'ligero') {
    return (
      <div role="img" aria-label={t(locale, 'relief.territory_static', { name })} className={className}>
        <PortadaTerritorio slug={slug} uid="heroe" className="block aspect-[4/3] w-full" /> {/* Misma forma sin 3D */}
      </div>
    ); // Versión ligera
  }
  return (
    <div className={`relative ${className ?? ''}`}>
      <div
        ref={contenedor} // Aquí va el lienzo
        role="img" // Imagen para lectores de pantalla
        aria-label={t(locale, 'relief.territory_aria', { name })} // Descripción
        className="aspect-[4/3] w-full cursor-grab touch-pan-y active:cursor-grabbing" // El dedo en vertical sigue desplazando la página
      />
      {modo === 'cargando' && <p className="absolute inset-0 m-0 grid place-items-center text-sm text-ink-muted">{t(locale, 'relief.loading')}</p>} {/* Mientras carga */}
    </div>
  );
}
