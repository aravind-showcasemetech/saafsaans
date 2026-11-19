import fs from "node:fs";
import path from "node:path";
import { fetchAirData } from "./air.js";
import { config } from "./config.js";

async function main() {
  if (!config.mapsApiKey) {
    console.error("MAPS_API_KEY is not set in environment.");
    process.exit(1);
  }

  const fixtureDir = path.resolve(process.cwd(), "test/fixtures");
  if (!fs.existsSync(fixtureDir)) {
    fs.mkdirSync(fixtureDir, { recursive: true });
  }

  // 1. Kukatpally, Hyderabad
  const kukatpallyLat = 17.48;
  const kukatpallyLng = 78.41;
  console.log(`Calling Air Quality API for Kukatpally (${kukatpallyLat}, ${kukatpallyLng})...`);
  const kukatpallyAir = await fetchAirData(
    kukatpallyLat,
    kukatpallyLng,
    config.mapsApiKey,
    fetch,
    true,
  );
  const kukatpallyPath = path.join(fixtureDir, "air-kukatpally.json");
  fs.writeFileSync(kukatpallyPath, JSON.stringify(kukatpallyAir, null, 2), "utf-8");
  console.log(`Successfully saved fixture to ${kukatpallyPath}`);

  // 2. Dwarka, Delhi
  const dwarkaLat = 28.59;
  const dwarkaLng = 77.05;
  console.log(`Calling Air Quality API for Dwarka, Delhi (${dwarkaLat}, ${dwarkaLng})...`);
  const dwarkaAir = await fetchAirData(dwarkaLat, dwarkaLng, config.mapsApiKey, fetch, true);
  const dwarkaPath = path.join(fixtureDir, "air-dwarka.json");
  fs.writeFileSync(dwarkaPath, JSON.stringify(dwarkaAir, null, 2), "utf-8");
  console.log(`Successfully saved fixture to ${dwarkaPath}`);
}

main().catch((err) => {
  console.error("Error capturing air quality data:", err);
  process.exit(1);
});
