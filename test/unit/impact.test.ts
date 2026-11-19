import { describe, expect, it } from "vitest";
import {
  aqiBandFromPm25,
  cigarettesEquivalent,
  cleanestAndDirtiestWindows,
  communityTotal,
  commuteCo2Saved,
  dailyAverageExposure,
  dailyDose,
  indoorPm25,
  indoorRatio,
  inhalationRate,
  maskSavingRange,
  minPurifierCadr,
  vehicleKmAvoided,
} from "../../src/shared/impact";

describe("src/shared/impact", () => {
  describe("Hand-worked reference values from user prompt", () => {
    // 1. indoor ratio, windows open, no purifier: 0.915094
    it("1. indoor ratio, windows open, no purifier: 0.915094", () => {
      const res = indoorRatio({ windowsOpen: true });
      expect(res.ratio).toBeCloseTo(0.915094, 6);
      expect(res.isEstimate).toBe(true);
      expect(res.factorSections).toContain("4");
    });

    // 2. indoor ratio, windows shut, no purifier: 0.808333
    it("2. indoor ratio, windows shut, no purifier: 0.808333", () => {
      const res = indoorRatio({ windowsOpen: false });
      expect(res.ratio).toBeCloseTo(0.808333, 6);
      expect(res.isEstimate).toBe(true);
      expect(res.factorSections).toContain("4");
    });

    // 3. minimum purifier CADR: 12 x 12 ft room with a 10 ft ceiling, 120 cfm; 10 x 10 ft room with an 8 ft ceiling, 66.6667 cfm
    it("3. minimum purifier CADR: 12x12 ft (10ft ceiling) = 120 cfm, 10x10 ft (8ft ceiling) = 66.6667 cfm", () => {
      const res1 = minPurifierCadr(144, 10);
      expect(res1.minCadrCfm).toBeCloseTo(120, 4);

      const res2 = minPurifierCadr(100, 8);
      expect(res2.minCadrCfm).toBeCloseTo(66.6667, 4);
    });

    // 4. indoor ratio, windows shut, 120 cfm purifier in a 1,440 cubic ft room: 0.213971
    it("4. indoor ratio, windows shut, 120 cfm purifier in 1,440 cu ft room: 0.213971", () => {
      const res = indoorRatio({
        windowsOpen: false,
        cadrCfm: 120,
        roomVolumeCuFt: 1440,
      });
      expect(res.ratio).toBeCloseTo(0.213971, 6);
    });

    // 5. inhalation rate: age 61-70 moderate, 1.56 m3/h; age 31-40 sedentary, 0.258 m3/h
    it("5. inhalation rate: age 61-70 moderate, 1.56 m3/h; age 31-40 sedentary, 0.258 m3/h", () => {
      const res1 = inhalationRate("61-70", "moderate");
      expect(res1.rateM3PerHour).toBeCloseTo(1.56, 4);

      const res2 = inhalationRate("31-40", "sedentary");
      expect(res2.rateM3PerHour).toBeCloseTo(0.258, 4);
    });

    // 6. a 45-minute walk, age 61-70, moderate: at 80 µg/m3 the dose is 93.6 µg, at 40 µg/m3 it is 46.8 µg, so moving it saves 46.8 µg
    it("6. 45-minute walk, age 61-70, moderate: at 80 µg/m3 is 93.6 µg, at 40 is 46.8 µg, saving 46.8 µg", () => {
      const dose80 = dailyDose([
        {
          concentrationUgM3: 80,
          durationHours: 0.75, // 45 minutes
          ageBand: "61-70",
          activity: "moderate",
        },
      ]);
      expect(dose80.doseUg).toBeCloseTo(93.6, 4);

      const dose40 = dailyDose([
        {
          concentrationUgM3: 40,
          durationHours: 0.75,
          ageBand: "61-70",
          activity: "moderate",
        },
      ]);
      expect(dose40.doseUg).toBeCloseTo(46.8, 4);
      expect(dose80.doseUg - dose40.doseUg).toBeCloseTo(46.8, 4);
    });

    // 7. 8 hours asleep in that bedroom, outdoor PM2.5 80, windows shut: indoor 64.6667 without the purifier and 17.1176 with it; the daily average exposure falls by 15.8497 µg/m3, which is 0.7204 cigarettes a day
    it("7. 8 hours asleep in bedroom, outdoor PM2.5 80, windows shut: indoor 64.6667 without purifier and 17.1176 with it, daily avg exposure falls by 15.8497, 0.7204 cigarettes", () => {
      const withoutPurifier = indoorPm25(80, {
        windowsOpen: false,
      });
      expect(withoutPurifier.indoorPm25).toBeCloseTo(64.6667, 4);

      const withPurifier = indoorPm25(80, {
        windowsOpen: false,
        cadrCfm: 120,
        roomVolumeCuFt: 1440,
      });
      expect(withPurifier.indoorPm25).toBeCloseTo(17.1176, 4);

      // Daily exposure reduction over 24h where 8h is spent in this bedroom and rest is constant:
      // (64.666667 - 17.117647) * 8 / 24 = 15.849673
      const avgWithout = dailyAverageExposure([
        { concentrationUgM3: withoutPurifier.indoorPm25, durationHours: 8 },
        { concentrationUgM3: 0, durationHours: 16 }, // remaining hours
      ]);
      const avgWith = dailyAverageExposure([
        { concentrationUgM3: withPurifier.indoorPm25, durationHours: 8 },
        { concentrationUgM3: 0, durationHours: 16 },
      ]);
      const diffAvg = avgWithout.averageConcentrationUgM3 - avgWith.averageConcentrationUgM3;
      expect(diffAvg).toBeCloseTo(15.8497, 4);

      const cigsSaved = cigarettesEquivalent(diffAvg);
      expect(cigsSaved.cigarettes).toBeCloseTo(0.7204, 4);
    });

    // 8. a 24-hour average exposure of 66 µg/m3 is 3.0 cigarettes
    it("8. a 24-hour average exposure of 66 µg/m3 is 3.0 cigarettes", () => {
      const res = cigarettesEquivalent(66);
      expect(res.cigarettes).toBeCloseTo(3.0, 4);
    });

    // 9. petrol car (0.140 kg/km) for 32 km a day replaced by metro: 4.3456 kg CO2 a day, 21.728 a week (5 days), 369.376 a winter (17 weeks); 32 vehicle-km avoided a day
    it("9. petrol car for 32 km replaced by metro: 4.3456 kg/day, 21.728 kg/wk, 369.376 kg/winter, 32 v-km avoided", () => {
      const commuteRes = commuteCo2Saved({
        oldMode: "petrol_car",
        newMode: "metro",
        distanceKm: 32,
        tripsPerDay: 1,
        workingDaysPerWeek: 5,
      });
      expect(commuteRes.kgCo2SavedPerDay).toBeCloseTo(4.3456, 4);
      expect(commuteRes.kgCo2SavedPerWeek).toBeCloseTo(21.728, 4);
      expect(commuteRes.kgCo2SavedPerWinter).toBeCloseTo(369.376, 4);

      const vkmRes = vehicleKmAvoided(32, 1, 5);
      expect(vkmRes.vehicleKmAvoidedPerDay).toBe(32);
      expect(vkmRes.vehicleKmAvoidedPerWeek).toBe(160);
    });

    // 10. the same 32 km by bus instead: 3.994848 kg CO2 a day
    it("10. the same 32 km by bus instead: 3.994848 kg CO2 a day", () => {
      const commuteRes = commuteCo2Saved({
        oldMode: "petrol_car",
        newMode: "bus",
        distanceKm: 32,
        tripsPerDay: 1,
      });
      expect(commuteRes.kgCo2SavedPerDay).toBeCloseTo(3.994848, 6);
    });

    // 11. a carpool of 3 people over the same 32 km: 2.986667 kg a day saved per person
    it("11. carpool of 3 people over 32 km: 2.986667 kg a day saved per person", () => {
      const commuteRes = commuteCo2Saved({
        oldMode: "petrol_car",
        newMode: "carpool",
        distanceKm: 32,
        peopleSharingOld: 1,
        carpoolTotalPassengers: 3,
        tripsPerDay: 1,
      });
      expect(commuteRes.kgCo2SavedPerDay).toBeCloseTo(2.986667, 6);
    });

    // 12. 120 homes each saving 21.728 kg a week: 2,607.36 kg a week
    it("12. 120 homes each saving 21.728 kg a week: 2,607.36 kg a week", () => {
      const commRes = communityTotal(21.728, 120);
      expect(commRes.totalWeeklySaving).toBeCloseTo(2607.36, 2);
      expect(commRes.homesCount).toBe(120);
    });

    // 13. a 1-hour commute at 100 µg/m3, age 31-40, sedentary: dose 25.8 µg; a mask saves between 8.772 and 23.994 µg
    it("13. 1-hour commute at 100 µg/m3, age 31-40, sedentary: dose 25.8 µg; mask saves between 8.772 and 23.994 µg", () => {
      const maskRes = maskSavingRange(100, "31-40", "sedentary", 1);
      expect(maskRes.baseDoseUg).toBeCloseTo(25.8, 4);
      expect(maskRes.minSavedUg).toBeCloseTo(8.772, 4);
      expect(maskRes.maxSavedUg).toBeCloseTo(23.994, 4);
    });
  });

  describe("Edge cases and full coverage", () => {
    it("aqiBandFromPm25 edge cases (boundaries 30, 30.1, 60, 60.1, 90, 90.1, 120, 120.1, 250, 250.1, negative)", () => {
      expect(aqiBandFromPm25(0).band).toBe("Good");
      expect(aqiBandFromPm25(30).band).toBe("Good");
      expect(aqiBandFromPm25(30.1).band).toBe("Satisfactory");
      expect(aqiBandFromPm25(60).band).toBe("Satisfactory");
      expect(aqiBandFromPm25(60.1).band).toBe("Moderately polluted");
      expect(aqiBandFromPm25(90).band).toBe("Moderately polluted");
      expect(aqiBandFromPm25(90.1).band).toBe("Poor");
      expect(aqiBandFromPm25(120).band).toBe("Poor");
      expect(aqiBandFromPm25(120.1).band).toBe("Very Poor");
      expect(aqiBandFromPm25(250).band).toBe("Very Poor");
      expect(aqiBandFromPm25(250.1).band).toBe("Severe");
      expect(aqiBandFromPm25(500).band).toBe("Severe");
      expect(aqiBandFromPm25(1000).band).toBe("Severe");
      expect(aqiBandFromPm25(-10).band).toBe("Good"); // handles negative input
    });

    it("inhalationRate edge cases: unknown age band and all standard age bands", () => {
      // unknown age band should fall back to 31-40
      const unknownRes = inhalationRate("unknown-band", "sedentary");
      expect(unknownRes.rateM3PerHour).toBeCloseTo(0.258, 4);
      expect(unknownRes.isEstimate).toBe(true);

      // under-6 is CHOSEN
      const under6 = inhalationRate("under-6", "sleep");
      expect(under6.isEstimate).toBe(true);
      expect(under6.rateM3PerHour).toBeCloseTo(0.0043 * 60, 4);

      // 6-10 is SOURCED
      const age610 = inhalationRate("6-10", "light");
      expect(age610.isEstimate).toBe(false);

      // 11-15 is SOURCED
      const age1115 = inhalationRate("11-15", "moderate");
      expect(age1115.isEstimate).toBe(false);

      // 16-30 is CHOSEN
      const age1630 = inhalationRate("16-30", "high");
      expect(age1630.isEstimate).toBe(true);

      // 41-60 is CHOSEN
      const age4160 = inhalationRate("41-60", "sedentary");
      expect(age4160.isEstimate).toBe(true);

      // 71-plus is SOURCED
      const age71 = inhalationRate("71-plus", "sleep");
      expect(age71.isEstimate).toBe(false);
    });

    it("dailyDose edge cases: empty blocks, zero duration, negative concentration", () => {
      expect(dailyDose([]).doseUg).toBe(0);

      const res = dailyDose([
        {
          concentrationUgM3: -50,
          durationHours: 2,
          ageBand: "31-40",
          activity: "sedentary",
        },
      ]);
      expect(res.doseUg).toBe(0);
    });

    it("dailyAverageExposure edge cases: empty list, zero total hours", () => {
      expect(dailyAverageExposure([]).averageConcentrationUgM3).toBe(0);
      expect(
        dailyAverageExposure([{ concentrationUgM3: 100, durationHours: 0 }])
          .averageConcentrationUgM3,
      ).toBe(0);
    });

    it("cleanestAndDirtiestWindows edge cases: empty forecast, single-item forecast, 24-hour forecast", () => {
      const emptyRes = cleanestAndDirtiestWindows([]);
      expect(emptyRes.cleanest).toBeNull();
      expect(emptyRes.dirtiest).toBeNull();

      const singleRes = cleanestAndDirtiestWindows([{ hour: 10, pm25: 50 }], 3);
      expect(singleRes.cleanest).not.toBeNull();
      expect(singleRes.cleanest?.averagePm25).toBe(50);
      expect(singleRes.cleanest?.startHour).toBe(10);
      expect(singleRes.dirtiest?.averagePm25).toBe(50);

      // Realistic 24-hour profile
      const forecast = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        pm25: i >= 14 && i <= 16 ? 30 : i >= 7 && i <= 9 ? 120 : 60,
      }));
      const winRes = cleanestAndDirtiestWindows(forecast, 3);
      expect(winRes.cleanest?.startHour).toBe(14);
      expect(winRes.cleanest?.averagePm25).toBe(30);
      expect(winRes.dirtiest?.startHour).toBe(7);
      expect(winRes.dirtiest?.averagePm25).toBe(120);
    });

    it("commuteCo2Saved edge cases: zero distance, walk_cycle newMode, other vehicles", () => {
      const zeroDist = commuteCo2Saved({
        oldMode: "petrol_car",
        newMode: "metro",
        distanceKm: 0,
      });
      expect(zeroDist.kgCo2SavedPerDay).toBe(0);

      // walk_cycle replacement saves 100% of old emission
      const walkRes = commuteCo2Saved({
        oldMode: "scooter",
        newMode: "walk_cycle",
        distanceKm: 10,
        tripsPerDay: 1,
      });
      expect(walkRes.kgCo2SavedPerDay).toBeCloseTo(0.368, 4);

      // diesel sedan
      const dieselRes = commuteCo2Saved({
        oldMode: "diesel_sedan",
        newMode: "metro",
        distanceKm: 10,
        tripsPerDay: 1,
      });
      expect(dieselRes.kgCo2SavedPerDay).toBeCloseTo(0.141 * 10 * 0.97, 4);

      // auto rickshaw
      const autoRes = commuteCo2Saved({
        oldMode: "auto",
        newMode: "bus",
        distanceKm: 10,
        tripsPerDay: 1,
      });
      expect(autoRes.kgCo2SavedPerDay).toBeCloseTo((0.10768 - 0.015161) * 10, 4);
    });

    it("minPurifierCadr with 0 area or height", () => {
      const res = minPurifierCadr(0, 10);
      expect(res.minCadrCfm).toBe(0);
      expect(res.minCadrM3PerHour).toBe(0);
    });

    it("communityTotal with negative or decimal inputs", () => {
      const res = communityTotal(-5, -10);
      expect(res.totalWeeklySaving).toBe(0);
      expect(res.homesCount).toBe(0);

      const res2 = communityTotal(10, 2.7);
      expect(res2.homesCount).toBe(2);
      expect(res2.totalWeeklySaving).toBe(20);
    });
  });
});
