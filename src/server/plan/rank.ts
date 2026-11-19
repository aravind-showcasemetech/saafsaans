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

export function rankApplicableActions(
  items: ComputedSwapItem[],
  profile?: HouseholdProfile,
): ComputedSwapItem[] {
  // 1. Offer only the best one of metro, bus, and carpool for the same commute
  // Compare their co2SavedKgPerWeek
  const transitGroupIds = new Set(["metro-not-car", "bus-not-car", "carpool"]);
  const transitItems = items.filter((it) => transitGroupIds.has(it.id));

  let chosenTransitId: string | null = null;
  if (transitItems.length > 0) {
    let bestTransit = transitItems[0];
    for (const t of transitItems) {
      if ((t.co2SavedKgPerWeek ?? 0) > (bestTransit.co2SavedKgPerWeek ?? 0)) {
        bestTransit = t;
      }
    }
    chosenTransitId = bestTransit.id;
  }

  const filteredItems = items.filter((it) => {
    if (transitGroupIds.has(it.id)) {
      return it.id === chosenTransitId;
    }
    return true;
  });

  // 2. Separate into categories:
  // - Protect computed
  // - Pollute less computed
  // - Sourced facts
  // - Advice only
  const protectComputed = filteredItems.filter(
    (it) => it.lens === "protect" && it.kind === "computed",
  );
  const polluteLessComputed = filteredItems.filter(
    (it) => it.lens === "polluteLess" && it.kind === "computed",
  );
  const sourcedFacts = filteredItems.filter((it) => it.kind === "sourcedFact");
  const adviceOnly = filteredItems.filter((it) => it.kind === "adviceOnly");

  // Sort Protect swaps by largest percentage dose cut for any member; sensitive members first on ties
  protectComputed.sort((a, b) => {
    const cutA = a.maxDoseCutPercentage ?? 0;
    const cutB = b.maxDoseCutPercentage ?? 0;
    if (Math.abs(cutB - cutA) > 1e-4) {
      return cutB - cutA;
    }
    const members = profile?.members ?? [];
    const sensitiveA = hasSensitiveMember(a.appliesToMemberIds, members) ? 1 : 0;
    const sensitiveB = hasSensitiveMember(b.appliesToMemberIds, members) ? 1 : 0;
    return sensitiveB - sensitiveA;
  });

  // Sort Pollute less swaps by kg CO2 a week
  polluteLessComputed.sort((a, b) => {
    const weekA = a.co2SavedKgPerWeek ?? 0;
    const weekB = b.co2SavedKgPerWeek ?? 0;
    return weekB - weekA;
  });

  // Alternate the two lenses in the top 6:
  // e.g. Protect #1, Pollute #1, Protect #2, Pollute #2...
  const topSwaps: ComputedSwapItem[] = [];
  const maxPairs = Math.max(protectComputed.length, polluteLessComputed.length);
  for (let i = 0; i < maxPairs; i++) {
    if (i < protectComputed.length) {
      topSwaps.push(protectComputed[i]);
    }
    if (i < polluteLessComputed.length) {
      topSwaps.push(polluteLessComputed[i]);
    }
  }

  // Followed by remaining computed, then sourced facts, then advice
  const ranked = [...topSwaps, ...sourcedFacts, ...adviceOnly];

  // Deduplicate preserving order
  const seen = new Set<string>();
  const result: ComputedSwapItem[] = [];
  for (const item of ranked) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }

  return result;
}
