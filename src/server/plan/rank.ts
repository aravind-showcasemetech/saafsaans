// rank.ts: Impact-based ranking for SaafSaans.
// Replaces fixed priority list with ranking by computed impact:
// - Protect swaps by largest percentage dose cut for any member (sensitive members first on ties)
// - Pollute less swaps by kg CO2 a week
// - Offer only the best one of metro, bus, and carpool for the same commute
// - Alternate the two lenses in top 6, then sourced facts, then advice.

import type { HouseholdProfile, MemberProfile } from "../../shared/schemas.js";
import type { ComputedSwapItem } from "./compute.js";

function hasSensitiveMember(
  appliesToMemberIds: string[] | undefined,
  members: MemberProfile[],
): boolean {
  if (!appliesToMemberIds || appliesToMemberIds.length === 0) return false;
  return members.some((m) => appliesToMemberIds.includes(m.id) && m.sensitivity !== "none");
}

const TRANSIT_GROUP_IDS = new Set(["metro-not-car", "bus-not-car", "carpool"]);

/** Keeps only the transit swap (metro, bus or carpool) that saves the most CO2 a week. */
function bestTransitOnly(items: ComputedSwapItem[]): ComputedSwapItem[] {
  let best: ComputedSwapItem | undefined;
  for (const t of items) {
    if (!TRANSIT_GROUP_IDS.has(t.id)) continue;
    if (!best || (t.co2SavedKgPerWeek ?? 0) > (best.co2SavedKgPerWeek ?? 0)) best = t;
  }
  return items.filter((it) => !TRANSIT_GROUP_IDS.has(it.id) || it.id === best?.id);
}

/** Protect #1, Pollute #1, Protect #2, Pollute #2 and so on. */
function alternate(a: ComputedSwapItem[], b: ComputedSwapItem[]): ComputedSwapItem[] {
  const out: ComputedSwapItem[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

/** Removes repeated ids, keeping the first. */
function uniqueById(items: ComputedSwapItem[]): ComputedSwapItem[] {
  const seen = new Set<string>();
  return items.filter((item) => !seen.has(item.id) && Boolean(seen.add(item.id)));
}

export function rankApplicableActions(
  items: ComputedSwapItem[],
  profile?: HouseholdProfile,
): ComputedSwapItem[] {
  const filteredItems = bestTransitOnly(items);
  const members = profile?.members ?? [];

  // Protect swaps by the largest dose cut for any member; sensitive members first on ties.
  const protectComputed = filteredItems
    .filter((it) => it.lens === "protect" && it.kind === "computed")
    .sort((a, b) => {
      const cutA = a.maxDoseCutPercentage ?? 0;
      const cutB = b.maxDoseCutPercentage ?? 0;
      if (Math.abs(cutB - cutA) > 1e-4) return cutB - cutA;
      const sensitiveA = hasSensitiveMember(a.appliesToMemberIds, members) ? 1 : 0;
      const sensitiveB = hasSensitiveMember(b.appliesToMemberIds, members) ? 1 : 0;
      return sensitiveB - sensitiveA;
    });

  // Pollute less swaps by kg CO2 a week.
  const polluteLessComputed = filteredItems
    .filter((it) => it.lens === "polluteLess" && it.kind === "computed")
    .sort((a, b) => (b.co2SavedKgPerWeek ?? 0) - (a.co2SavedKgPerWeek ?? 0));

  // The two lenses alternate, then sourced facts, then advice.
  return uniqueById([
    ...alternate(protectComputed, polluteLessComputed),
    ...filteredItems.filter((it) => it.kind === "sourcedFact"),
    ...filteredItems.filter((it) => it.kind === "adviceOnly"),
  ]);
}
