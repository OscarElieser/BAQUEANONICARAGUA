import type { MetadataRoute } from 'next'; // Tipo del archivo robots.txt
import { SITE_URL } from '@/lib/seo'; // Dirección pública del sitio

/** robots.txt: los buscadores pueden leer lo público, nunca los paneles privados; y saben dónde está el sitemap. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*', // Todos los buscadores
        allow: '/', // Lo público se puede indexar
        disallow: ['/*/cuenta', '/*/ops', '/*/mensajes', '/*/denunciar', '/api/'], // Zonas privadas
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`, // Lista de todas las páginas públicas en los 10 idiomas
    host: SITE_URL, // Dominio principal
  };
}
