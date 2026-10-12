// Imagen para compartir el sitio: la silueta del país en curvas de nivel (el mismo icono) y el nombre.
import { ImageResponse } from 'next/og'; // Genera la imagen en el servidor
import { iconoSvg } from '@/lib/icono'; // Icono como SVG

export const size = { width: 1200, height: 630 }; // Tamaño recomendado
export const contentType = 'image/png'; // Formato
export const alt = 'Nicaragua: la silueta del país en curvas de nivel'; // Texto alternativo

export default async function Imagen() {
  const icono = Buffer.from(iconoSvg()); // Icono generado desde el mapa
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: 56, padding: '0 80px', background: '#0D5448', color: '#F2EFE5' }}>
        <img src={`data:image/svg+xml;base64,${icono.toString('base64')}`} width={420} height={420} alt="" /> {/* Silueta en curvas de nivel */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 92, lineHeight: 1 }}>Nicaragua</div> {/* Nombre */}
          <div style={{ fontSize: 34, marginTop: 20, color: '#E4B063' }}>17 territorios, curva por curva</div> {/* Lema (en español, idioma por defecto) */}
        </div>
      </div>
    ),
    size, // Tamaño
  );
}
