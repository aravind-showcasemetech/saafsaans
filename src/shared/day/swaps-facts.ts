// swaps-facts.ts: Swaps shown as a sourced fact or as advice only (FACTORS.md section 6).
import type { HouseholdProfile } from "../schemas.js";
import type { SwapImpactResult } from "./types.js";

/** The fact or advice swap for this id, or null when the id is not one of them. */
export function factOrAdviceImpact(
  swapId: string,
  profile: HouseholdProfile,
): SwapImpactResult | null {
  switch (swapId) {
    case "no-mosquito-coil": {
      if (!profile.home.usesMosquitoCoils) {
        return {
          swapId,
          applicable: false,
          lens: "protect",
          kind: "sourcedFact",
          isEstimate: false,
          factorSections: ["6"],
        };
      }
      return {
        swapId,
        applicable: true,
        lens: "protect",
        kind: "sourcedFact",
        isEstimate: false,
        factorSections: ["6"],
        factTextKey: "facts.mosquitoCoil",
      };
    }

    case "incense-outside": {
      if (!profile.home.usesIncense) {
        return {
          swapId,
          applicable: false,
          lens: "protect",
          kind: "sourcedFact",
          isEstimate: false,
          factorSections: ["6"],
        };
      }
      return {
        swapId,
        applicable: true,
        lens: "protect",
        kind: "sourcedFact",
        isEstimate: false,
        factorSections: ["6"],
        factTextKey: "facts.incense",
      };
    }

    case "cook-with-exhaust": {
      if (profile.home.cookingMethod !== "gas" && profile.home.cookingMethod !== "lots_of_frying") {
        return {
          swapId,
          applicable: false,
          lens: "protect",
          kind: "sourcedFact",
          isEstimate: false,
          factorSections: ["6"],
        };
      }
      return {
        swapId,
        applicable: true,
        lens: "protect",
        kind: "sourcedFact",
        isEstimate: false,
        factorSections: ["6"],
        factTextKey: "facts.frying",
      };
    }

    case "diy-fan-filter": {
      if (profile.home.hasPurifier) {
        return {
          swapId,
          applicable: false,
          lens: "protect",
          kind: "adviceOnly",
          isEstimate: false,
          factorSections: [],
        };
      }
      return {
        swapId,
        applicable: true,
        lens: "protect",
        kind: "adviceOnly",
        isEstimate: false,
        factorSections: [],
        factTextKey: "advice.diyFanFilter",
      };
    }

    case "wet-mop": {
      return {
        swapId,
        applicable: true,
        lens: "protect",
        kind: "adviceOnly",
        isEstimate: false,
        factorSections: ["6"],
        factTextKey: "advice.wetMop",
      };
    }

    case "no-idling": {
      const isDriver = [
        "petrol_car_small",
        "petrol_car",
        "petrol_sedan",
        "diesel_car",
        "diesel_sedan",
        "cng_car",
        "scooter",
        "motorcycle",
        "auto",
      ].includes(profile.commute.mode);
      if (!isDriver) {
        return {
          swapId,
          applicable: false,
          lens: "polluteLess",
          kind: "adviceOnly",
          isEstimate: false,
          factorSections: [],
        };
      }
      return {
        swapId,
        applicable: true,
        lens: "polluteLess",
        kind: "adviceOnly",
        isEstimate: false,
        factorSections: [],
        factTextKey: "advice.noIdling",
      };
    }

    case "no-burning": {
      return {
        swapId,
        applicable: true,
        lens: "polluteLess",
        kind: "adviceOnly",
        isEstimate: false,
        factorSections: [],
        factTextKey: "advice.noBurning",
      };
    }

    default:
      return null;
  }
}
