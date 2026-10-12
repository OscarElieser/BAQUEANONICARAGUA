import type { MetadataRoute } from 'next'; // Tipo del archivo robots.txt

/** robots.txt: los buscadores pueden leer lo público, nunca los paneles privados. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*', // Todos los buscadores
        allow: '/', // Lo público se puede indexar
        disallow: ['/*/cuenta', '/*/ops', '/*/mensajes', '/*/mi-aventura', '/api/'], // Zonas privadas
      },
    ],
  };
}
