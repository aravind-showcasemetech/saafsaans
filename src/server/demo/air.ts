import fs from "node:fs";
import path from "node:path";
import type { NormalisedAirData } from "../../shared/air-types.js";

function loadFixture(filename: string): NormalisedAirData {
  const fixturePath = path.resolve(process.cwd(), "test/fixtures", filename);
  const content = fs.readFileSync(fixturePath, "utf-8");
  return JSON.parse(content) as NormalisedAirData;
}

export const kukatpallyDemoAir: NormalisedAirData = loadFixture("air-kukatpally.json");
export const dwarkaDemoAir: NormalisedAirData = loadFixture("air-dwarka.json");
