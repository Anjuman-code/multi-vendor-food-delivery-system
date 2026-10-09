#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# OSRM Preprocessing & Setup Pipeline for Food Rush (Bangladesh Extract)
# ─────────────────────────────────────────────────────────────────────────────

DATA_DIR="$(pwd)/data/osrm"
PBF_FILE="bangladesh-latest.osm.pbf"
PBF_URL="https://download.geofabrik.de/asia/bangladesh-latest.osm.pbf"
OSRM_IMAGE="ghcr.io/project-osrm/osrm-backend:v5.27.1"

echo "=== Food Rush OSRM Data Setup ==="
echo "Target directory: ${DATA_DIR}"

mkdir -p "${DATA_DIR}"

if [ ! -f "${DATA_DIR}/${PBF_FILE}" ]; then
  echo "Downloading Bangladesh OSM extract from Geofabrik (~75 MB)..."
  curl -L -o "${DATA_DIR}/${PBF_FILE}" "${PBF_URL}"
else
  echo "Found existing ${PBF_FILE} in ${DATA_DIR}."
fi

echo "Step 1: Extracting road network (osrm-extract)..."
docker run --rm -t -v "${DATA_DIR}:/data" "${OSRM_IMAGE}" \
  osrm-extract -p /opt/car.lua "/data/${PBF_FILE}"

echo "Step 2: Partitioning road graph (osrm-partition)..."
docker run --rm -t -v "${DATA_DIR}:/data" "${OSRM_IMAGE}" \
  osrm-partition "/data/bangladesh-latest.osrm"

echo "Step 3: Customizing routing cells (osrm-customize)..."
docker run --rm -t -v "${DATA_DIR}:/data" "${OSRM_IMAGE}" \
  osrm-customize "/data/bangladesh-latest.osrm"

echo ""
echo "=== OSRM Data Preprocessing Complete! ==="
echo "You can now start OSRM via Docker Compose:"
echo "  docker compose -f docker-compose.delivery.yml up -d"
echo ""
