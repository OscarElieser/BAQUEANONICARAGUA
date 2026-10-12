import 'reflect-metadata'; // Necesario para los decoradores de NestJS
import { NestFactory } from '@nestjs/core'; // Crea la aplicación
import type { NestExpressApplication } from '@nestjs/platform-express'; // Tipo de la app sobre Express
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; // Documentación de la API
import helmet from 'helmet'; // Cabeceras de seguridad
import { AppModule } from './app.module'; // Módulo principal
import { ProblemDetailsFilter } from './common/problem-details.filter'; // Errores con formato estándar

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false }); // Crea la app; el lector de cuerpos se configura abajo con límite
  app.useBodyParser('json', { limit: '100kb' }); // Rechaza cuerpos JSON enormes (evita abusos de memoria)
  app.useBodyParser('urlencoded', { limit: '100kb', extended: false }); // Mismo límite para formularios
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 0)); // Saltos de proxy confiables (Cloudflare + Hostinger) para conocer la IP real del límite de peticiones
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } } })); // La API solo devuelve JSON: no carga nada ni se enmarca
  app.setGlobalPrefix('v1', { exclude: ['health'] }); // Todas las rutas bajo /v1 salvo la de salud
  app.useGlobalFilters(new ProblemDetailsFilter()); // Formato uniforme de errores
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean), // Solo los orígenes configurados
    credentials: false, // No se usan cookies: la sesión viaja en la cabecera Authorization
    maxAge: 600, // El navegador recuerda la consulta previa 10 minutos
  });

  if (process.env.API_DOCS === 'true') {
    // La documentación interactiva solo se publica si se activa a propósito (no en producción)
    const doc = new DocumentBuilder()
      .setTitle('Ecosistema Turístico de Nicaragua — API') // Título
      .setVersion('0.1.0') // Versión
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'Firebase ID token' }) // Autenticación con token de Firebase
      .build(); // Arma la documentación
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, doc)); // La publica en /docs
  }

  app.enableShutdownHooks(); // Cierra limpio cuando Docker detiene el contenedor
  await app.listen(Number(process.env.API_PORT ?? 4000), '0.0.0.0'); // Escucha en todas las interfaces del contenedor
}
bootstrap(); // Arranca la API
