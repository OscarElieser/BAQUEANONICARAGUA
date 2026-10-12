# Imagen de la API (NestJS). Se construye desde la raíz del repositorio:
#   docker build -f apps/api/Dockerfile -t nica-api .
# Los secretos (SUPABASE_SECRET_KEY, cuenta de servicio) se pasan al ejecutar, nunca al construir.

# --- Etapa 1: instalar y compilar ---
FROM node:26-alpine AS build
# Activa pnpm en la versión que fija package.json
RUN corepack enable
# Carpeta de trabajo
WORKDIR /repo
# Copia el monorepo (lo excluido está en .dockerignore)
COPY . .
# Instala solo lo que necesita la API
RUN pnpm install --no-frozen-lockfile --filter "@nica/api..."
# Compila TypeScript a JavaScript
RUN pnpm --filter @nica/api build
# Copia la API con solo sus dependencias de producción a /out
RUN pnpm --filter @nica/api deploy --prod /out && rm -rf /out/dist && cp -r apps/api/dist /out/dist

# --- Etapa 2: imagen final mínima ---
FROM node:26-alpine AS run
# Modo producción y puerto
ENV NODE_ENV=production API_PORT=4000
# Carpeta de la aplicación
WORKDIR /app
# Usuario sin privilegios
RUN addgroup -S nica && adduser -S nica -G nica
# API compilada con sus dependencias
COPY --from=build --chown=nica:nica /out ./
# A partir de aquí todo corre sin privilegios
USER nica
# Puerto de la API
EXPOSE 4000
# Docker comprueba cada 30 s que la API responde
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:4000/health >/dev/null || exit 1
# Arranca la API
CMD ["node", "dist/main.js"]
