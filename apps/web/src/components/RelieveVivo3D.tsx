'use client'; // Componente interactivo que solo corre en el navegador

import { t } from '@/i18n/t'; // Textos traducidos

import { useEffect, useRef, useState } from 'react'; // Referencias, efectos y estado de React
import { CurvasDeNivel } from './CurvasDeNivel'; // Versión ligera (SVG) para equipos sin 3D o con movimiento reducido

/** Cima del relieve: posición en la escena, tamaño de la base, altura y nombre que se muestra al tocarla. */
type Cima = { x: number; z: number; rx: number; rz: number; altura: number; capas: number; nombre: string };

// Relieve estilizado inspirado en los dos volcanes de Ometepe (forma de diseño, no un modelo topográfico)
const CIMAS: Cima[] = [
  { x: -1.3, z: -0.2, rx: 2.4, rz: 1.8, altura: 2.2, capas: 9, nombre: 'Volcán Concepción' }, // Cima mayor
  { x: 1.6, z: 0.6, rx: 1.6, rz: 1.25, altura: 1.35, capas: 7, nombre: 'Volcán Maderas' }, // Cima menor
];

const VERDE = 0x0d5448; // Verde territorial del sistema de diseño (base)
const ORO = 0xe4b063; // Oro artesanal (cima y curvas de nivel)
const TERRACOTA = 0xc65f3e; // Terracota volcánica (marca de la cima activa)

/** Decide si el equipo puede mostrar 3D sin perjudicar a la persona. */
function puedeUsar3D(): boolean {
  if (typeof window === 'undefined') return false; // En el servidor no hay 3D
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false; // Respeta "reducir movimiento"
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection; // Información de la conexión (si el navegador la da)
  if (conn?.saveData) return false; // Respeta el modo de ahorro de datos
  const canvas = document.createElement('canvas'); // Lienzo de prueba
  return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl')); // Solo si el navegador soporta WebGL
}

/**
 * "Relieve vivo": capas de curvas de nivel extruidas que forman un relieve en 3D.
 * Se gira arrastrando, flota suavemente y al tocar una cima muestra su nombre.
 * Si el equipo no puede, muestra la versión SVG con el mismo diseño.
 */
export function RelieveVivo3D({ className, locale }: { className?: string; locale: string }) {
  const contenedor = useRef<HTMLDivElement>(null); // Elemento donde se dibuja la escena
  const [modo, setModo] = useState<'cargando' | '3d' | 'ligero'>('cargando'); // Qué versión se muestra
  const [cimaElegida, setCimaElegida] = useState<string | null>(null); // Nombre de la cima tocada

  useEffect(() => {
    if (!puedeUsar3D()) {
      // Equipo sin 3D o con preferencias de bajo movimiento/datos
      setModo('ligero'); // Usamos la versión SVG
      return; // No cargamos Three.js
    }
    let cancelado = false; // Si el componente se desmontó mientras cargaba
    let limpiar: (() => void) | undefined; // Función que libera la memoria de la escena

    (async () => {
      const THREE = await import('three'); // Carga Three.js solo cuando hace falta (no pesa en la carga inicial)
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js'); // Controles para girar con el dedo o el mouse
      const el = contenedor.current; // Elemento contenedor
      if (cancelado || !el) return; // Si ya no hay dónde dibujar, salimos

      const escena = new THREE.Scene(); // Escena 3D vacía
      const camara = new THREE.PerspectiveCamera(38, el.clientWidth / el.clientHeight, 0.1, 100); // Cámara con perspectiva
      camara.position.set(0, 4.6, 8.2); // Cámara elevada mirando el relieve en diagonal
      const render = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Motor de dibujo con bordes suaves y fondo transparente
      render.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Nitidez sin exceder el doble (cuida la batería)
      render.setSize(el.clientWidth, el.clientHeight); // Tamaño igual al del contenedor
      el.appendChild(render.domElement); // Inserta el lienzo en la página

      escena.add(new THREE.HemisphereLight(0xf2efe5, 0x071c1b, 1.15)); // Luz ambiente: marfil arriba, selva abajo
      const sol = new THREE.DirectionalLight(0xffffff, 1.3); // Luz direccional que marca el relieve
      sol.position.set(4, 7, 3); // Posición del "sol"
      escena.add(sol); // Agrega la luz a la escena

      const relieve = new THREE.Group(); // Grupo que contiene todas las capas (para animarlas juntas)
      escena.add(relieve); // Agrega el grupo a la escena
      const marcadores: InstanceType<typeof THREE.Mesh>[] = []; // Esferas tocables en cada cima
      const desechables: Array<{ dispose: () => void }> = []; // Geometrías y materiales a liberar al salir

      CIMAS.forEach((cima, indiceCima) => {
        // Construye cada cima capa por capa
        const altoCapa = cima.altura / cima.capas; // Altura de cada capa
        for (let i = 0; i < cima.capas; i++) {
          // Recorre las capas desde la base hasta la cima
          const t = i / (cima.capas - 1); // 0 en la base, 1 en la cima
          const escala = 1 - t * 0.88; // Cada capa es más pequeña que la anterior
          const forma = new THREE.Shape(); // Contorno de la capa
          forma.absellipse(0, 0, cima.rx * escala, cima.rz * escala, 0, Math.PI * 2, false, 0); // Elipse de la curva de nivel
          const geo = new THREE.ExtrudeGeometry(forma, { depth: altoCapa * 0.92, bevelEnabled: false, curveSegments: 48 }); // Le da grosor a la capa
          geo.rotateX(-Math.PI / 2); // Acuesta la capa sobre el suelo
          const color = new THREE.Color(VERDE).lerp(new THREE.Color(ORO), Math.pow(t, 1.6)); // Del verde en la base al oro en la cima
          const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05 }); // Material mate
          const capa = new THREE.Mesh(geo, mat); // Capa sólida
          capa.position.set(cima.x - t * 0.08, i * altoCapa, cima.z - t * 0.12); // Ubica la capa (la cima se inclina un poco)
          relieve.add(capa); // Agrega la capa al relieve

          const borde = new THREE.LineLoop(
            new THREE.BufferGeometry().setFromPoints(
              new THREE.EllipseCurve(0, 0, cima.rx * escala, cima.rz * escala, 0, Math.PI * 2, false, 0).getPoints(72), // Puntos del borde
            ),
            new THREE.LineBasicMaterial({ color: ORO, transparent: true, opacity: 0.35 + t * 0.6 }), // Línea dorada más visible arriba
          );
          borde.rotation.x = -Math.PI / 2; // Acuesta la línea como la capa
          borde.position.set(capa.position.x, capa.position.y + altoCapa * 0.93, capa.position.z); // La coloca sobre el borde superior
          relieve.add(borde); // Agrega la curva de nivel
          desechables.push(geo, mat, borde.geometry, borde.material as { dispose: () => void }); // Registra todo para liberarlo
        }
        const marcaGeo = new THREE.SphereGeometry(0.11, 20, 20); // Esfera pequeña para la cima
        const marcaMat = new THREE.MeshStandardMaterial({ color: indiceCima === 0 ? TERRACOTA : ORO, emissive: indiceCima === 0 ? TERRACOTA : ORO, emissiveIntensity: 0.35 }); // Terracota en la cima principal
        const marca = new THREE.Mesh(marcaGeo, marcaMat); // Marcador tocable
        marca.position.set(cima.x - 0.08, cima.altura + 0.12, cima.z - 0.12); // Lo pone sobre la cima
        marca.userData.nombre = cima.nombre; // Guarda el nombre para mostrarlo al tocar
        relieve.add(marca); // Agrega el marcador
        marcadores.push(marca); // Lo registra para detectar toques
        desechables.push(marcaGeo, marcaMat); // Registra para liberar
      });

      const controles = new OrbitControls(camara, render.domElement); // Permite girar con arrastre
      controles.enableDamping = true; // Movimiento con inercia suave
      controles.enableZoom = false; // Sin zoom: la rueda del mouse sigue desplazando la página
      controles.enablePan = false; // Sin desplazamiento lateral
      controles.minPolarAngle = Math.PI * 0.18; // No deja mirar desde demasiado arriba
      controles.maxPolarAngle = Math.PI * 0.42; // Ni desde debajo del suelo
      controles.autoRotate = true; // Gira despacio solo cuando nadie lo toca
      controles.autoRotateSpeed = 0.6; // Velocidad del giro automático
      controles.target.set(0, 0.8, 0); // Punto al que mira la cámara

      const rayo = new THREE.Raycaster(); // Detecta qué objeto está bajo el dedo o el cursor
      const puntero = new THREE.Vector2(); // Posición del toque en coordenadas de la escena
      const alTocar = (ev: PointerEvent) => {
        // Se ejecuta al tocar o hacer clic
        const caja = render.domElement.getBoundingClientRect(); // Posición del lienzo en la pantalla
        puntero.set(((ev.clientX - caja.left) / caja.width) * 2 - 1, -((ev.clientY - caja.top) / caja.height) * 2 + 1); // Convierte el toque a coordenadas de -1 a 1
        rayo.setFromCamera(puntero, camara); // Lanza un rayo desde la cámara hacia el toque
        const golpe = rayo.intersectObjects(marcadores)[0]; // Primer marcador alcanzado
        setCimaElegida(golpe ? String(golpe.object.userData.nombre) : null); // Muestra su nombre o lo oculta
      };
      render.domElement.addEventListener('pointerup', alTocar); // Escucha los toques

      let visible = true; // Si el relieve está en pantalla
      const observador = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); // Avisa cuando sale o entra de la pantalla
      observador.observe(el); // Observa el contenedor

      const ajustar = () => {
        // Ajusta el tamaño cuando cambia el contenedor
        camara.aspect = el.clientWidth / Math.max(el.clientHeight, 1); // Nueva proporción de la cámara
        camara.updateProjectionMatrix(); // Aplica la proporción
        render.setSize(el.clientWidth, el.clientHeight); // Nuevo tamaño del lienzo
      };
      const redimension = new ResizeObserver(ajustar); // Observa cambios de tamaño
      redimension.observe(el); // Empieza a observar

      const reloj = new THREE.Clock(); // Mide el tiempo para animar
      let cuadro = 0; // Identificador del cuadro de animación
      const animar = () => {
        // Bucle de dibujo
        cuadro = requestAnimationFrame(animar); // Pide el siguiente cuadro
        if (!visible || document.hidden) return; // Si no se ve, no dibuja (ahorra batería)
        const t = reloj.getElapsedTime(); // Segundos desde el inicio
        relieve.position.y = Math.sin(t * 0.8) * 0.06; // Flotación suave hacia arriba y abajo
        controles.update(); // Aplica la inercia y el giro automático
        render.render(escena, camara); // Dibuja el cuadro
      };
      animar(); // Arranca la animación
      setModo('3d'); // Indica que el 3D está activo

      limpiar = () => {
        // Libera todo al salir de la página
        cancelAnimationFrame(cuadro); // Detiene la animación
        observador.disconnect(); // Deja de observar la visibilidad
        redimension.disconnect(); // Deja de observar el tamaño
        render.domElement.removeEventListener('pointerup', alTocar); // Deja de escuchar toques
        controles.dispose(); // Libera los controles
        desechables.forEach((d) => d.dispose()); // Libera geometrías y materiales
        render.dispose(); // Libera el motor de dibujo
        render.domElement.remove(); // Quita el lienzo de la página
      };
    })().catch(() => {
      if (!cancelado) setModo('ligero'); // Si algo falla al cargar, mostramos la versión SVG
    });

    return () => {
      cancelado = true; // Marca que el componente se desmontó
      limpiar?.(); // Libera la escena si llegó a crearse
    };
  }, []); // Se configura una sola vez

  if (modo === 'ligero') {
    // Versión ligera con el mismo diseño
    return <CurvasDeNivel label={t(locale, 'relief.aria_static')} className={className} />; // Misma figura sin 3D
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      <div
        ref={contenedor} // Aquí se inserta el lienzo 3D
        role="img" // Para lectores de pantalla es una imagen
        aria-label={t(locale, 'relief.aria')} // Descripción accesible
        className="aspect-[4/3] w-full cursor-grab touch-pan-y active:cursor-grabbing" // Proporción fija; el desplazamiento vertical del dedo sigue moviendo la página
      />
      {modo === 'cargando' && <p className="absolute inset-0 m-0 grid place-items-center text-sm text-ink-muted">{t(locale, 'relief.loading')}</p>} {/* Aviso mientras carga */}
      <p aria-live="polite" className="absolute left-[6%] top-[4%] m-0 font-display text-[22px] text-ink">
        {cimaElegida ?? ''} {/* Nombre de la cima tocada */}
      </p>
    </div>
  );
}
