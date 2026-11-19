import fs from "node:fs";
import path from "node:path";
import { fetchAirData } from "./air.js";
import { config } from "./config.js";

async function main() {
  const lat = 17.48;
  const lng = 78.41;

  if (!config.mapsApiKey) {
    console.error("MAPS_API_KEY is not set in environment.");
    process.exit(1);
  }

  console.log(`Calling Air Quality API for Kukatpally (${lat}, ${lng})...`);
  const airData = await fetchAirData(lat, lng, config.mapsApiKey);

  const fixtureDir = path.resolve(process.cwd(), "test/fixtures");
  if (!fs.existsSync(fixtureDir)) {
    fs.mkdirSync(fixtureDir, { recursive: true });
  }

  const fixturePath = path.join(fixtureDir, "air-kukatpally.json");
  fs.writeFileSync(fixturePath, JSON.stringify(airData, null, 2), "utf-8");
  console.log(`Successfully saved fixture to ${fixturePath}`);
}

main().catch((err) => {
  console.error("Error capturing air quality data:", err);
  process.exit(1);
});
