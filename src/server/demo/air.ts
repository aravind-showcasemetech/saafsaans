import type { NormalisedAirData } from "../../shared/air-types.js";

// Helper to generate 48-hour synthetic curve around a base PM2.5 level
function generateHourlyForecast(
  basePm25: number,
  amplitude: number,
  baseDate = new Date("2026-11-19T12:00:00Z"),
) {
  const items = [];
  for (let i = 0; i < 48; i++) {
    const time = new Date(baseDate.getTime() + i * 3600 * 1000).toISOString();
    // Diurnal variation: peak in morning and evening, lower in afternoon
    const hour = (12 + i + 5.5) % 24; // approx IST hour
    const factor = Math.sin(((hour - 4) / 24) * 2 * Math.PI);
    const pm25 = Math.max(10, Math.round(basePm25 + amplitude * factor));
    // Rough AQI calculation or ind_cpcb approx
    const aqi = Math.round(pm25 * 1.5);
    items.push({
      time,
      pm25,
      aqi,
      isApproximate: false,
    });
  }
  return items;
}

export const kukatpallyDemoAir: NormalisedAirData = {
  currentAqi: 125,
  aqiBand: "Moderately polluted",
  dominantPollutant: "pm25",
  pm25: 68,
  pm10: 112,
  healthRecommendations: {
    generalPopulation:
      "Air quality is acceptable. However, there may be some health concern for a very small number of people.",
    elderly: "Consider reducing prolonged or heavy outdoor exertion.",
    lungDiseasePopulation:
      "People with lung diseases such as asthma should reduce outdoor exertion.",
    heartDiseasePopulation:
      "People with heart disease should monitor for symptoms and reduce exertion.",
    athletes: "Safe for most sports activities, though sensitive individuals should take breaks.",
    pregnantWomen: "Take usual precautions; avoid exercising along heavy traffic corridors.",
    children:
      "Children can participate in outdoor activities but should take breaks if symptoms occur.",
  },
  hourlyForecast: generateHourlyForecast(65, 25),
  isApproximate: false,
};

export const dwarkaDemoAir: NormalisedAirData = {
  currentAqi: 415,
  aqiBand: "Severe",
  dominantPollutant: "pm25",
  pm25: 285,
  pm10: 450,
  healthRecommendations: {
    generalPopulation:
      "Avoid outdoor physical activities. Wear an N95 mask if you must go outdoors.",
    elderly: "Remain indoors and keep windows closed. Run an indoor air purifier.",
    lungDiseasePopulation:
      "Avoid all outdoor activities. Keep quick-relief medications accessible.",
    heartDiseasePopulation: "Avoid physical exertion outdoors. Stay in a clean, filtered room.",
    athletes: "Avoid all outdoor exercise. Move training indoors.",
    pregnantWomen: "Strictly remain indoors and avoid exposure to smoky or unventilated spaces.",
    children: "Children should not engage in outdoor activities. Keep doors and windows closed.",
  },
  hourlyForecast: generateHourlyForecast(280, 70),
  isApproximate: false,
};
