// air.ts: Saved Air Quality API captures used in demo mode or without a Maps key.
// Written by `npm run capture:air`, each with the time it was captured (capturedAt).
import type { NormalisedAirData } from "../../shared/air-types.js";
import dwarka from "./captures/air-dwarka.json" with { type: "json" };
import kukatpally from "./captures/air-kukatpally.json" with { type: "json" };

export const kukatpallyDemoAir = kukatpally as NormalisedAirData;
export const dwarkaDemoAir = dwarka as NormalisedAirData;
