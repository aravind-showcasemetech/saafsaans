// factors.ts: Constants from docs/FACTORS.md sections 1 to 9.
// Each constant names its section and status (SOURCED or CHOSEN).
// Skip anything marked NOT VERIFIED.

/**
 * Section 1: India's National AQI (CPCB)
 * Source: CPCB, National Ambient Air Quality Status & Trends 2019 (NAAQMS/45/2019-2020), §8.5.
 * Status: SOURCED
 */
export interface AqiBreakpoint {
  readonly band: "Good" | "Satisfactory" | "Moderately polluted" | "Poor" | "Very Poor" | "Severe";
  readonly aqiMin: number;
  readonly aqiMax: number;
  readonly pm25Min: number;
  readonly pm25Max: number;
  readonly healthStatement: string;
}

export const CPCB_AQI_BANDS: readonly AqiBreakpoint[] = [
  {
    band: "Good",
    aqiMin: 0,
    aqiMax: 50,
    pm25Min: 0,
    pm25Max: 30,
    healthStatement: "Minimal Impact",
  },
  {
    band: "Satisfactory",
    aqiMin: 51,
    aqiMax: 100,
    pm25Min: 31,
    pm25Max: 60,
    healthStatement: "May cause minor breathing discomfort to sensitive people.",
  },
  {
    band: "Moderately polluted",
    aqiMin: 101,
    aqiMax: 200,
    pm25Min: 61,
    pm25Max: 90,
    healthStatement:
      "May cause breathing discomfort to people with lung disease such as asthma, and discomfort to people with heart disease, children and older adults.",
  },
  {
    band: "Poor",
    aqiMin: 201,
    aqiMax: 300,
    pm25Min: 91,
    pm25Max: 120,
    healthStatement:
      "May cause breathing discomfort to people on prolonged exposure, and discomfort to people with heart disease",
  },
  {
    band: "Very Poor",
    aqiMin: 301,
    aqiMax: 400,
    pm25Min: 121,
    pm25Max: 250,
    healthStatement:
      "May cause respiratory illness to the people on prolonged exposure. Effect may be more pronounced in people with lung and heart diseases.",
  },
  {
    band: "Severe",
    aqiMin: 401,
    aqiMax: 500,
    pm25Min: 250.0001, // 250+ (starts above 250)
    pm25Max: Number.POSITIVE_INFINITY,
    healthStatement:
      "May cause respiratory effects even on healthy people and serious health impacts on people with lung/heart diseases. The health impacts may be experienced even during light physical activity",
  },
] as const;

/**
 * Section 2: Breathing rates by age and activity
 * Source: US EPA, Exposure Factors Handbook (2011), Chapter 6, Table 6-2
 * Status: SOURCED for table rows, CHOSEN where indicated for age band mapping
 * Values in m3/minute. Multiply by 60 for m3/hour.
 */
export type ActivityLevel = "sleep" | "sedentary" | "light" | "moderate" | "high";

export type AgeBand =
  | "under-6"
  | "6-10"
  | "11-15"
  | "16-30"
  | "31-40"
  | "41-60"
  | "61-70"
  | "71-plus";

export interface AgeBandMeta {
  readonly status: "SOURCED" | "CHOSEN";
  readonly section: "2";
  readonly ratesPerMinute: Record<ActivityLevel, number>;
}

// Inhalation rates in m3 per minute (Table 6-2)
export const INHALATION_RATES_M3_PER_MIN: Record<AgeBand, AgeBandMeta> = {
  // Section 2: CHOSEN (mapped from 3 to <6 row for under-3s)
  "under-6": {
    status: "CHOSEN",
    section: "2",
    ratesPerMinute: {
      sleep: 0.0043,
      sedentary: 0.0045,
      light: 0.011,
      moderate: 0.021,
      high: 0.037,
    },
  },
  // Section 2: SOURCED (6 to <11 row)
  "6-10": {
    status: "SOURCED",
    section: "2",
    ratesPerMinute: {
      sleep: 0.0045,
      sedentary: 0.0048,
      light: 0.011,
      moderate: 0.022,
      high: 0.042,
    },
  },
  // Section 2: SOURCED (11 to <16 row)
  "11-15": {
    status: "SOURCED",
    section: "2",
    ratesPerMinute: {
      sleep: 0.005,
      sedentary: 0.0054,
      light: 0.013,
      moderate: 0.025,
      high: 0.049,
    },
  },
  // Section 2: CHOSEN (mapped from 21 to <31 row for 16-20)
  "16-30": {
    status: "CHOSEN",
    section: "2",
    ratesPerMinute: {
      sleep: 0.0043,
      sedentary: 0.0042,
      light: 0.012,
      moderate: 0.026,
      high: 0.05,
    },
  },
  // Section 2: SOURCED (31 to <41 row)
  "31-40": {
    status: "SOURCED",
    section: "2",
    ratesPerMinute: {
      sleep: 0.0046,
      sedentary: 0.0043,
      light: 0.012,
      moderate: 0.027,
      high: 0.049,
    },
  },
  // Section 2: CHOSEN (mapped from 41 to <51 row for 51-60)
  "41-60": {
    status: "CHOSEN",
    section: "2",
    ratesPerMinute: {
      sleep: 0.005,
      sedentary: 0.0048,
      light: 0.013,
      moderate: 0.028,
      high: 0.052,
    },
  },
  // Section 2: SOURCED (61 to <71 row)
  "61-70": {
    status: "SOURCED",
    section: "2",
    ratesPerMinute: {
      sleep: 0.0052,
      sedentary: 0.0049,
      light: 0.012,
      moderate: 0.026,
      high: 0.047,
    },
  },
  // Section 2: SOURCED (71 to <81 row)
  "71-plus": {
    status: "SOURCED",
    section: "2",
    ratesPerMinute: {
      sleep: 0.0053,
      sedentary: 0.005,
      light: 0.012,
      moderate: 0.025,
      high: 0.047,
    },
  },
};

/**
 * Section 3: Cigarette equivalence
 * Source: Muller & Muller, Berkeley Earth (2015)
 * Status: SOURCED
 * 1 cigarette per day = 22 ug/m3 PM2.5 (24-hour average exposure)
 */
export const CIGARETTE_EQUIVALENT_PM25 = 22; // ug/m3

/**
 * Section 4: Indoor air from outdoor air (single-room mass balance)
 * C_in = P * a * C_out / (a + k + CADR / V)
 */
// Section 4: SOURCED (Xiang et al. 2021)
export const PENETRATION_FACTOR_P = 0.97;

// Section 4: CHOSEN in range 0.10-0.49 (Xiang et al. 2021)
export const DEPOSITION_RATE_K = 0.3; // per hour

// Section 4: SOURCED (Liao et al. 2019, Delhi homes mean)
export const AIR_EXCHANGE_SHUT_A = 1.5; // per hour

// Section 4: CHOSEN in range 2.5-5.1 (Liao et al. 2019; Xiang et al. 2021)
export const AIR_EXCHANGE_OPEN_A = 5.0; // per hour

/**
 * Section 5: Purifier sizing
 * Source: AHAM / US EPA
 * Status: SOURCED
 * CADR (cfm) = 2/3 * room area (sq ft) * (ceiling height (ft) / 8 ft)
 * Conversions: 1 cfm = 1.699 m3/h; 1 m2 = 10.764 sq ft
 */
export const CADR_MULTIPLIER = 2 / 3;
export const STANDARD_CEILING_HEIGHT_FT = 8;
export const CFM_TO_M3_PER_HOUR = 1.699;
export const SQ_METERS_TO_SQ_FEET = 10.764;

/**
 * Section 6: Indoor sources (shown as facts, not computed into dose)
 * Status: SOURCED
 */
export const INDOOR_SOURCES = {
  mosquitoCoil: {
    section: "6",
    status: "SOURCED",
    cigaretteEquivMin: 75,
    cigaretteEquivMax: 137,
    text: "burning one mosquito coil would release the same amount of PM(2.5) mass as burning 75-137 cigarettes",
  },
  incense: {
    section: "6",
    status: "SOURCED",
    peakPm25: 197, // ug/m3
    text: "reached 197 microg/m(3) in an experimental house",
  },
  frying: {
    section: "6",
    status: "SOURCED",
    noVentilationMgM3: 4.5,
    hoodOnMgM3: 0.5,
    text: "Median 4.5 mg/m³ PM2.5 with no ventilation vs 0.5 mg/m³ with the stove hood on (2-hour sample, pan-frying)",
  },
} as const;

/**
 * Section 7: Masks
 * Source: CDC/NIOSH & Cherrie et al. 2018
 * Status: SOURCED
 * Real-world fit: active inward leakage 7% to 66% => reduction 34% to 93%
 */
export const MASK_PROTECTION = {
  section: "7",
  status: "SOURCED",
  activeLeakageMin: 0.07, // 7%
  activeLeakageMax: 0.66, // 66%
  activeReductionMin: 0.34, // 34% (1 - 0.66)
  activeReductionMax: 0.93, // 93% (1 - 0.07)
} as const;

/**
 * Section 8: Cleanest and dirtiest hours context
 * Source: Singh, Singh & Biswal 2020; Latha & Badarinath 2005
 * Status: SOURCED
 */
export const DIURNAL_PATTERNS = {
  section: "8",
  status: "SOURCED",
  cleanestTypicalHours: "15:00-16:00",
  dirtiestTypicalHours: "08:00-10:00",
} as const;

/**
 * Section 9: Transport CO2 emission factors
 * Source: India GHG Program (2015)
 * Status: SOURCED (with uplift for real-world driving)
 * Values in kg CO2 per vehicle-km, except bus which is per passenger-km.
 */
export type TravelMode =
  | "petrol_car_small"
  | "petrol_car"
  | "petrol_sedan"
  | "diesel_car"
  | "diesel_sedan"
  | "cng_car"
  | "scooter"
  | "motorcycle"
  | "auto"
  | "bus"
  | "metro"
  | "walk_cycle";

export interface TravelModeEmissionMeta {
  readonly mode: TravelMode;
  readonly kgCo2PerKm: number;
  readonly unit: "per-vehicle-km" | "per-passenger-km";
  readonly section: "9";
  readonly status: "SOURCED" | "CHOSEN";
}

export const TRANSPORT_CO2_FACTORS: Record<
  Exclude<TravelMode, "metro" | "walk_cycle">,
  TravelModeEmissionMeta
> = {
  petrol_car_small: {
    mode: "petrol_car_small",
    kgCo2PerKm: 0.127,
    unit: "per-vehicle-km",
    section: "9",
    status: "SOURCED",
  },
  petrol_car: {
    mode: "petrol_car",
    kgCo2PerKm: 0.14,
    unit: "per-vehicle-km",
    section: "9",
    status: "SOURCED",
  },
  petrol_sedan: {
    mode: "petrol_sedan",
    kgCo2PerKm: 0.153,
    unit: "per-vehicle-km",
    section: "9",
    status: "SOURCED",
  },
  diesel_car: {
    mode: "diesel_car",
    kgCo2PerKm: 0.126,
    unit: "per-vehicle-km",
    section: "9",
    status: "SOURCED",
  },
  diesel_sedan: {
    mode: "diesel_sedan",
    kgCo2PerKm: 0.141,
    unit: "per-vehicle-km",
    section: "9",
    status: "SOURCED",
  },
  cng_car: {
    mode: "cng_car",
    kgCo2PerKm: 0.068,
    unit: "per-vehicle-km",
    section: "9",
    status: "SOURCED",
  },
  scooter: {
    mode: "scooter",
    kgCo2PerKm: 0.0368,
    unit: "per-vehicle-km",
    section: "9",
    status: "SOURCED",
  },
  motorcycle: {
    mode: "motorcycle",
    kgCo2PerKm: 0.0319,
    unit: "per-vehicle-km",
    section: "9",
    status: "SOURCED",
  },
  auto: {
    mode: "auto",
    kgCo2PerKm: 0.10768,
    unit: "per-vehicle-km",
    section: "9",
    status: "SOURCED",
  },
  bus: {
    mode: "bus",
    kgCo2PerKm: 0.015161,
    unit: "per-passenger-km",
    section: "9",
    status: "SOURCED",
  },
};

/**
 * Metro reduction factor: saves 97% CO2 compared to car/two-wheeler
 * Section 9: SOURCED (Hyderabad Metro operator claim via news report; approximate)
 */
export const METRO_SAVING_FRACTION = 0.97;

/**
 * Winter duration in weeks (Nov-Feb = 17 weeks)
 * Section 9: CHOSEN
 */
export const WINTER_WEEKS = 17;

/**
 * Grid electricity baseline (CEA August 2026)
 * Section 9: SOURCED
 */
export const GRID_ELECTRICITY_KG_CO2_PER_KWH = 0.675;
