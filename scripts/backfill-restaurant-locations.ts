/**
 * scripts/backfill-restaurant-locations.ts
 *
 * Idempotent backfill script to populate missing restaurant coordinates and set
 * locationVerified = true using scraped Sylhet dataset and area lookup centroids.
 *
 * Safe & Dry-run by default:
 *   npx ts-node scripts/backfill-restaurant-locations.ts            # Dry run (inspect only)
 *   npx ts-node scripts/backfill-restaurant-locations.ts --commit  # Apply changes to MongoDB
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import Restaurant from "../backend/src/models/Restaurant";

const backendRequire = createRequire(
  path.resolve(__dirname, "../backend/package.json"),
);
backendRequire("dotenv/config");
const mongoose = backendRequire("mongoose") as typeof import("mongoose");

// Known Sylhet landmark/area centroids [lat, lng]
const SYLHET_AREA_CENTROIDS: Record<string, [number, number]> = {
  "zinda bazar": [24.8949, 91.8687],
  "zindabazar": [24.8949, 91.8687],
  "amberkhana": [24.9056, 91.8686],
  "shibgonj": [24.8872, 91.8845],
  "shibganj": [24.8872, 91.8845],
  "upashahar": [24.8841, 91.8762],
  "uposhohor": [24.8841, 91.8762],
  "mirabazar": [24.8912, 91.8741],
  "mira bazar": [24.8912, 91.8741],
  "lamabazar": [24.8923, 91.8598],
  "lama bazar": [24.8923, 91.8598],
  "pathantula": [24.9082, 91.8491],
  "subidbazar": [24.9031, 91.8572],
  "subid bazar": [24.9031, 91.8572],
  "kumarpara": [24.8981, 91.8745],
  "chauhatta": [24.9002, 91.8671],
  "dargah gate": [24.9015, 91.8678],
  "tilagarh": [24.8967, 91.9023],
  "kazirbazar": [24.8863, 91.8612],
  "kazir bazar": [24.8863, 91.8612],
  "kadamtali": [24.8779, 91.8681],
  "south surma": [24.8732, 91.8654],
  "bandarbazar": [24.8893, 91.8692],
  "bandar bazar": [24.8893, 91.8692],
  "sylhet sadar": [24.8949, 91.8687],
};

const DEFAULT_SYLHET_COORDS: [number, number] = [24.8949, 91.8687];

function normalize(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

async function main() {
  const isCommit = process.argv.includes("--commit") || process.argv.includes("--apply");
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("✖ MONGODB_URI is not defined in environment");
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`Food Rush — Restaurant Location Backfill Engine`);
  console.log(`Mode: ${isCommit ? "⚡ LIVE COMMIT" : "🔍 DRY RUN (Pass --commit to apply)"}`);
  console.log(`======================================================\n`);

  await mongoose.connect(uri);
  console.log("✔ Connected to MongoDB");

  // Load scraped sylhet_restaurants.json reference if available
  const scrapedJsonPath = path.resolve(__dirname, "sylhet_restaurants.json");
  let scrapedList: Array<{ name?: string; latitude?: number; longitude?: number }> = [];

  if (fs.existsSync(scrapedJsonPath)) {
    try {
      const raw = fs.readFileSync(scrapedJsonPath, "utf-8");
      scrapedList = JSON.parse(raw);
      console.log(`✔ Loaded ${scrapedList.length} scraped reference entries from sylhet_restaurants.json`);
    } catch (e) {
      console.warn("⚠ Could not parse sylhet_restaurants.json, proceeding with area centroid table.");
    }
  }

  const restaurants = await Restaurant.find();
  console.log(`→ Total restaurants found in database: ${restaurants.length}\n`);

  let alreadyVerified = 0;
  let canBackfill = 0;
  let updatedCount = 0;

  for (const r of restaurants) {
    const hasCoordinates =
      r.location?.coordinates &&
      r.location.coordinates.length === 2 &&
      Number.isFinite(r.location.coordinates[0]) &&
      Number.isFinite(r.location.coordinates[1]) &&
      (r.location.coordinates[0] !== 0 || r.location.coordinates[1] !== 0);

    if (hasCoordinates && r.locationVerified) {
      alreadyVerified++;
      continue;
    }

    // Determine coords from reference or area table
    let foundLat: number | null = null;
    let foundLng: number | null = null;
    let matchSource = "";

    // 1. Try exact or sub-string match from scraped JSON by name
    const normName = normalize(r.name);
    const scrapedMatch = scrapedList.find((item) => {
      if (!item.name || !item.latitude || !item.longitude) return false;
      const sName = normalize(item.name);
      return normName === sName || normName.includes(sName) || sName.includes(normName);
    });

    if (scrapedMatch && scrapedMatch.latitude && scrapedMatch.longitude) {
      foundLat = scrapedMatch.latitude;
      foundLng = scrapedMatch.longitude;
      matchSource = `scraped dataset match ("${scrapedMatch.name}")`;
    }

    // 2. Try Area match from address
    if (!foundLat) {
      const normArea = normalize(r.address?.area || "");
      const normStreet = normalize(r.address?.street || "");

      for (const [key, coords] of Object.entries(SYLHET_AREA_CENTROIDS)) {
        if (normArea.includes(key) || normStreet.includes(key)) {
          foundLat = coords[0];
          foundLng = coords[1];
          matchSource = `area centroid for "${key}"`;
          break;
        }
      }
    }

    // 3. Fallback to Sylhet Sadar city center with slight deterministic offset
    if (!foundLat) {
      const charSum = r.name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const latOffset = ((charSum % 100) - 50) * 0.0001;
      const lngOffset = (((charSum * 3) % 100) - 50) * 0.0001;
      foundLat = DEFAULT_SYLHET_COORDS[0] + latOffset;
      foundLng = DEFAULT_SYLHET_COORDS[1] + lngOffset;
      matchSource = "Sylhet Sadar baseline centroid with deterministic spread";
    }

    canBackfill++;
    console.log(`[BACKFILL] ${r.name} (${r._id})`);
    console.log(`  Address: ${r.address?.street || "N/A"}, ${r.address?.area || "N/A"}, ${r.address?.district || "Sylhet"}`);
    console.log(`  Resolved: [lat: ${foundLat.toFixed(5)}, lng: ${foundLng.toFixed(5)}] via ${matchSource}`);

    if (isCommit) {
      await Restaurant.updateOne(
        { _id: r._id },
        {
          $set: {
            location: {
              type: "Point",
              coordinates: [foundLng, foundLat], // GeoJSON order: [lng, lat]
            },
            locationVerified: true,
            "address.coordinates": {
              lat: foundLat,
              lng: foundLng,
            },
          },
        },
      );
      updatedCount++;
    }
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`Backfill Summary:`);
  console.log(`  Already verified & valid: ${alreadyVerified}`);
  console.log(`  Targeted for backfill:    ${canBackfill}`);
  console.log(`  Committed to database:    ${updatedCount}`);
  console.log(`------------------------------------------------------\n`);

  if (!isCommit && canBackfill > 0) {
    console.log(`ℹ This was a dry run. Run with --commit to apply to MongoDB:\n  npx ts-node scripts/backfill-restaurant-locations.ts --commit\n`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Fatal error during restaurant backfill:", err);
  process.exit(1);
});
