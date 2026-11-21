// context.ts: What every Today section needs: the household, its air, its plan and the ticked swaps.
import type { NormalisedAirData } from "../../../shared/air-types.js";
import type { WindowResult } from "../../../shared/impact/index.js";
import type { HouseholdProfile } from "../../../shared/schemas.js";
import type { PlanResponse } from "../api.js";
import type { StoredLocation } from "../storage.js";

export interface TodayContext {
  profile: HouseholdProfile;
  location: StoredLocation;
  nicknames: Record<string, string>;
  air: NormalisedAirData;
  plan: PlanResponse;
  cleanest: WindowResult | null;
  dirtiest: WindowResult | null;
  active: Set<string>;
}

export const TODAY_STEPS = 6;

/** A member's nickname (kept only in this browser), or their reference when there is none. */
export function nameOf(ctx: TodayContext, memberId: string): string {
  return ctx.nicknames[memberId] || memberId;
}
