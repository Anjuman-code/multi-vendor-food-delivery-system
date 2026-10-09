# Delivery Routing & Geocoding Setup Guide (OpenStreetMap / FOSS)

**Project:** Food Rush (`mvfds`)  
**Document Path:** `/home/usign/.temp/mvfds/docs/DELIVERY_ROUTING_SETUP.md`  
**Status:** Authoritative Production Reference  

---

## 1. Overview & System Architecture

Food Rush uses an entirely open-source, vendor-independent routing and mapping stack:
- **Routing Engine:** Self-hosted OSRM (`osrm-backend` Docker container) running the Multi-Level Dijkstra (MLD) algorithm on Bangladesh OpenStreetMap data.
- **Resilience Layer:** In-memory LRU + MongoDB TTL route caching with an automatic circuit breaker tripping to straight-line Haversine fallback ($\times 1.3$ detour factor) when OSRM is offline or timed out (>2s).
- **Geocoding & Reverse Geocoding:** Server-side proxy interfacing with Nominatim with strict 1 req/sec rate-limiting, custom `User-Agent`, country restrictions, and 30-day MongoDB TTL caching.
- **Client Mapping:** Leaflet / `react-leaflet` with OpenStreetMap raster tiles displaying mandatory `© OpenStreetMap contributors` attribution (ODbL).

---

## 2. Resource Requirements & Footprint

Based on the Geofabrik Bangladesh extract (`bangladesh-latest.osm.pbf`):

| Resource | Value | Notes |
| :--- | :--- | :--- |
| **Download Size** | ~75 MB | Compressed `.osm.pbf` format |
| **Extracted / Preprocessed Size** | ~220 MB | Preprocessed graph files (`.osrm`, `.osrm.hsgr`, etc.) |
| **RAM Footprint (Pre-processing)** | ~1.2 GB | Peak memory usage during `osrm-partition` |
| **RAM Footprint (Runtime `osrm-routed`)** | ~450 MB – 650 MB | Low memory consumption in memory-mapped mode |
| **Routing Query Latency** | < 5 ms | Extremely fast point-to-point road routing |

---

## 3. Quick Start (One-Command Setup)

### Step 1: Preprocess Bangladesh OSM Data
Run the automated preparation script from the repository root:
```bash
./scripts/setup-osrm.sh
```
This script downloads `bangladesh-latest.osm.pbf` from Geofabrik into `/home/usign/.temp/mvfds/data/osrm/`, runs `osrm-extract` (using the car profile), `osrm-partition`, and `osrm-customize`.

### Step 2: Start the OSRM Service
Launch OSRM in the background:
```bash
docker compose -f docker-compose.delivery.yml up -d
```

### Step 3: Verify OSRM Health
```bash
curl -s "http://localhost:5000/route/v1/driving/91.8687,24.8994;91.8700,24.9000?overview=false" | jq .
```
Expected response:
```json
{
  "code": "Ok",
  "routes": [
    {
      "geometry": "...",
      "legs": [...],
      "weight_name": "routability",
      "weight": 24.3,
      "duration": 24.3,
      "distance": 182.5
    }
  ],
  "waypoints": [...]
}
```

---

## 4. Development Without Docker (Graceful Fallback)

If you are developing locally without Docker running, the Food Rush backend **automatically degrades gracefully**:
1. When OSRM is unreachable, the backend circuit breaker catches connection errors.
2. The system computes estimated road distance using great-circle Haversine distance multiplied by the admin-configured `detourFactor` (default `1.3`).
3. Fees are calculated accurately, marked with `isEstimate = true`, and the order and checkout flows remain 100% operational.
4. As soon as the OSRM container is started, the circuit breaker resets and real road routing resumes automatically without requiring an application restart.

---

## 5. Monthly OSM Data Refresh Procedure

OpenStreetMap data changes as roads and infrastructure are built. To refresh data monthly:

```bash
# 1. Pull latest extract and re-run MLD preprocessing
./scripts/setup-osrm.sh

# 2. Restart the OSRM container to load the new graph
docker compose -f docker-compose.delivery.yml restart osrm
```

Zero backend restart or migration is needed; the backend's route cache will update on next query after TTL expiry.

---

## 6. Swapping Routing Providers (Extensibility)

The backend routing system is abstracted behind the `RoutingProvider` interface in [`/home/usign/.temp/mvfds/backend/src/services/delivery/routing/routing.interface.ts`](file:///home/usign/.temp/mvfds/backend/src/services/delivery/routing/routing.interface.ts).

To swap to another self-hosted engine:
- **Valhalla:** Implement `ValhallaProvider` communicating with Valhalla's `/route` endpoint and set `ROUTING_PROVIDER=valhalla`.
- **OpenRouteService (ORS):** Implement `OrsProvider` communicating with ORS `/v2/directions/driving-car` and set `ROUTING_PROVIDER=ors`.

---

## 7. Nominatim Geocoding Compliance Runbook

When using the public Nominatim instance (`https://nominatim.openstreetmap.org`), Food Rush enforces:
1. **Header Identification:** Every request sends `User-Agent: FoodRush-Delivery/1.0 (contact: support@foodrush.app)` and `Referer`.
2. **Strict 1 req/sec Throttling:** All calls pass through an in-memory sequential promise queue with $\ge 1000$ ms between calls.
3. **No Keystroke Autocomplete:** The frontend `LocationPicker` debounces input by 400ms and requires $\ge 3$ characters before querying.
4. **Caching:** Positive results are cached for 30 days in MongoDB; negative queries are cached for 1 hour.

### Self-Hosting Nominatim
To point to your own self-hosted Nominatim server:
```bash
# In backend/.env
NOMINATIM_BASE_URL=http://your-internal-nominatim-server:8080
```

---

## 8. Tile Providers & Legal Attribution Requirements

The frontend map layers must always display the open-source attribution:
```html
&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
```
- **Standard OSM Tiles:** Default `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` suitable for low-to-medium volume.
- **Self-Hosted Tiles / Tile Provider:** To use self-hosted vector/raster tiles or an open tile provider, set `VITE_MAP_TILE_URL` in frontend environment config.
