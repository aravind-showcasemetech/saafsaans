# AGENTS.md: SaafSaans

You are building **SaafSaans**, a family smog planner for PromptWars Virtual, Challenge 6 (Urban Air
Quality Assistant). Before any change, read `docs/SPEC.md` (what to build) and `docs/FACTORS.md`
(every number the app may show, with its source).

## Rules

1. **Numbers come from code, never from the model.** Every figure a user sees is computed in
   `src/shared/impact.ts` from constants in `src/shared/factors.ts`. Each constant has a comment
   naming its `docs/FACTORS.md` section. Ignore any number in a model reply. Never use a figure
   marked NOT VERIFIED in `FACTORS.md`.
2. **Gemini only picks and explains.** It chooses actions from the catalogue in
   `src/shared/actions.ts` and writes short explanations. Its JSON reply is validated with Zod;
   unknown action ids are dropped.
3. **Secrets stay on the server.** API keys are read from environment variables on the server only
   (`.env` locally, Secret Manager on Cloud Run). Never put a key in front-end code, a commit, a
   log line or a test. `.env` is in `.gitignore`; `.env.example` lists the names only.
4. **Validate every input** with Zod at the server boundary. Request bodies are capped at 8 KB and
   refine text at 500 characters. Round coordinates to 2 decimal places before any API call or log.
5. **Tests.** Every function in `src/shared/impact.ts` has unit tests with hand-worked expected
   values. Tests mock Gemini and every Google API; no test calls a real API. `npm run check` must
   pass before you say a task is done.
6. **Accessibility: WCAG 2.2 AA at least.** Air quality is always shown as number, band name and
   icon, never colour alone. Every control works by keyboard with a visible focus ring. Set `lang`
   on translated and AI-written text. Works at 320 px wide and at 200% zoom.
7. **Translations.** All user-facing text lives in `src/client/i18n/en.json`, `hi.json` and
   `te.json`. No hard-coded text in UI code.
8. **Health wording.** No medical advice and no medicines. Use CPCB's band statements and the fixed
   "see a doctor if" text from `docs/SPEC.md` §7.
9. **Stack (do not change without asking):** Node 22, TypeScript (strict), Hono on the server, Vite
   with vanilla TypeScript in the browser, Zod, `@google/genai`, Vitest, Biome, Playwright with
   `@axe-core/playwright`. No database, no login, no other framework. Ask before adding any
   dependency.
10. **Model id from config.** The Gemini model id comes from the `GEMINI_MODEL` environment
    variable; never hard-code it.
11. **Keep it small.** Single-purpose modules (aim for under 200 lines), no dead code, no generated
    files, `node_modules`, build output or large images committed.
12. **Report honestly.** When you finish a task, say what you ran and what passed or failed. Do not
    commit or push unless asked.

## Folder layout

```
docs/            SPEC.md, FACTORS.md
src/shared/      factors.ts, actions.ts, impact.ts, schemas.ts   (used by server and browser)
src/server/      app.ts, air.ts, places.ts, routes.ts, plan.ts, gemini.ts, cache.ts, security.ts
src/client/      main.ts, views/, i18n/en.json, i18n/hi.json, i18n/te.json
test/            unit/, server/, e2e/
```

## Commands

```bash
npm run dev      # local server with the front end
npm test         # unit and server tests
npm run check    # lint + type check + tests (must pass before a task is done)
npm run build    # production build
```
