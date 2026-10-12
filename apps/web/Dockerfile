# Imagen de la web (Next.js). Se construye desde la raíz del repositorio:
#   docker build -f apps/web/Dockerfile -t nica-web .
# Las variables NEXT_PUBLIC_* se fijan al construir porque quedan dentro del código del navegador
# y en la política de seguridad. Son públicas: nunca pasar aquí claves secretas.

# --- Etapa 1: instalar y compilar ---
FROM node:26-alpine AS build
# Activa pnpm en la versión que fija package.json
RUN corepack enable
# Carpeta de trabajo dentro de la imagen
WORKDIR /repo
# Copia el monorepo (lo excluido está en .dockerignore)
COPY . .
# Instala solo lo que necesita la web y sus paquetes internos
RUN pnpm install --no-frozen-lockfile --filter "@nica/web..."
# Dirección del proyecto de Supabase
ARG NEXT_PUBLIC_SUPABASE_URL=""
# Clave pública de Supabase
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=""
# Dirección de la API
ARG NEXT_PUBLIC_API_URL=""
# Estilo del mapa
ARG NEXT_PUBLIC_MAP_STYLE_URL=""
# Configuración pública de Firebase
ARG NEXT_PUBLIC_FIREBASE_API_KEY=""
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=""
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID=""
ARG NEXT_PUBLIC_FIREBASE_APP_ID=""
# Proveedores extra permitidos en la política de seguridad (por ejemplo, teselas del mapa)
ARG CSP_EXTRA_CONNECT=""
# Next.js no envía estadísticas de uso
ENV NEXT_TELEMETRY_DISABLED=1
# Compila la web en modo producción
RUN pnpm --filter @nica/web build

# --- Etapa 2: imagen final mínima ---
FROM node:26-alpine AS run
# Modo producción, puerto y escucha en todas las interfaces
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
# Carpeta de la aplicación
WORKDIR /app
# Usuario sin privilegios: si alguien rompe la web, no es dueño del contenedor
RUN addgroup -S nica && adduser -S nica -G nica
# Servidor mínimo generado por Next.js
COPY --from=build --chown=nica:nica /repo/apps/web/.next/standalone ./
# Archivos estáticos (JavaScript y CSS)
COPY --from=build --chown=nica:nica /repo/apps/web/.next/static ./apps/web/.next/static
# Archivos públicos (manifiesto, iconos)
COPY --from=build --chown=nica:nica /repo/apps/web/public ./apps/web/public
# A partir de aquí todo corre sin privilegios
USER nica
# Puerto de la web
EXPOSE 3000
# Docker comprueba cada 30 s que la web responde
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/es >/dev/null || exit 1
# Arranca el servidor
CMD ["node", "apps/web/server.js"]
