# SaafSaans architecture

SaafSaans is one TypeScript codebase: a small Hono server on Google Cloud Run that serves a
plain TypeScript front end and a JSON API. The rule behind every design choice is
**"Gemini decides, code computes"**: Gemini chooses and explains the changes that fit a family;
every number the user sees comes from tested code and published, cited factors.

Live: https://saafsaans-382086946715.asia-south1.run.app

## 1. System overview

```mermaid
flowchart LR
  subgraph Browser["Family's browser (English, Hindi, Telugu)"]
    UI["Home, Setup, Today, Share"]
    SH["src/shared: impact and day model<br/>(recalculates totals when a swap is ticked)"]
    LS[("localStorage<br/>profile and nicknames")]
  end

  subgraph Run["Google Cloud Run, Mumbai (Node 22 + Hono)"]
    MW["Request id and JSON logs<br/>Security headers and CSP<br/>Rate limits, 8 KB body limit"]
    API["/api/air, /api/air/areas<br/>/api/places, /api/commute<br/>/api/plan, /api/refine"]
    PLAN["Plan engine<br/>applicable, compute, rank"]
    CACHE[("In-memory caches<br/>air 30 min, plans 30 min,<br/>commutes 24 h")]
  end

  subgraph Google["Google APIs"]
    AQ["Air Quality API"]
    PL["Places API (New)"]
    RT["Routes API"]
    GM["Gemini API"]
  end

  SM[("Secret Manager<br/>API keys")]

  UI -->|"JSON over HTTPS<br/>coordinates rounded to ~1 km"| MW --> API
  API --> CACHE
  API --> PLAN
  PLAN --> GM
  API --> AQ
  API --> PL
  API --> RT
  SM -. "keys at start-up" .-> Run
  UI --- SH
  UI --- LS
```

## 2. How a plan is made

```mermaid
sequenceDiagram
  participant B as Browser
  participant S as Cloud Run server
  participant A as Air Quality API
  participant G as Gemini API

  B->>S: POST /api/plan (profile with members m1, m2..., rounded location, language)
  S->>S: Validate with Zod, check rate limit
  S->>A: Current conditions and 48-hour forecast (CPCB index), unless cached
  A-->>S: AQI, PM2.5 by hour, health advice per group
  S->>S: Build each member's 24-hour day, compute every applicable swap
  S->>G: Structured fields only (no names, no free text), JSON schema
  G-->>S: Chosen swap ids and short reasons in en, hi or te
  S->>S: Drop unknown ids, reject any reason with a digit, strip dashes and HTML
  S-->>B: Plan: swaps with computed numbers, reasons, CPCB statement, Google advice
  B->>B: Ticking a swap recalculates family totals locally (no new AI call)
```

If Gemini is slow, unavailable or over its per-minute cap, a deterministic ranker returns the
same numbers with template text, so the app never depends on the model to work.

## 3. Where the numbers come from

| Step | Code | Source |
|---|---|---|
| AQI band and health statement | `src/shared/impact/aqi.ts` | CPCB National AQI |
| Indoor PM2.5 from outdoor air | `src/shared/impact/indoor.ts` | Single-room mass-balance model, published ranges |
| Breathing rates and daily dose | `src/shared/impact/dose.ts`, `src/shared/day/` | US EPA Exposure Factors Handbook |
| Cigarettes' worth | `src/shared/impact/dose.ts` | Berkeley Earth |
| Purifier size | `src/shared/impact/purifier.ts` | AHAM and US EPA |
| Transport CO2 | `src/shared/impact/transport.ts` | India GHG Program, Hyderabad Metro |
| Cleanest and dirtiest hours | `src/shared/impact/forecast.ts` | Live forecast; pattern from published studies |

Every constant lives in `src/shared/factors.ts` with the section of `docs/FACTORS.md` that cites
it. Values we chose inside a published range are labelled "Estimate" in the app.

## 4. Code map

```
src/shared/     used by server and browser
  factors.ts      every constant, with its source section
  actions.ts      the swap catalogue (lens, kind, category)
  plan-schema.ts  one Zod contract for the plan response
  impact/         aqi, indoor, dose, mask, purifier, transport, forecast
  day/            24-hour schedules, swap effects, family totals
src/server/
  app.ts          middleware order and static files
  routes/         air, places, commute, plan, refine, demo
  plan/           applicable, compute, rank
  gemini/         the only code that calls Gemini
  air.ts, places.ts, commute.ts   Google API clients (8-second timeouts)
  security.ts, cache.ts, config.ts, log.ts
src/client/
  home/           the guided home page
  app/            setup, today, share, router, local recalculation
  i18n/           en.json, hi.json, te.json
  styles/         dark black and green theme tokens
test/             unit, server, end-to-end (Playwright with axe)
```

## 5. Security and privacy layers

1. **Keys stay on the server:** read from Secret Manager on Cloud Run, sent to Google only in
   request headers, never logged or returned.
2. **Strict headers:** Content-Security-Policy with no inline scripts or styles, HSTS,
   nosniff, a strict referrer policy, and a permissions policy.
3. **Abuse limits:** 60 API requests a minute per IP, 10 a minute for plan and refine, a global
   cap on Gemini calls, an 8 KB body limit and 500 characters for refine text.
4. **Validated input:** Zod schemas at every route; coordinates limited to India and rounded to
   two decimals (about 1 km) before any call, cache key or log.
5. **Model output is untrusted:** schema check, known action ids only, no digits, no HTML, and
   no health advice from the model. Health text comes only from CPCB and Google.
6. **Privacy by design:** no accounts and no database; nicknames never leave the browser;
   logs carry a request id, route, status and duration only.

## 6. Build, test and deploy

```mermaid
flowchart LR
  DEV["main branch on GitHub"] --> CI["GitHub Actions<br/>lint, types, unit tests,<br/>Playwright and axe, Docker smoke,<br/>npm audit, secret scan"]
  DEV --> CB["gcloud run deploy --source<br/>Cloud Build (Dockerfile)"]
  CB --> AR[("Artifact Registry")]
  AR --> CR["Cloud Run, asia-south1<br/>max 3 instances, 512 MiB,<br/>non-root container"]
```

## 7. How it was built

Spec first: `docs/SPEC.md` (what to build), `docs/FACTORS.md` (every figure and its source),
`docs/DESIGN.md` (look, motion and writing rules) and `AGENTS.md` (rules for the coding agent).
Development used Google Antigravity, working phase by phase: the calculations with hand-worked
reference tests first, then live Google data, Gemini, the screens, translations, and hardening.
Each phase was reviewed against the spec before the next one began.
