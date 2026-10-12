#!/usr/bin/env bash
# Despliega una versión en el servidor y vuelve a la anterior si la nueva no queda sana.
# Uso (lo ejecuta GitHub Actions por SSH): ./desplegar.sh <tag> <carpeta>
#   tag:     commit ya probado en CI (por ejemplo 94d8c75...)
#   carpeta: /srv/nica/produccion o /srv/nica/staging
set -euo pipefail # Corta ante cualquier error, variable vacía o fallo en una tubería

TAG="${1:?Falta el tag a desplegar}" # Versión pedida
DIR="${2:?Falta la carpeta del entorno}" # Entorno (producción o staging)
cd "$DIR" # Entra a la carpeta del entorno

PREV="$(cat .tag-actual 2>/dev/null || true)" # Versión que está corriendo ahora (si hay)
echo "Versión actual: ${PREV:-ninguna}. Nueva versión: $TAG" # Deja registro en el log de Actions

export TAG # La usa docker-compose.prod.yml
docker compose -f docker-compose.prod.yml pull web api # Descarga las imágenes nuevas
docker compose -f docker-compose.prod.yml up -d --remove-orphans # Arranca la nueva versión

for i in $(seq 1 30); do # Espera hasta 5 minutos a que ambos servicios estén sanos
  web="$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose -f docker-compose.prod.yml ps -q web)" 2>/dev/null || echo ninguna)" # Salud de la web (o "ninguna" si no arrancó)
  api="$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose -f docker-compose.prod.yml ps -q api)" 2>/dev/null || echo ninguna)" # Salud de la API (o "ninguna" si no arrancó)
  if [ "$web" = "healthy" ] && [ "$api" = "healthy" ]; then # Las dos responden
    echo "$TAG" > .tag-actual # Guarda la versión que quedó corriendo
    docker image prune -f >/dev/null # Libera espacio de imágenes viejas sin uso
    echo "Despliegue correcto ($i intentos)." # Resultado
    exit 0 # Termina bien
  fi
  sleep 10 # Espera antes de volver a preguntar
done

echo "La versión $TAG no quedó sana." >&2 # Avisa del fallo
if [ -n "$PREV" ]; then # Hay una versión anterior a la que volver
  TAG="$PREV" docker compose -f docker-compose.prod.yml up -d # Vuelve a la versión anterior
  echo "Se volvió a la versión anterior: $PREV" >&2 # Deja constancia
fi
exit 1 # Marca el despliegue como fallido
