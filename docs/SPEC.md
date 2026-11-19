# SaafSaans: product spec

**Version:** 0.1, 19 November 2026 · **For:** PromptWars Virtual, Challenge 6 (Urban Air Quality Assistant)
**Status:** idea locked (name, demo city Hyderabad, languages English, Hindi, Telugu). Figures and
their sources live in [`FACTORS.md`](FACTORS.md); this file never states a number that isn't there.

---

## 1. The brief (verbatim)

> Create a GenAI-powered assistant that helps families and communities navigate severe winter smog
> and urban air pollution. The application should suggest low-emission daily routines, indoor air
> quality hacks, and sustainable alternatives tailored to their location and lifestyle, while
> clearly explaining the direct impact of their choices.

## 2. Pitch

**SaafSaans ("clean breath"): your family's smog plan, where every swap shows its impact in
numbers.** Tell it where you live and who is at home. It tells you when to go out, how to clean the
air inside, and what each choice changes, for each person and for the city's air.

## 3. Who it is for

- **Families:** a household with members of different sensitivity: children, older people, someone
  with asthma or a heart condition, a pregnancy, someone who works outdoors.
- **Communities:** a housing society, residents' association or school that wants to share a plan
  and see what collective action adds up to.

## 4. Brief → feature map

This table also opens the README, so the evaluator sees alignment first.

| The brief asks for | SaafSaans |
|---|---|
| Severe winter smog, urban pollution | Live air quality on India's National AQI (CPCB scale) and an hourly forecast, from the Google Air Quality API |
| Families and communities | Household profile with each member's age, sensitivity and routine; a community share card with a "homes taking part" multiplier |
| Tailored to location | Place search or "use my location" (rounded to about 1 km); forecast, routes and advice are for that place |
| Tailored to lifestyle | Commute mode and distance, cooking, indoor habits (incense, mosquito coils), home rooms, purifier or not |
| Low-emission daily routines | Today's timeline: the cleanest and dirtiest hours, and when to walk, exercise, run errands and air the house |
| Indoor air quality hacks | Indoor kit: purifier size for each room, when to keep windows shut, DIY fan filter, indoor sources to cut |
| Sustainable alternatives | "Pollute less" swaps: metro, bus, carpool, walking short trips, no idling, no burning waste |
| Clearly explaining the direct impact | Every swap card shows its number (dose cut for named people, or emissions avoided) and a "How we worked this out" panel with the formula and source links |

## 5. The impact model: two lenses

Every swap belongs to one lens and always shows a number.

**Protect: what your family breathes.**
- The day is split into blocks (sleep, home, school or office, commute, outdoors). Each block has a
  place (indoors at home, indoors elsewhere, in traffic, outdoors) and an activity level.
- Outdoor concentration for each hour comes from the forecast. Indoor concentration comes from a
  simple single-room mass-balance model using window habit, purifier and room size (`FACTORS.md` §4).
- **Dose** for each person = sum over blocks of (concentration × breathing rate for their age and
  activity × hours). Breathing rates: `FACTORS.md` §2.
- **Shown as:** percentage cut in that person's dose today, and "cigarettes' worth avoided", from
  the change in their 24-hour average exposure (`FACTORS.md` §3).

**Pollute less: what your household puts into the air.**
- Emissions avoided = trip distance × (factor for the old mode − factor for the new mode) × trips.
  CO₂ in kg, and exhaust PM in grams where a sourced factor exists (`FACTORS.md` §9, §10).
- **Shown as:** per day, per week and per winter; on the community card, multiplied by homes taking
  part.

**Rule: the model never produces a number.** Gemini chooses which swaps fit this family and explains
them in plain words. Every number comes from pure, unit-tested functions in one `impact` module,
using factors from one `factors` file that cites its sources. Numbers the model returns are
ignored.

## 6. User flow

1. **Start.** One sentence on what the app does. Two buttons: "Try a Hyderabad family" (demo, no
   setup) and "Set up my household". Language switch: English, हिन्दी, తెలుగు.
2. **Location.** Place search (Google Places Autocomplete) or "use my location". Coordinates are
   rounded to about 1 km before they leave the browser.
3. **Household** (one short form, presets for common routines):
   - Members: a nickname (optional), age band, sensitivity (asthma or COPD, heart condition,
     pregnancy, none), routine preset (school child, office worker, works from home, outdoor
     worker, retired), outdoor exercise time.
   - Travel: commute mode and one-way distance (or start and end, measured with the Routes API).
   - Home: bedroom size, window habit (mostly open, open in the day, mostly shut), purifier and
     its CADR if known, cooking (gas, induction, lots of frying), incense, mosquito coils, smoking.
4. **Today.**
   - **Air now:** the AQI number, band name and an icon (never colour alone), the main pollutant,
     and the CPCB health statement for the most sensitive person at home.
   - **Next 24 to 48 hours:** an hourly strip with the cleanest and dirtiest windows labelled in
     words.
   - **Swap cards**, grouped Protect and Pollute less. Each card: what to do, who it helps, the
     number, one "why" sentence, "How we worked this out", and an "I'll do this" toggle.
   - **Family totals:** each person's dose today with and without the chosen swaps, cigarettes'
     worth avoided, emissions avoided this week. Toggling a swap updates the totals in the browser
     at once, with no extra AI call.
   - **Indoor kit:** purifier size for each room, when to air the house (from the forecast),
     the indoor sources to cut and why.
5. **Share.** WhatsApp-ready text for the family or a society group, with a "homes taking part"
   slider for the community total; calendar file (`.ics`) of the clean-air windows; print view.
6. **Refine.** A short free-text box ("my son has football at 7 am on Saturdays"). Gemini turns it
   into profile changes, which are validated before the plan is recalculated.

## 7. Where AI is used, and where it is not

**Gemini does three jobs, all with schema-constrained JSON output:**
1. **Choose swaps:** from the fixed action catalogue (§8), pick and order up to 6 that apply to
   this household, this place and this forecast. Unknown action ids are dropped.
2. **Explain:** one or two plain sentences for each chosen swap, in the chosen language, and a
   short summary for the family.
3. **Refine:** turn free text into structured profile changes (validated; anything outside the
   profile schema is rejected).

**Code does everything else:** AQI band, forecast windows, indoor concentration, dose, cigarettes'
worth, purifier size, emissions, community totals, the calendar file.

**Guardrails:** user text is wrapped in delimiters and marked untrusted in the system instruction;
Gemini safety settings on; no medical advice, no medicines, and a fixed "see a doctor if" message
(breathlessness, chest pain, wheeze that does not settle) written by us, not the model.

**Without a key or over quota:** the app still works. Demo households, and a deterministic ranking
of the same catalogue with template text, give the same numbers.

## 8. Action catalogue (first cut)

Each action is defined in code with the inputs its impact calculation needs. Gemini only picks from
this list. An action ships only if every number it shows has a source in `FACTORS.md`; otherwise it
shows advice without a number, labelled as such.

| Id | Lens | Swap | Impact computed from |
|---|---|---|---|
| `shift-outdoor-exercise` | Protect | Move the walk, run or yoga to the cleanest window | Forecast, breathing rate (high activity) |
| `exercise-indoors` | Protect | Exercise indoors on Poor or worse days | Indoor model, breathing rate |
| `shut-windows-peak` | Protect | Keep windows shut in the dirtiest hours | Indoor model (air exchange) |
| `air-house-clean-window` | Protect | Air the house in the cleanest window | Forecast, indoor model |
| `purifier-bedroom` | Protect | Run a purifier of the right size in the bedroom at night | Indoor model (CADR), sizing rule |
| `diy-fan-filter` | Protect | Fan-and-filter box when there is no purifier | Advice only unless a sourced CADR figure exists |
| `mask-outdoors` | Protect | Well-fitted N95 for the commute or outdoor work | Mask reduction figure (if sourced) |
| `no-mosquito-coil` | Protect | Use a net or plug-in repellent instead of a coil | Indoor source figure |
| `incense-outside` | Protect | Light incense briefly, by an open window, or not at all | Indoor source figure |
| `cook-with-exhaust` | Protect | Exhaust fan or window open while frying; lids on | Indoor source figure |
| `wet-mop` | Protect | Wet-mop instead of dry sweeping | Advice only unless sourced |
| `metro-not-car` | Pollute less | Metro instead of the car | Emission factors, Routes API distance |
| `bus-not-car` | Pollute less | Bus instead of the car | Emission factors |
| `carpool` | Pollute less | Share the car with colleagues | Emission factors ÷ people |
| `walk-short-trips` | Pollute less | Walk or cycle trips under 2 km, in the cleanest window | Emission factors, forecast |
| `wfh-day` | Pollute less | One work-from-home day a week | Emission factors × commute |
| `no-idling` | Pollute less | Switch off at long signals and pick-ups | Advice only unless sourced |
| `no-burning` | Pollute less | Never burn leaves or rubbish; report burning to the city | Advice only |

## 9. Google services

| Service | What it does here |
|---|---|
| **Gemini API** | Swap choice, explanations, refinement; structured JSON output, system instruction, safety settings; English, Hindi, Telugu |
| **Air Quality API** | Current conditions with India's local AQI, hourly forecast, dominant pollutant; optional heatmap tiles for a map layer |
| **Places API** (Autocomplete) | Location entry |
| **Routes API** | Commute distance and time by mode, for the travel swaps |
| **Cloud Run** (Mumbai region) | Hosting, with the API keys held server-side |
| **Firebase Analytics** (optional) | Aggregate events only (plan made, language), never profile data or location |

## 10. Architecture (recommended)

- **One TypeScript codebase.** A small Node server (Hono or Express) serves the static front end and
  the API. The `impact` and `factors` modules are plain TypeScript, shared by server and browser.
- **API:**
  - `GET /api/air?cell=<rounded lat,lng>` → normalised current AQI and hourly forecast.
  - `GET /api/places?q=<text>` → place suggestions (the server calls Places, so no key in the browser).
  - `POST /api/commute` → distance and time by mode from the Routes API.
  - `POST /api/plan` → `{ profile, cell, lang }` → chosen swaps with computed impacts and text.
  - `POST /api/refine` → `{ profile, text, lang }` → validated profile changes.
  - `GET /healthz`.
- **Caching:** air data per ~1 km cell for 30 minutes; plans by a hash of (profile, AQI band,
  language) for 30 minutes.
- **Limits:** request body 8 KB, refine text 500 characters, per-IP rate limit, a global cap on
  Gemini calls a minute.
- **State:** the profile is kept in the browser's `localStorage` only. No accounts, no database.
- **Front end:** light (vanilla TypeScript or a small framework), translations in `en.json`,
  `hi.json`, `te.json`, Indian number formatting, the `lang` attribute set on AI text.

## 11. Privacy, safety, accessibility

- No accounts, no names required, no data stored on the server. Location rounded before it leaves
  the browser. Logs carry request ids, never profile text.
- Health wording comes from CPCB's own band statements and our fixed "see a doctor if" message.
  The app says plainly that it is not medical advice.
- Accessibility target: WCAG 2.2 AA at least. Air quality is always shown as number, band name and
  icon, never colour alone; full keyboard use; totals that update are announced to screen readers;
  reduced-motion respected; works at 320 px wide and 200% zoom.

## 12. Non-goals

Accounts, a server database, sensor or device integration, a chat-first interface, medical advice,
forecasts we make ourselves, cities outside India.

## 13. Demo households

Hyderabad first; Delhi shows a Severe day. All people are fictional.

| Household | Where | Who | What the demo shows |
|---|---|---|---|
| **The Reddys** | Kukatpally | Father (38) drives a petrol car to HITEC City; mother (35) works from home; son (9) with asthma; grandmother (68) walks in the park at 6 am. Incense daily, mosquito coil at night, no purifier | Moving grandmother's walk, a bedroom purifier, dropping the coil, metro for the commute |
| **Ayesha and Karthik** | Gachibowli | Both in IT, one two-wheeler, morning run; Ayesha is pregnant | Pregnancy sensitivity, run timing, two-wheeler to metro, mask on the ride |
| **The Khans** | Near Charminar | Father drives an auto (outdoors all day); two children walk to school; lots of frying, small home, no purifier | Low-cost swaps only: mask, cooking exhaust, window timing, DIY filter |
| **Green Meadows society** | Kondapur | 120 homes | Community card: carpool group and no burning, multiplied across homes |
| **The Sharmas** | Dwarka, Delhi | Family of four on a Severe day | Shut windows, indoor exercise, purifier sizing at Severe levels |

Note: Hyderabad's winter air is usually milder than Delhi's. The demo makes the point that even a
Moderate day matters for the sensitive people at home (CPCB's own health statement says so), and
the Delhi household shows the Severe case.

## 14. Demo script (90 seconds, for the video, reel and LinkedIn)

1. Open the app in Telugu, pick "Try a Hyderabad family": the Reddys.
2. Air now: today's AQI for Kukatpally, the band, and what it means for their son.
3. Timeline: "the cleanest air today is mid-afternoon, the worst is early morning", the opposite of
   grandmother's 6 am walk.
4. Swap cards: move the walk, a bedroom purifier (size worked out for a 12 × 12 ft room), drop the
   mosquito coil, metro to HITEC City. Toggle them on: totals update live.
5. "How we worked this out": the formula and the source links.
6. Community card for Green Meadows: 120 homes, the weekly total, share to WhatsApp.
7. Switch to the Sharmas in Delhi on a Severe day: same app, very different plan.

## 15. Quality bar (mapped to how submissions are scored)

| Area | Done when |
|---|---|
| Problem alignment | The README opens with §4; every brief phrase has a feature and a screenshot |
| Security | Keys only on the server; every input validated; rate and size limits; CSP, HSTS and other headers; prompt-injection boundary; `SECURITY.md`; no known dependency vulnerabilities; secret scanning in CI |
| Efficiency | Air and plan caching; one Gemini call per plan; what-if toggles cost no AI call; small first load; demo mode makes no model call |
| Testing | Unit tests for every `impact` function against hand-worked examples; server tests with Gemini and Google APIs mocked; automated accessibility checks (axe); a smoke test against the live URL; a coverage floor enforced in CI |
| Accessibility | §11 target met and checked by axe and Lighthouse |
| Code quality | Strict TypeScript, lint and format clean, small single-purpose modules, no dead code, a clear README and architecture note |
| Google services | Each service in §9 used for real and named in the README with where it is used |

## 16. Build order

1. `factors` module and `impact` module with tests (no UI, no AI).
2. Air Quality API client, normalisation and caching, with demo fixtures.
3. Plan endpoint: catalogue filtering, Gemini selection and explanation, deterministic fallback.
4. Front end: start, location, household, today, indoor kit; English first.
5. Hindi and Telugu, share card, `.ics`, refine.
6. Hardening: headers, limits, accessibility pass, coverage, Cloud Run deploy, smoke test.
7. README, screenshots, architecture note, `SECURITY.md`; then the blog post, LinkedIn post and reel.

## 17. Open questions

- Who on the team checks the Hindi and Telugu text? Machine translation alone will read stiffly.
- Map layer (Air Quality heatmap tiles): worth it, or keep the first version map-free?
- Which actions ship without a sourced number (advice only), once `FACTORS.md` is complete?
