// Imagen para compartir cada territorio (redes y mensajería): su portada ilustrada y su nombre.
import { ImageResponse } from 'next/og'; // Genera la imagen en el servidor
import { portadaSvg } from '@/lib/portadaSvg'; // Portada como SVG
import { territorio } from '@/lib/portadas'; // Nombre y zona

export const size = { width: 1200, height: 630 }; // Tamaño recomendado para vistas previas
export const contentType = 'image/png'; // Formato
export const alt = 'Portada ilustrada hecha con la forma real del territorio (Natural Earth, dominio público)'; // Texto alternativo

export default async function Imagen({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; // Territorio
  const ter = territorio(slug); // Datos del mapa
  const svg = portadaSvg(slug, 630 / 630); // Portada cuadrada
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#071C1B', color: '#F2EFE5' }}>
        {svg && <img src={`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`} width={630} height={630} alt="" />} {/* Portada */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '56px', flex: 1 }}>
          <div style={{ fontSize: 30, color: '#E4B063' }}>Nicaragua</div> {/* País */}
          <div style={{ fontSize: 76, lineHeight: 1.02, marginTop: 12 }}>{ter?.name ?? 'Nicaragua'}</div> {/* Nombre propio (no se traduce) */}
        </div>
      </div>
    ),
    size, // Tamaño
  );
}
