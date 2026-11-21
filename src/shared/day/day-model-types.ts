// day-model-types.ts: Shapes shared by the household day model.
import type { ActivityLevel, AgeBand } from "../factors.js";
import type { HouseholdProfile } from "../schemas.js";

export type HourlyForecastLookup = (hour: number) => number;

export interface DayHourBlock {
  hour: number; // 0..23
  place: "home" | "office_school" | "traffic" | "outdoors";
  activity: ActivityLevel;
  pm25: number;
  inhalationRateM3PerHour: number;
  isEstimate: boolean;
  factorSections: string[];
}

export interface MemberDaySchedule {
  memberId: string;
  memberRef: string; // m1, m2...
  nickname: string;
  ageBand: AgeBand;
  blocks: DayHourBlock[]; // 24 hourly blocks (0..23)
  totalDoseUg: number;
  avgPm25: number;
  cigarettesForDay: number;
  isEstimate: boolean;
  factorSections: string[];
}

export interface DayModelSwapsActive {
  shiftOutdoorExercise?: boolean;
  exerciseIndoors?: boolean;
  purifierBedroom?: boolean;
  shutWindowsPeak?: boolean;
  airHouseCleanWindow?: boolean;
  maskOutdoors?: boolean; // applied to commute / outdoor work
}

export interface HouseholdDayModelOptions {
  profile: HouseholdProfile;
  hourlyForecast: readonly { time: string; pm25: number }[];
  currentPm25: number;
  swapsActive?: DayModelSwapsActive;
}

export interface MemberDayComparison {
  memberId: string;
  memberRef: string;
  nickname: string;
  baseDoseUg: number;
  withSwapsDoseUg: number;
  doseCutPercentage: number;
  baseAvgExposureUgM3: number;
  withSwapsAvgExposureUgM3: number;
  baseCigarettes: number;
  withSwapsCigarettes: number;
  cigarettesAvoided: number;
  isEstimate: boolean;
  factorSections: string[];
}

export interface SwapMemberImpact {
  memberId: string;
  memberRef: string;
  nickname: string;
  doseCutPercentage: number;
  cigarettesAvoided: number;
  doseSavedUg: number;
  isEstimate: boolean;
  factorSections: string[];
}

export interface SwapImpactResult {
  swapId: string;
  applicable: boolean;
  lens: "protect" | "polluteLess";
  kind: "computed" | "sourcedFact" | "adviceOnly";
  isEstimate: boolean;
  factorSections: string[];
  // For protect swaps:
  memberImpacts?: SwapMemberImpact[];
  maxDoseCutPercentage?: number;
  maxCigarettesAvoided?: number;
  // For mask-outdoors range:
  maskRange?: {
    minPercent: number;
    maxPercent: number;
    unit: string;
  };
  // Sourced fact text or advice:
  factTextKey?: string;
  // Purifier extra info:
  purifierCadrCfm?: number;
  purifierCadrUnit?: string;
  // For pollute-less swaps:
  co2SavedKgPerDay?: number;
  co2SavedKgPerWeek?: number;
  vehicleKmAvoidedPerDay?: number;
}
