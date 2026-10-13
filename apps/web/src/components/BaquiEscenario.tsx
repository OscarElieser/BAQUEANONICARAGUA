'use client';
// BAQÜI en persona. Al abrir la página se ve una vez su presentación: entra, saluda, señala la conversación y abre las alas.
// Cada vez que responde, vuelve a señalar la conversación (solo si se le ve en pantalla: no gasta datos ni batería). Sin sonido.
// Con "reducir movimiento" o "ahorro de datos" no arranca solo: queda su imagen y un botón para verlo.
// El video dura 10 segundos, por eso siempre hay un botón para pausarlo (WCAG 2.2.2).
import { useCallback, useEffect, useRef, useState } from 'react'; // Estado, efectos y referencia al video
import { t } from '@/i18n/t'; // Textos traducidos

type Estado = 'quieto' | 'reproduciendo' | 'pausado' | 'terminado'; // Momentos del video
const SENALA_DESDE = 6; // Segundo en que BAQÜI empieza a señalar (sigue hasta abrir las alas y quedar en reposo)

/** Si el navegador pide menos movimiento o menos datos (entonces no arranca solo). */
function sinArranqueSolo(): boolean {
  const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false; // Movimiento reducido
  const ahorro = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true; // Ahorro de datos
  return reducido || ahorro; // Cualquiera de los dos
}

export function BaquiEscenario({ locale, respuestas }: { locale: string; respuestas: number }) {
  const video = useRef<HTMLVideoElement>(null); // El video
  const [estado, setEstado] = useState<Estado>('quieto'); // Estado visible
  const vioPresentacion = useRef(false); // Si ya cargó y se vio la presentación (solo entonces reacciona a las respuestas)
  const aLaVista = useRef(false); // Si BAQÜI se ve en pantalla ahora mismo

  const reproducir = useCallback((desde?: number) => {
    const v = video.current; // Video
    if (!v) return; // Aún no existe
    if (desde !== undefined) v.currentTime = desde; // Salta al momento pedido
    else if (v.ended) v.currentTime = 0; // Terminó: vuelve a empezar
    v.play().then(() => {
      vioPresentacion.current = true; // Ya se cargó y se vio
      setEstado('reproduciendo'); // Muestra el botón de pausa
    }).catch(() => setEstado('quieto')); // El navegador lo bloqueó: queda la imagen con el botón
  }, []); // Sin dependencias

  useEffect(() => {
    const v = video.current; // Video
    if (!v) return; // Aún no existe
    let presentado = false; // Si ya arrancó la presentación
    const obs = new IntersectionObserver(([e]) => { // Avisa cada vez que BAQÜI entra o sale de la vista
      aLaVista.current = (e?.intersectionRatio ?? 0) >= 0.4; // Recuerda si se ve casi la mitad o más (el aviso llega al cruzar ese punto, hacia arriba o hacia abajo)
      if (aLaVista.current && !presentado && !sinArranqueSolo()) { // Se ve, aún no se presentó y se permite movimiento
        presentado = true; // Solo la primera vez que se ve
        reproducir(); // Presentación
      }
    }, { threshold: 0.4 }); // Cuando se ve casi la mitad
    obs.observe(v); // Empieza a observar
    return () => obs.disconnect(); // Deja de observar al salir
  }, [reproducir]); // Una vez

  useEffect(() => {
    if (respuestas === 0 || !vioPresentacion.current || !aLaVista.current || sinArranqueSolo()) return; // Solo después de la presentación, si se le ve y si se permite movimiento
    reproducir(SENALA_DESDE); // BAQÜI señala la respuesta
  }, [respuestas, reproducir]); // Cada respuesta nueva

  const boton = estado === 'reproduciendo' ? 'baqui.pause' : estado === 'terminado' ? 'baqui.replay' : 'baqui.play'; // Texto del botón según el momento
  return (
    <figure className="baqui-escenario">
      <video
        ref={video} // Para controlarlo
        className="baqui-video" // Ocupa el marco
        poster="/baqui/quieto.webp" // Imagen en reposo (el último cuadro del video, así no salta)
        muted // Sin sonido
        playsInline // En el teléfono no abre pantalla completa
        preload="none" // No descarga nada hasta que se reproduce
        aria-hidden="true" // Lo describe el pie de figura
        onPause={() => setEstado((e) => (video.current?.ended ? e : 'pausado'))} // Pausado por la persona
        onEnded={() => setEstado('terminado')} // Terminó: queda en reposo
      >
        <source src="/baqui/presentacion.webm" type="video/webm" /> {/* VP9: navegadores sin H.264 */}
        <source src="/baqui/presentacion.mp4" type="video/mp4" /> {/* H.264: el resto (Safari incluido) */}
      </video>
      <figcaption className="baqui-pie">
        <span className="baqui-nombre">{t(locale, 'baqui.meet')}</span> {/* "Conoce a BAQÜI" */}
        <span className="visually-hidden">{t(locale, 'baqui.mascot')}</span> {/* Descripción para lectores de pantalla */}
        <button type="button" className="baqui-control" onClick={() => (estado === 'reproduciendo' ? video.current?.pause() : reproducir())}>
          {t(locale, boton)} {/* Ver, pausar o ver de nuevo */}
        </button>
      </figcaption>
    </figure>
  );
}
