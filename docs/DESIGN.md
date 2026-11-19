# SaafSaans: design direction

Read this before building any screen. It sits beside `SPEC.md` (what the app does) and
`FACTORS.md` (where the numbers come from). If this file and a habit disagree, this file wins.

## 1. The feel in one line

**A calm, exact instrument for a family's air, built like enterprise software: type-led, data
first, quiet motion.** Think of a well-made public data service or a serious financial dashboard,
not a startup landing page.

## 2. Not AI slop: never use

- Gradients of any kind (especially purple or blue), gradient text, glows, coloured shadows.
- Glassmorphism, frosted or blurred panels, noise or grain overlays.
- Blobs, orbs, particles, floating shapes, 3D tilt, cursor followers, confetti.
- Emoji, sparkle or robot imagery, "AI-powered" badges, stock illustrations.
- A grid of three feature cards, each with an icon on top.
- Typewriter text, numbers that count up, parallax, auto-playing video.
- Big rounded cards with heavy shadows everywhere; everything centred.
- Hype words: revolutionise, unlock, empower, seamless, cutting-edge, harness, supercharge,
  game-changer, leverage, elevate, journey, delve, effortless, next-gen.

## 3. Writing rules (all three languages)

- **No em dashes (—), and no en dashes (–) used as dashes**, anywhere a user can read: UI text,
  translations, page titles, Gemini output, share text, calendar files. Use a comma, a colon or
  a new sentence. Ranges use "to" ("34% to 93%"). A test enforces this (§10).
- Sentence case for headings and buttons. Short sentences. No exclamation marks.
- Every number has a unit and, where it matters, a source link.
- Indian number formatting (`1,20,000`), tabular figures for numbers that change.
- Name the AI once, plainly, in "How it works": "Gemini chooses and explains the swaps. Every
  number comes from tested code." No AI marketing anywhere else.

## 4. Icons

**None.** No icon library, no icon font, no SVG icon set, no logo mark. The brand is the wordmark
"SaafSaans" set in type. Use words for every action and label. The only allowed glyphs are the
browser's own (the native `<details>` disclosure marker, the native checkbox) and a plain "×" to
close a dialog. Air quality is shown as the number and the band name in words; band colour is
only a small extra signal, never the only one.

## 5. Visual system

- **Type:** Noto Sans, Noto Sans Devanagari and Noto Sans Telugu, self-hosted as `woff2`
  (variable weight, `font-display: swap`, Latin, Devanagari and Telugu subsets only). One family
  across all three languages keeps the pages consistent. Weights: 400, 500, 600.
- **Type scale:** 14, 16, 18, 22, 28, 40, then a hero size of `clamp(40px, 6vw, 72px)`.
  Body 16 to 18 px, line height 1.5, lines 60 to 75 characters.
- **Colour tokens:**
  - `--paper` `#FAFAF7` background, `--surface` `#FFFFFF`
  - `--ink` `#111418` text, `--ink-2` `#4A5058` secondary text
  - `--rule` `#E3E3DE` 1 px dividers
  - `--accent` `#0E5E4E` (deep green) for primary buttons, links and focus rings
  - Band colours (CPCB order, muted): Good `#3B7D3A`, Satisfactory `#7FA83A`, Moderately
    polluted `#C9A227`, Poor `#D9822B`, Very Poor `#C0392B`, Severe `#7B1E1E`. Used only as a
    4 px bar or small swatch beside the band name. Text always stays `--ink`.
  - Check every text and background pair against WCAG AA contrast before shipping.
- **Space:** 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px. Generous vertical space between sections
  (96 to 128 px on desktop, 64 px on mobile).
- **Grid:** 12 columns, max width 1200 px, 24 px gutters (16 px on mobile). Content is mostly
  left-aligned on the grid.
- **Shape:** 1 px rules instead of cards where possible. Radius 6 px at most. No shadows, except
  one very light shadow under the sticky header once the page has scrolled.
- **Light theme only** for this version.

## 6. Motion: minimal and purposeful

Motion helps people follow what changed. It never decorates.

- **Smooth scrolling:** native only. `html { scroll-behavior: smooth; }` inside
  `@media (prefers-reduced-motion: no-preference)`, for in-page links. No scroll-hijacking or
  inertia libraries, no custom scrollbars.
- **Section transitions:** each section fades in once as it enters the view: opacity 0 to 1 and
  a 12 px upward move, 320 ms, `cubic-bezier(0.2, 0, 0, 1)`, triggered at about 15% visibility
  with `IntersectionObserver`. Up to four children may stagger by 60 ms. Content must be fully
  visible if JavaScript fails.
- **Sticky scrolling:** the "How it works" section (§7) pins a panel while three steps scroll
  past. The panel's content crossfades in 200 ms as each step becomes active.
- **Marquees:** see §8.
- **Changing numbers:** a 150 ms crossfade when a family total updates. No counting up.
- **Hover and focus:** colour or underline changes in 150 ms. Buttons never grow, bounce or glow.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, every animation above is off,
  sticky panels still work, and marquees become a static row the user can scroll sideways.
- Animate only `opacity` and `transform`. No animation library: CSS plus a few lines of script.

## 7. Home page, section by section

1. **Header (sticky):** the wordmark on the left; on the right, the language switch as text
   ("English", "हिन्दी", "తెలుగు") and a "Plan my day" button.
2. **Hero:** one line that says what it is ("Your family's smog plan for today"), one sentence
   under it, and two actions: "Try a Hyderabad family" (primary) and "Set up my household"
   (secondary). The hero's visual is live data, not an illustration: today's AQI for Hyderabad as
   a large number with its band name, PM2.5, the area and the time it was updated. While it
   loads, show a plain placeholder line, never a spinner.
3. **Marquee 1, live air across the city:** area name, AQI and band name for about eight
   Hyderabad areas plus Dwarka, Delhi, from one cached endpoint (§9).
4. **Insight:** "Morning is often the worst time for a walk in winter", shown with today's
   cleanest and dirtiest hours from the live forecast, and the source from `FACTORS.md` §8.
5. **How it works (sticky scrolling):** a pinned panel on one side; three steps on the other:
   "Tell us who is at home", "See the cleanest hours", "Choose swaps and see the numbers". The
   panel shows a real example for each step (the Reddys), computed by `impact.ts`.
6. **Two lenses:** "Protect" (what your family breathes) and "Pollute less" (what your household
   puts into the air), each with one example number from the Reddys.
7. **How we work out the numbers:** the plain-language formulas, which values are estimates, and
   the line "Gemini chooses and explains the swaps. Every number comes from tested code."
8. **Community:** the Green Meadows example: 120 homes and their weekly total.
9. **Marquee 2, sources:** CPCB, US EPA, Berkeley Earth, AHAM, India GHG Program, CEA, Centre for
   Science and Environment, Google Air Quality API, as text, followed by a normal list of links.
10. **Final call to action:** the same two actions as the hero.
11. **Footer:** "Not medical advice", Google attribution for Maps data and place search, sources,
    the GitHub repository.

## 8. Marquee rules

- CSS `transform` animation, linear, 40 to 60 seconds per loop, content duplicated for a seamless
  loop, with the duplicate marked `aria-hidden="true"`.
- Pauses while hovered or while anything inside has keyboard focus.
- A visible "Pause" text button (it becomes "Play") beside each marquee. WCAG 2.2.2 requires a
  way to stop content that moves for more than five seconds.
- With reduced motion: no animation; a static row that scrolls sideways.
- At most two marquees on the page (§7 items 3 and 9). None inside the app screens.

## 9. App screens (after "Set up my household" or a demo family)

- **Setup:** a numbered stepper (1 Location, 2 Household), one question group per screen, with
  presets so most people tap rather than type. Google's attribution sits under the place search.
- **Today:** a two-column layout on desktop.
  - Main column: "Air now" (number, band name, main pollutant, CPCB statement, then Google's
    advice for each family member, labelled as Google's); the 48-hour strip as a plain bar chart
    with hour labels and the cleanest and dirtiest windows named in words; the swap list; the
    indoor kit.
  - Side column (sticky): family totals for today, which update when a swap is toggled, announced
    to screen readers through `aria-live="polite"`.
  - On mobile the totals become a slim bar fixed to the bottom of the screen.
- **Swap rows, not glossy cards:** a title, who it helps, the number (large, tabular), one
  sentence of why, "How we worked this out" in a native `<details>`, and an "I'll do this"
  checkbox. Estimates are labelled "Estimate" in words.
- **Share:** the WhatsApp text preview, the "homes taking part" slider with its total, the
  calendar download and a print view.
- **Data for marquee 1:** `GET /api/air/areas` returns the fixed list of areas with their current
  AQI and band, cached for 30 minutes on the server, from demo data in demo mode.

## 10. How this is checked

- A test fails if any em dash or en dash appears in `index.html`, `src/client/**` or the
  translation files.
- Gemini's text passes through a sanitiser that replaces dashes with a comma and is tested.
- `package.json` has no icon, animation or scroll library.
- axe reports zero violations on the home page and every app screen, with motion on and off.
- Lighthouse on the home page: Performance, Accessibility and Best Practices at 95 or above.
