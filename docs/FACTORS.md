# SaafSaans: figures and sources

Every number SaafSaans shows comes from this file. `src/shared/factors.ts` copies these values, and
each constant names the section it came from. Researched 19 November 2026.

**Status labels**
- **SOURCED:** the value is stated in the source (quote given).
- **CHOSEN:** a default we picked inside a published range; the app's "How we worked this out"
  panel must say it is an estimate.
- **NOT VERIFIED:** no credible source found. Do not use it for a number; advice text only.

---

## 1. India's National AQI (CPCB)

**Source:** CPCB, *National Ambient Air Quality Status & Trends 2019* (NAAQMS/45/2019-2020), §8.5.
https://static.pib.gov.in/WriteReadData/userfiles/NAAQS.pdf · Status: **SOURCED**

| Band | AQI | PM2.5, 24 h (µg/m³) | PM10, 24 h (µg/m³) | CPCB health statement |
|---|---|---|---|---|
| Good | 0–50 | 0–30 | 0–50 | "Minimal Impact" |
| Satisfactory | 51–100 | 31–60 | 51–100 | "May cause minor breathing discomfort to sensitive people." |
| Moderately polluted | 101–200 | 61–90 | 101–250 | "May cause breathing discomfort to people with lung disease such as asthma, and discomfort to people with heart disease, children and older adults." |
| Poor | 201–300 | 91–120 | 251–350 | "May cause breathing discomfort to people on prolonged exposure, and discomfort to people with heart disease" |
| Very Poor | 301–400 | 121–250 | 351–430 | "May cause respiratory illness to the people on prolonged exposure. Effect may be more pronounced in people with lung and heart diseases." |
| Severe | 401–500 | 250+ | 430+ | "May cause respiratory effects even on healthy people and serious health impacts on people with lung/heart diseases. The health impacts may be experienced even during light physical activity" |

**How the app uses it:** the outdoor AQI number comes from the Google Air Quality API (India's local
AQI). These breakpoints are used only to label our *indoor* PM2.5 estimate with a band name (shown
as "about", since the breakpoints are 24-hour averages). The health statements are shown word for
word; the app writes no health wording of its own beyond the fixed "see a doctor if" text.

**Note:** the report's text calls the third band "Moderate" and its table "Moderately polluted".
Use "Moderately polluted" in the UI.

## 2. Breathing rates by age and activity

**Source:** US EPA, *Exposure Factors Handbook* (2011), Chapter 6, Table 6-2, "Recommended
Short-Term Exposure (Less Than 30 Days) Values for Inhalation (Males and Females Combined)", mean
values. https://www.epa.gov/sites/default/files/2015-06/documents/efh_highlights_chap6.pdf (full
chapter: https://www.epa.gov/sites/default/files/2015-09/documents/efh-chapter06.pdf)
Status: **SOURCED** (read from the Highlights version)

Mean inhalation rate, **m³ per minute** (multiply by 60 for m³ per hour):

| Age (years) | Sleep or nap | Sedentary | Light | Moderate | High |
|---|---|---|---|---|---|
| 3 to <6 | 0.0043 | 0.0045 | 0.011 | 0.021 | 0.037 |
| 6 to <11 | 0.0045 | 0.0048 | 0.011 | 0.022 | 0.042 |
| 11 to <16 | 0.0050 | 0.0054 | 0.013 | 0.025 | 0.049 |
| 21 to <31 | 0.0043 | 0.0042 | 0.012 | 0.026 | 0.050 |
| 31 to <41 | 0.0046 | 0.0043 | 0.012 | 0.027 | 0.049 |
| 41 to <51 | 0.0050 | 0.0048 | 0.013 | 0.028 | 0.052 |
| 61 to <71 | 0.0052 | 0.0049 | 0.012 | 0.026 | 0.047 |
| 71 to <81 | 0.0053 | 0.0050 | 0.012 | 0.025 | 0.047 |

**App age bands → table row (CHOSEN where the table row was not fetched):**

| App band | Table row | Status |
|---|---|---|
| Under 6 | 3 to <6 | CHOSEN for under-3s (table has rows for them; not fetched) |
| 6–10 | 6 to <11 | SOURCED |
| 11–15 | 11 to <16 | SOURCED |
| 16–30 | 21 to <31 | CHOSEN for 16–20 (16 to <21 row not fetched) |
| 31–40 | 31 to <41 | SOURCED |
| 41–60 | 41 to <51 | CHOSEN for 51–60 (51 to <61 row not fetched) |
| 61–70 | 61 to <71 | SOURCED |
| 71+ | 71 to <81 | SOURCED |

**Activity for each routine block (CHOSEN):** sleep → sleep; at home → sedentary; office →
sedentary; school → light; in a car, bus, auto or metro → sedentary; walking or cycling → light
for a commute, moderate for a walk; running, sport or a brisk workout → high; outdoor work →
light, or moderate for physical labour.

To fill the missing rows, read Table 6-2 in the full chapter and add them here.

## 3. Cigarette equivalence

**Source:** Muller & Muller, Berkeley Earth, *Air Pollution and Cigarette Equivalence*
(December 2015). https://berkeleyearth.org/air-pollution-and-cigarette-equivalence/
Status: **SOURCED**

> "Here is the rule of thumb: one cigarette per day is the rough equivalent of a PM2.5 level of
> 22 μg/m3."

**How the app uses it:** cigarettes' worth for a day = the person's 24-hour average PM2.5 exposure
(time-weighted across where they were) ÷ 22. Cigarettes avoided = the change in that average ÷ 22.

**Caveats to show in "How we worked this out":** a rough, health-risk-based comparison (from death
rates, not inhaled dose); a non-peer-reviewed memo; the authors call it "rough".

## 4. Indoor air from outdoor air (single-room model)

Steady-state mass balance for PM2.5 of outdoor origin:

```
C_in = P × a × C_out / (a + k + CADR / V)
```

`P` penetration factor, `a` air changes per hour from outside, `k` deposition rate (per hour),
`CADR / V` purifier clean-air delivery rate ÷ room volume (per hour). Indoor sources (§6) are not
in this formula; they are shown as separate facts.

| Parameter | Value used | Range in the source | Status | Source |
|---|---|---|---|---|
| `P` | 0.97 | mean 0.97 (SD 0.06), windows closed | SOURCED as an assumed value in that paper (taken from Fisk & Chan 2017) | Xiang et al. 2021, *Sci Total Environ* 773:145642, https://pmc.ncbi.nlm.nih.gov/articles/PMC8026580/ |
| `k` | 0.3 per hour | 0.10–0.49 per hour, measured | CHOSEN in range | Xiang et al. 2021 (as above): "The deposition rate, k d, ranged from 0.10 (0.54) h−1 to 0.49 (0.47) h−1." |
| `a`, windows mostly shut | 1.5 per hour | Delhi homes, annual mean 1.5, daily range 0.3–4.5 (modelled) | SOURCED (modelled, Indian) | Liao et al. 2019, *IJERPH*, https://pmc.ncbi.nlm.nih.gov/articles/PMC6518106/: "annual mean AER of 1.5/h (daily range 0.3 to 4.5/h) for residential homes in Delhi" |
| `a`, windows open | 5 per hour | 2.5–5.1 measured at roadside homes near Agra (cited by Liao 2019; not read directly); 6.77 in one Seattle home (Xiang 2021, low confidence) | CHOSEN in range | Liao et al. 2019; Xiang et al. 2021 |

"Windows open in the day" uses the open rate during daytime hours and the shut rate otherwise.

**Supporting:** Du et al. 2012, *IJERPH*, 126 Detroit homes, living-area air change "averaged
0.73 ± 0.76 h(-1)" and "Opening windows can increase the ACR as much as 2 h−1".
https://pmc.ncbi.nlm.nih.gov/articles/PMC3546781/

**NOT VERIFIED:** a direct air-change measurement in Indian homes, and the specific values in
Riley et al. 2002 and Long et al. 2001.

**What the model implies (sanity check for tests):** with no purifier, shutting windows lowers indoor
PM2.5 only from about 0.92 to about 0.81 of outdoor; a correctly sized purifier with windows shut
takes it to roughly 0.2 of outdoor. That contrast is one of the app's key messages.

## 5. Purifier sizing

**Sources:**
- AHAM, https://ahamverifide.org/ahams-air-filtration-standards/: "As a rule of thumb, the CADR of
  your air cleaner should be equal to at least two-thirds of the room's area." and "If your
  ceilings are higher than 8 feet, an air cleaner rated for a larger room will be necessary."
- US EPA, *Guide to Air Cleaners in the Home*, 2nd ed.,
  https://www.epa.gov/sites/default/files/2018-07/documents/guide_to_air_cleaners_in_the_home_2nd_edition.pdf:
  room area → minimum CADR 100 ft² → 65 cfm, 200 → 130, 300 → 195, 400 → 260, 500 → 325,
  600 → 390; "The CADRs are calculated based on an 8-foot ceiling."

Status: **SOURCED**

**How the app uses it:** minimum CADR (cfm) = ⅔ × room area (ft²) × (ceiling height ÷ 8 ft).
Indian rooms are often 10 ft high, so the height scaling matters; say so in the explanation.
Conversions: 1 cfm = 1.699 m³/h; 1 m² = 10.764 ft².

**Air changes per hour from the rule:** NOT VERIFIED as a published figure. The arithmetic gives
(⅔ × 60) ÷ 8 = 5.0 per hour, and EPA's table about 4.9; label it "about 5 air changes an hour" (approximate) if shown.

## 6. Indoor sources (shown as facts, not computed into the dose)

| Source | Figure | Status | Reference |
|---|---|---|---|
| Mosquito coil | "burning one mosquito coil would release the same amount of PM(2.5) mass as burning 75-137 cigarettes" (emitted mass, not health effect) | SOURCED | Liu et al. 2003, *Environ Health Perspect* 111(12):1454, doi:10.1289/ehp.6286, https://pmc.ncbi.nlm.nih.gov/articles/PMC1241646/ |
| Incense | "in one test house, burning incense raised indoor PM2.5 to 197 µg/m³" (measured in an experimental house, not a typical peak) | SOURCED (abstract) | Ji et al. 2010, *Indoor Air*, doi:10.1111/j.1600-0668.2009.00634.x |
| Incense (supporting) | Incense had "the highest 5-min PM2.5 increments (15.0 µg/m3) to indoor levels, among all single sources" | SOURCED (abstract) | Lung et al. 2021, https://pmc.ncbi.nlm.nih.gov/articles/PMC8247015/ |
| Frying | Median 4.5 mg/m³ PM2.5 with no ventilation vs 0.5 mg/m³ with the stove hood on (2-hour sample, pan-frying) | SOURCED | Lee, Yu & Kim 2017, *IJERPH* 14:78, https://pmc.ncbi.nlm.nih.gov/articles/PMC5295329/ |
| Cooking (supporting) | Cooking PM2.5 "peaked 1-7 min after cooking at levels of 200-1400 μg/m3" | SOURCED | Xiang et al. 2021, https://pmc.ncbi.nlm.nih.gov/articles/PMC8224830/ |
| Wet mopping vs dry sweeping | Indirect only: lead-dust study (dry sweeping raised airborne lead 65–220%, wet sweeping at most 22%), and an observational link between mopping and lower indoor PM2.5 | NOT VERIFIED for PM2.5; advice only | Grinshpun et al. 2002, *JAWMA*, PMID 11871758; Kim et al. 2023, *Sci Rep*, https://pmc.ncbi.nlm.nih.gov/articles/PMC10361977/ |

**How the app uses it:** `no-mosquito-coil`, `incense-outside` and `cook-with-exhaust` show the
sourced figure as a fact ("one coil releases as much PM2.5 as 75 to 137 cigarettes"; "in one test house, burning incense raised indoor PM2.5 to 197 µg/m³"; "frying without a stove hood reached median 4.5 mg/m³ PM2.5 vs 0.5 mg/m³ with it on"), not as a
computed change in the family's dose. `wet-mop` is advice only.

## 7. Masks

| Figure | Status | Source |
|---|---|---|
| NIOSH N95: "Filters at least 95% of airborne particles. Not resistant to oil." | SOURCED (search excerpt; re-check the page) | CDC/NIOSH, https://www.cdc.gov/niosh/ppe/niosh-approved-respirators/ffr-cel.html |
| Real-world fit: average total inward leakage 3%–68% sitting and 7%–66% active, across masks sold to the public; "Only one mask type tested showed an average TIL of less than 10%" | SOURCED | Cherrie et al. 2018, *Occup Environ Med*, doi:10.1136/oemed-2017-104765, https://pmc.ncbi.nlm.nih.gov/articles/PMC5969371/ |

**How the app uses it:** never a single number. Show the cut in exposure as a range: about 34% to
93% while active (from the 7–66% leakage), with "a well-fitted N95 is at the top of that range;
a loose mask at the bottom". Caveat: chamber test with diesel exhaust, not a street measurement.

## 8. Cleanest and dirtiest hours

| Finding | Status | Source |
|---|---|---|
| "The lowest level of PM2.5 during a day for all the cities is found in late afternoon hours (~15:00–16:00 h) due to higher PBLH"; "morning peaks (~08:00-10:00 h)"; winter is "the most polluted season for all the cities" (US Embassy and Consulate monitors 2014–2019, Hyderabad included) | SOURCED | Singh, Singh & Biswal 2020, *Sci Total Environ* 750:141461, https://pmc.ncbi.nlm.nih.gov/articles/PMC7417276/ |
| Hyderabad: PM peaks at 03:00, 10:00 and 20:00 local time | SOURCED (abstract; older data, not winter-specific) | Latha & Badarinath 2005, *Int J Environ Health Res*, doi:10.1080/09603120400018964 |
| "greater concentrations at night than in the afternoon. This pattern was also evident in 19 of 23 LMIC cities." | SOURCED | Dobson et al. 2021, *IJTLD*, https://pmc.ncbi.nlm.nih.gov/articles/PMC7948758/ |

**How the app uses it:** the windows themselves always come from the live forecast. These sources
back the explanation ("afternoons are usually cleanest because the air mixes higher").

---

## 9. Transport CO₂ factors

**Source:** India GHG Program (WRI India, CII, TERI), *India Specific Road Transport Emission
Factors* (2015). https://shaktifoundation.in/wp-content/uploads/2017/06/WRI-2015-India-Specific-Road-Transport-Emission-Factors.pdf
(release: https://indiaghgp.org/road-transport-emission-factors) · Status: **SOURCED**

Use the "with uplift" column (real-world driving; cars +8%, two-wheelers +10%) where the report
gives one. Values are kg CO₂ per **vehicle**-km unless marked per passenger-km.

| App travel mode | Report row | kg CO₂/km (base / with uplift) | Value used |
|---|---|---|---|
| Petrol car, small | Petrol hatchback <1000 cc | 0.117 / 0.127 | 0.127 |
| Petrol car (default) | Petrol hatchback <1400 cc | 0.130 / 0.140 | 0.140 |
| Petrol sedan | Petrol sedan <1400 cc | 0.142 / 0.153 | 0.153 |
| Diesel car | Diesel hatchback <1400 cc | 0.117 / 0.126 | 0.126 |
| Diesel sedan | Diesel sedan <1600 cc | 0.131 / 0.141 | 0.141 |
| CNG car | Small <800 cc CNG | 0.063 / 0.068 | 0.068 |
| Scooter | Scooter <110 cc | 0.0334 / 0.0368 | 0.0368 |
| Motorcycle | Motorcycle <125 cc | 0.0290 / 0.0319 | 0.0319 |
| Auto-rickshaw (CNG) | Three-wheeler CNG | 0.10768 | 0.10768 |
| City bus | Bus, per **passenger**-km: "The calculated emission factor for bus transport is 0.015161 kg CO2/pax-km." (diesel intra-city average; not BRTS) | 0.015161 | 0.015161 |
| Walk, cycle | — | 0 | 0 |

**Metro:** a per-passenger-km factor is **NOT VERIFIED**. What exists:
- Hyderabad Metro Rail reprints a Times of India report of a FY2023 study: "a 30-km metro trip
  produces 97% less CO2 than a car and 98% less than a bus".
  https://hmrl.co.in/lowest-carbon-footprint-a-truly-environment-friendly-transit/ Status:
  **SOURCED (operator's claim via a news report; approximate)**.
- Delhi Metro (TERI): "a passenger saves about 32.38 grams of CO2 per kilometer" against road
  vehicles. https://delhimetrorail.com/carbonlite-metro-travel (a saving against a road mix, not
  the metro's own figure, so not used).

**How the app uses it:**
- Car or two-wheeler → bus: saved = distance × (vehicle factor ÷ people sharing − 0.015161).
- Car or two-wheeler → metro: saved = distance × vehicle factor ÷ people sharing × 0.97 (Hyderabad
  Metro's own claim, labelled approximate).
- Carpool: each person's share = vehicle factor ÷ people in the car.
- Walk or cycle: saved = distance × vehicle factor ÷ people sharing.
- Report per day, per week (working days the household gives) and per winter (Nov–Feb, 17 weeks,
  CHOSEN).

**Grid electricity (for an electric-vehicle or induction note, if used):** CEA CO₂ Baseline
Database, Version 22.0 (August 2026), weighted average including renewables, 2025-26:
**0.675 kg CO₂/kWh** (2024-25: 0.710).
https://cea.nic.in/api/cdm-report-version/view-pdf/en/82 · Status: **SOURCED**

## 10. Transport exhaust PM factors

**NOT VERIFIED.** The ARAI emission factor report (2007/2008) could not be opened. One lead to check
later, from a search summary only: a Lok Sabha answer annexure
(https://eparlib.nic.in/bitstream/123456789/1469022/1/AU662.pdf) reportedly lists ARAI figures of
about 0.482 g/km for a BS-III diesel bus over 5000 cc and about 0.001 g/km for a BS-III petrol car
under 1600 cc, with no two- or three-wheeler rows.

**How the app uses it:** no exhaust PM numbers. "Pollute less" cards show **vehicle-km taken off
the road** (a direct count) and **CO₂ avoided** (§9), with the Hyderabad source context in §11.

## 11. Hyderabad context

| Fact | Status | Source |
|---|---|---|
| Winter (Oct 2024 to Jan 2025) seasonal average PM2.5 of 52 µg/m³; highest daily city value 89 µg/m³ (25 Nov 2024); only Sanathnagar had any "poor" days (8); other stations stayed Good to Moderate. Based on CPCB real-time data. | SOURCED | Centre for Science and Environment, *Winter pollution crisis in megacities of India: Going beyond Delhi* (March 2025), https://www.cseindia.org/content/downloadreports/12646 |
| CPCB stations named in that report: Sanathnagar, Central University, ICRISAT Patancheru, IDA Pashamylaram, Bollaram, Zoo Park, New Malakpet, IITH Kandi, Somajiguda, Ramachandrapuram | SOURCED | CSE (as above) |
| "PM10 pollution was mainly caused by vehicles (49 per cent) followed by road dust (33 per cent)" (pollution control board researchers, 2016 data) | SOURCED via news (medium confidence; original study not read) | Deccan Chronicle, https://www.deccanchronicle.com/lifestyle/pets-and-environment/220816/hyderabads-deadly-pm10-pollutant-particles-level-still-high.html |
| "Road dust and vehicular were among the major sources" (TSPCB and IIT Kanpur study, 2023) | SOURCED via news (medium confidence) | Telangana Today, https://telanganatoday.com/road-dust-found-to-be-main-contributor-to-particulate-matter-pollution-in-hyderabad |

**What a live demo will show:** on India's AQI, Hyderabad winter days are usually Satisfactory to
Moderately polluted, with occasional Poor days at hotspots. The demo story is therefore about
sensitive people at home (CPCB's own statement for the Moderate band names asthma, heart disease,
children and older adults), with the Delhi household for the Severe case.

**How the app uses it:** context lines in explanations only ("in Hyderabad, vehicles and road dust
are the biggest sources of particle pollution"), always with the source link.

## 12. Google API facts the build relies on (checked 19 November 2026)

Not figures for users, but facts the code depends on. Re-check the docs if something fails.

**Air Quality API** (https://developers.google.com/maps/documentation/air-quality/overview)
- Endpoints: current conditions, hourly forecast "up to a maximum of 96 hours (4 days)", history
  "up to a maximum of 30 days", heatmap tiles.
- `extraComputations`: `LOCAL_AQI`, `HEALTH_RECOMMENDATIONS`, `POLLUTANT_ADDITIONAL_INFO`,
  `DOMINANT_POLLUTANT_CONCENTRATION`, `POLLUTANT_CONCENTRATION`.
- India's index: local AQI code `ind_cpcb` (https://developers.google.com/maps/documentation/air-quality/laqis).
- Health recommendation groups: `generalPopulation`, `elderly`, `lungDiseasePopulation`,
  `heartDiseasePopulation`, `athletes`, `pregnantWomen`, `children`. These map onto household
  members, so each person can see Google's advice for their group.
- Pricing in India: "Air Quality Usage (India)" free up to 70,000 a month, then $0.50 per 1,000
  (https://developers.google.com/maps/billing-and-pricing/pricing-india).

**Routes API** (https://developers.google.com/maps/documentation/routes)
- Travel modes: `DRIVE`, `TWO_WHEELER`, `TRANSIT`, `WALK`, `BICYCLE`. `TWO_WHEELER`, `WALK` and
  `BICYCLE` are beta, and **the app must show users a warning** on those routes. India is supported
  for two-wheeler routing and for eco-friendly (fuel-efficient) routes.
- Transit in Hyderabad: NOT VERIFIED; test it in Phase 3. If it returns nothing, use the driving
  distance for the metro and bus swaps and say so.

**Gemini API** (docs now at https://aistudio.google.com/docs)
- Structured output: the docs recommend the Interactions API with a JSON schema in
  `response_format`; `generateContent` with `responseMimeType: "application/json"` and
  `responseJsonSchema` still works but is labelled legacy
  (https://aistudio.google.com/docs/structured-output).
- Models listed on 19 November 2026: the docs recommend "Gemini 4 Hydrogen or 3.5 Flash-Lite" for
  new projects; stable ids include `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`,
  `gemini-3.1-flash-lite` (https://aistudio.google.com/docs/models). The id goes in `GEMINI_MODEL`.
- Free-tier rate limits: NOT VERIFIED officially. Forum reports put the larger Flash model at about
  20 requests a day and Flash-Lite at about 500 a day. Check your own limits in AI Studio; plan
  caching, the deterministic fallback and demo mode exist partly for this.
- Hindi and Telugu output quality: NOT VERIFIED in the docs. Test it with a native reader in
  Phase 4.
