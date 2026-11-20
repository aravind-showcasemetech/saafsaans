# Security

SaafSaans is a public web app with no accounts and no database. It holds two secrets (the Google
Maps Platform key and the Gemini key) and takes a little personal context from each visitor (a
rounded location and a household profile). This file describes what we protect, from whom, and how
each control is tested.

## Reporting a problem

Please open a private security advisory on the GitHub repository rather than a public issue.

## What we protect

| Asset | Where it lives | Why it matters |
|---|---|---|
| `MAPS_API_KEY`, `GEMINI_API_KEY` | Server environment only (`.env` locally, Secret Manager on Cloud Run) | Theft means billed usage and quota exhaustion |
| Visitor location | Rounded to 2 decimal places (about 1 km) in the browser before any request | Precise home location is sensitive |
| Household profile and nicknames | Browser `localStorage`; nicknames never leave the browser | Health conditions and routines are personal |
| Quota for Gemini and Google APIs | Shared by every visitor | One client must not exhaust it for everyone |
| The numbers we show | Computed by tested code from `docs/FACTORS.md` | A model must not be able to invent a figure |

## Threats and controls

| Threat | Control | Where | How it is tested |
|---|---|---|---|
| Key leaks to the browser, a log or a commit | Keys are read only on the server; the browser calls our own `/api/*`; `.env` is git-ignored; gitleaks scans every push | `src/server/config.ts`, `.gitignore`, `.github/workflows/security.yml` | gitleaks job in CI; `test/server/live_data.test.ts` checks config never exposes keys |
| Cross-site scripting | Every dynamic value is HTML-escaped; strict CSP with no inline script or style (`default-src 'self'; script-src 'self'; style-src 'self'; ...; object-src 'none'; frame-ancestors 'none'`) | `src/shared/escape.ts`, `src/server/security.ts` | `test/server/security.test.ts` checks every header on API, health, static and error responses; every Playwright test fails on any CSP violation (`test/e2e/fixtures.ts`) |
| Clickjacking, MIME sniffing, referrer leaks, opener attacks | `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Cross-Origin-Opener-Policy: same-origin`, `Permissions-Policy` allowing only same-origin geolocation | `src/server/security.ts` | `test/server/security.test.ts` |
| Downgrade to plain HTTP | `Strict-Transport-Security: max-age=63072000; includeSubDomains` (two years); Cloud Run serves HTTPS only | `src/server/security.ts` | `test/server/security.test.ts` |
| Oversized or malformed input | Every body and query is validated with Zod; bodies capped at 8 KB; refine text at 500 characters; coordinates limited to India and rounded before any call or log; `lang` limited to `en`, `hi`, `te` | `src/server/api.ts`, `src/server/routes/*` | `test/server/live_data.test.ts` (400 and 413 cases), `test/server/plan_and_refine.test.ts` |
| Abuse and quota exhaustion | Per-IP limits: 60 requests a minute on `/api/*`, 10 a minute on `/api/plan` and on `/api/refine`, answered with 429 and `Retry-After`; a global cap on Gemini calls a minute; air data and plans cached for 30 minutes | `src/server/security.ts`, `src/server/gemini/common.ts`, `src/server/cache.ts` | `test/server/security.test.ts`, `test/server/plan_and_refine.test.ts` (test 8) |
| Spoofed client IP to dodge limits | The client IP is the entry the trusted proxy appended to `X-Forwarded-For`: with `TRUSTED_PROXIES=N` it is the Nth entry from the right. Entries further left are client-written and ignored. With `TRUSTED_PROXIES=0` the header is ignored and the socket address is used | `src/server/security.ts` | `test/server/security.test.ts` (client IP cases) |
| Prompt injection through refine text | User text is wrapped in `<USER_INPUT>` delimiters (any copy of the delimiter in the text is removed) and marked untrusted in the system instruction; the reply must pass `HouseholdProfileSchema`; places can never be changed by the model | `src/server/gemini/refine.ts`, `src/server/routes/refine.ts` | `test/server/plan_and_refine.test.ts` (tests 9 and 10) |
| Model invents numbers, actions or health advice | Gemini only picks ids from the applicable catalogue (unknown ids dropped, at most six) and writes short text; its JSON is validated with Zod; text containing digits is replaced with template text; dashes are removed; every number comes from `src/shared/impact.ts` | `src/server/gemini/plan.ts`, `src/server/routes/plan.ts` | `test/server/plan_and_refine.test.ts` (tests 2 to 6) |
| Personal data in logs | One JSON line per request with request id, method, route pattern (never the raw path), status and duration. No bodies, keys, coordinates, place ids or user text | `src/server/log.ts`, `src/server/app.ts` | `test/server/security.test.ts` (request log cases) |
| Nicknames leave the browser | The browser sends members as `m1`, `m2`; the server rejects any request that carries a nickname | `src/client/app/setup.ts`, `src/server/routes/common.ts` | `test/server/plan_and_refine.test.ts` (test 11) |
| Stale caches of personal pages | HTML and API answers are `Cache-Control: no-store`; only hashed build assets are cached (`immutable`) | `src/server/app.ts` | `test/server/security.test.ts` |
| Vulnerable or malicious dependencies | Few dependencies. `npm audit --omit=dev --audit-level=high` and gitleaks run in CI on every push and weekly; GitHub Dependabot alerts report known advisories. Dependabot version updates are off, because the challenge allows a single branch and they open branches; updates are applied by hand on `main` | `.github/workflows/security.yml`, repository security settings | CI |
| Container escape or tampering | Multi-stage image on `node:22-slim`; the run stage holds only `dist`, production `node_modules` and `package.json`, runs as the non-root `node` user, and has a `/healthz` health check; `.dockerignore` keeps `.env`, `node_modules`, build and test output out of the build context | `Dockerfile`, `.dockerignore` | CI `container` job builds the image, waits for healthy, runs the smoke test against it and checks the user is not root |

## Configuration

| Name | Purpose | Default |
|---|---|---|
| `TRUSTED_PROXIES` | Proxies in front of the app that append to `X-Forwarded-For`. Set `1` on Cloud Run. | `0` |
| `RATE_LIMIT_API_PER_MINUTE` | Per-IP requests a minute on `/api/*` | `60` |
| `RATE_LIMIT_AI_PER_MINUTE` | Per-IP requests a minute on `/api/plan`, and separately on `/api/refine` | `10` |
| `GEMINI_MAX_PER_MINUTE` | Gemini calls a minute across all visitors | `10` |

The rate limits are kept in each server instance's memory, so with several Cloud Run instances the
effective limit is a multiple of these numbers. That is acceptable for this app; a shared store
would be needed for a hard global limit.

## Out of scope

Accounts, payments and stored user data do not exist, so there is no authentication or session
handling to attack. Denial of service beyond per-IP limits is left to Google Cloud's front end.
