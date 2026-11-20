# SaafSaans: design direction

Read this before building any screen. It sits beside `SPEC.md` (what the app does) and
`FACTORS.md` (where the numbers come from). If this file and a habit disagree, this file wins.

## 1. The feel in one line

**A calm, exact instrument for a family's air: black and green, data first, every step explained,
quiet motion.** Think of a well-made public data service or a serious financial dashboard,
not a startup landing page.

## 2. Not AI slop: never use

- Gradients of any kind, gradient text, glows, neon, coloured shadows.
- Glassmorphism, frosted or blurred panels, noise or grain overlays.
- Blobs, orbs, particles, floating shapes, 3D tilt, cursor followers, confetti.
- Emoji, sparkle or robot imagery, "AI-powered" badges, decorative stock art.
- A grid of cards each with an icon on top.
- Typewriter text, numbers that count up, parallax, auto-playing video.
- Big rounded cards with heavy shadows everywhere.
- Hype words: revolutionise, unlock, empower, seamless, cutting-edge, harness, supercharge,
  game-changer, leverage, elevate, journey, delve, effortless, next-gen.

## 3. Writing rules (all three languages)

- **No em dashes (—), and no en dashes (–) used as dashes**, anywhere a user can read: UI text,
  translations, page titles, Gemini output, share text, calendar files. Use a comma, a colon or
  a new sentence. Ranges use "to" ("34% to 93%"). A test enforces this (§10).
- Sentence case for headings and buttons. Short sentences. No exclamation marks.
- Every number has a unit and, where it matters, a source link.
- Indian number formatting (`1,20,000`), tabular figures for numbers that change.
- Name the AI once, plainly: "Gemini decides, code computes". No AI marketing anywhere else.
- Every section says, in two short lines, "What this shows" and "What you can do".

## 4. Icons, illustrations and photos

**Icons.** A small fixed set (15 at most) from Lucide (ISC licence), copied as SVG files into
`src/client/assets/icons/`, with the licence in `THIRD_PARTY_NOTICES.md`. No icon library or icon
font. 20 px (24 px at most), stroke 1.75, `currentColor`, `aria-hidden="true"`, and always next
to a visible text label, never alone. The one exception is a close button, which carries an
`aria-label`. At most one icon per heading or button. Allowed uses: section headings, primary
action buttons, "What is this?" toggles, location, time, calendar, share and print.

**Illustrations.** Original SVG diagrams that explain something, never decoration, drawn in the
theme palette: `--ink-2` for lines, `--accent` for the key element, band colours only where they
carry meaning. Each has a translated title and description for screen readers, or is
`aria-hidden` when the text beside it says the same thing. Numbers inside diagrams come from
`src/shared`.

**Photos.** Optional, at most 3, only with a clear licence (our own, Unsplash or Pexels), WebP
under 150 KB each, with translated alt text, credited in the README. No AI-generated photos of
people.

**Budget.** All icons, illustrations, images and fonts together add under 1.5 MB to the repo.
Images below the fold are lazy-loaded with width and height set.

The brand is the wordmark "SaafSaans" set in type; there is no logo mark. Air quality is always
the number and the band name in words; band colour is only an extra signal.

## 5. Visual system: dark theme

- **Theme:** dark, black and green ("environment"). Green is the accent, never the page
  background: surfaces stay near-black, text off-white, and green is used sparingly so it keeps
  its meaning. The print stylesheet stays black text on white.
- **Colour tokens** (`src/client/styles/tokens.css`):
  - `--bg` `#0B0F0C` page, `--surface` `#121A15`, `--surface-2` `#18231C`
  - `--rule` `#263A2D` 1 px dividers
  - `--ink` `#E8F0EA` text, `--ink-2` `#A8BAAE` secondary text
  - `--accent` `#3DDC84` primary buttons (with `--bg` text on them), links, focus rings, the
    current step and "better" changes; `--accent-hover` `#5BE79A`; `--accent-soft` `#14301F`
    for selected rows and highlighted panels
  - CPCB band colours, tuned for the dark background, same order and meaning: Good `#4ADE80`,
    Satisfactory `#A3E635`, Moderately polluted `#FACC15`, Poor `#FB923C`, Very Poor `#F87171`,
    Severe `#DC2626`. Only as a bar or swatch beside the band name in words.
  - A unit test checks every text and background pair (4.5:1, or 3:1 for large text) and every
    band colour against `--bg` and `--surface` (3:1).
- **Type:** Google Fonts under the SIL Open Font Licence, self-hosted as `woff2`, never loaded
  from the Google Fonts website (the CSP keeps `font-src 'self'`).
  - Headings, step labels and big numbers: Anek Latin, Anek Devanagari and Anek Telugu, 600
    and 700.
  - Body text and interface: Noto Sans, Noto Sans Devanagari and Noto Sans Telugu, 400 and 500.
  - `unicode-range` so only the scripts in use load; only the Latin heading weight used in the
    hero is preloaded; `font-display: swap`; tabular figures for numbers that change.
- **Type scale:** 14, 16, 18, 22, 28, 40, then a hero size of `clamp(40px, 6vw, 72px)`.
  Body 16 to 18 px, line height 1.5, lines 60 to 75 characters.
- **Space:** 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px.
- **Grid:** 12 columns, max width 1200 px, 24 px gutters (16 px on mobile).
- **Shape:** 1 px rules instead of cards where possible. Radius 6 px at most. No shadows.
- **Controls:** buttons and toggles at least 44 by 44 px, with clear text labels.

## 6. Motion: minimal and purposeful

Motion helps people follow what changed. It never decorates.

- **Smooth scrolling:** native only. `html { scroll-behavior: smooth; }` inside
  `@media (prefers-reduced-motion: no-preference)`. No scroll-hijacking or inertia libraries.
- **Section transitions:** each section fades in once as it enters the view: opacity 0 to 1 and
  a 12 px upward move, 320 ms, `cubic-bezier(0.2, 0, 0, 1)`. The hero never waits. Content must
  be fully visible if JavaScript fails.
- **Changing numbers:** a 150 ms crossfade when a total updates. No counting up.
- **Hover and focus:** colour or underline changes in 150 ms. Buttons never grow, bounce or glow.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, every animation above is off.
- Animate only `opacity` and `transform`. No animation library: CSS plus a few lines of script.

## 7. The guided page pattern (home and Today)

The problem this solves: people could not tell what the app was doing or why. Every section of
the home page and of Today:

- is at least the full screen height (`min-height: 100svh`, never a fixed height, so nothing is
  clipped at 200% zoom, on small phones or in Telugu), holds one idea, and centres its content;
- has the same shape: a step label ("Step 2 of 6") with its icon, a heading that says what you
  get, two short lines ("What this shows" and "What you can do"), the content, and one primary
  action that does something useful for that section (plus at most one secondary);
- explains its terms with short "What is this?" disclosures (native `<details>`).

**Navigation:** on desktop a sticky, text-only list of the section names, the current one in
`--accent`, keyboard accessible, linking to each section; on phones a slim
"Step 3 of 6: Indoor air hacks" line at the top.

**Home page**, named after the challenge brief:

0. Hero: "Plan your family's day around the smog". What SaafSaans does, the live AQI with the
   plain meaning of its band, and "What you will get" in three lines. Actions: "Try a
   Hyderabad family", "Set up my household".
1. "The air where you live, right now": AQI and PM2.5 in one line each, the six CPCB bands as a
   labelled scale with today's band marked in words, and CPCB's statement. Action: "Check my
   area".
2. "A low-emission daily routine": the 48-hour forecast with the cleanest and dirtiest windows
   named, why mornings are worse (`FACTORS.md` §8), and a "your day in hours" diagram of the
   grandmother's walk moved to the cleanest window with her dose before, after and the cut.
   Action: add the cleanest hours to the calendar (`.ics`).
3. "Indoor air hacks": how outdoor air gets into a room, with the computed shares of outdoor
   PM2.5 (windows open, shut, shut with a purifier); the purifier worked out step by step; the
   coil, incense and frying facts. Action: a purifier size calculator.
4. "Sustainable alternatives": the same trip by car and by metro, km avoided and CO2 a day, a
   week and a winter. Action: "Compare my commute".
5. "The direct impact of your choices": the Reddys' totals per person, with one swap toggled to
   show the change. Action: "See my family's numbers".
6. "Share it with your community": the society card. Actions: "Share on WhatsApp", "Set up my
   household".
7. "How we work out every number": sources, estimates, "Gemini decides, code computes". Action:
   "Read the sources".
8. Final call to action and footer ("Not medical advice", Google attribution, sources, GitHub).

Every example number is computed from `src/shared` with the demo data, never typed in.

## 8. App screens

- **Setup:** five full-height steps: Location, Who lives here, How you travel, Your home,
  Review. Each field has a one-line "Why we ask" note; each step ends with "Back" and "Next";
  the review step lists everything in plain sentences with an Edit button per group and a
  primary "See today's plan" button. Google's attribution sits under the place search.
- **Today**, the same guided pattern: 1 "Your air today", 2 "Your low-emission routine",
  3 "Indoor air hacks", 4 "Sustainable alternatives", 5 "The impact of your choices" (totals
  that update as swaps are ticked, announced through `aria-live="polite"`), 6 "Share with your
  community". Swaps are grouped by their catalogue category (routine, indoor, alternative); a
  section with no swaps for this household says so in one line.
- **Swap cards:** who it helps, what to do, the number (large, tabular), one line explaining the
  number in words built from computed values ("Grandmother breathes 12% less PM2.5 today"),
  "How we worked this out" in a native `<details>`, and an "I'll do this" checkbox. Estimates
  are labelled "Estimate" in words.
- **Share:** the WhatsApp text, the "homes taking part" slider with its total, the calendar
  download and a print view.

## 9. Data for the home page

`GET /api/air/areas` returns the fixed list of areas with their current AQI and band, cached
for 30 minutes on the server, from saved captures in demo mode.

## 10. How this is checked

- A test fails if any em dash or en dash appears in `index.html`, `src/client/**` or the
  translation files.
- Gemini's text passes through a sanitiser that replaces dashes with a comma and is tested.
- `package.json` has no icon, animation or scroll library.
- A unit test checks the contrast of every token pair and band colour.
- Playwright checks every section is at least the viewport height at 1440, 390 and 320 px,
  every section's primary action works, every icon is `aria-hidden` next to text, and every
  diagram has a text alternative or is `aria-hidden`.
- axe reports zero violations on every screen in en, hi and te, with motion on and off.
- Lighthouse on the home page and Today: Performance, Accessibility and Best Practices at 95 or
  above.
