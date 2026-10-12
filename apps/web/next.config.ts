import path from 'node:path'; // Para armar rutas de carpetas
import type { NextConfig } from 'next'; // Tipo de la configuración de Next.js
import { securityHeaders } from './security-headers.mjs'; // Cabeceras de seguridad calculadas con el entorno

const config: NextConfig = {
  reactStrictMode: true, // Avisa en desarrollo de usos inseguros de React
  poweredByHeader: false, // No anuncia que usamos Next.js (menos pistas para atacantes)
  output: 'standalone', // Genera un servidor mínimo para la imagen de Docker
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'), // Raíz del monorepo, para incluir los paquetes internos en la imagen
  transpilePackages: ['@nica/ai-core'], // Paquete interno en TypeScript (sin build previo)
  images: { formats: ['image/avif', 'image/webp'] }, // Formatos de imagen livianos
  async headers() {
    return [
      {
        source: '/:path*', // Todas las páginas
        headers: securityHeaders(), // Cabeceras de seguridad
      },
      {
        source: '/:locale/(cuenta|ops|mensajes|denunciar)/:path*', // Paneles privados y formularios confidenciales
        headers: [
          { key: 'Cache-Control', value: 'private, no-store' }, // Cloudflare no debe guardarlos en caché
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' }, // Los buscadores no deben indexarlos
        ],
      },
    ];
  },
};

export default config; // Exporta la configuración
