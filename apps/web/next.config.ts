import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Paquete interno en TypeScript (sin build previo)
  transpilePackages: ['@nica/ai-core'],
  images: { formats: ['image/avif', 'image/webp'] },
  async headers() {
    return [
      {
        // Cloudflare no debe cachear paneles privados (ADR / sección 25)
        source: '/:locale/(cuenta|ops|mensajes|mi-aventura)/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
    ];
  },
};

export default config;
