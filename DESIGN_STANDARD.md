# Tenzi Resources — Design Standard

**Scope:** Every page under `resources.tenzi.ai` (the resources subdomain).
Applies to: dashboards, runbooks, data explainers, any new free resource.
Does **not** apply to the marketing site (`tenzi.ai`).

The standard is named **"Terminal Grid (Light)"** — a cream, print-infographic aesthetic with mono eyebrows, flat borders, and a single green accent. Inspired by editorial data pages (The Pudding, FT Lex) and Supabase's density/typography, adapted for a light background.

The index page (`tenzi-resources/index.html`) is the visual anchor. New pages must read as part of the same publication when sat next to it.

---

## 1. Design tokens

Declare these verbatim at the top of every page's `<style>`. Do not introduce new colours without updating this doc.

```css
:root {
  /* Surfaces */
  --bg:            #faf8f4;  /* cream page background */
  --panel:         #ffffff;  /* card surface */
  --panel-hover:   #fafaf7;
  --border:        #e5e1d9;  /* default card border */
  --border-bright: #d3cec3;  /* hover / focus */
  --border-light:  #ece8df;  /* subtle dividers, progress tracks */

  /* Text */
  --text:  #1a1a1a;
  --muted: #6b6560;
  --dim:   #a59f93;

  /* Brand accent — the ONLY saturated colour used for CTAs & emphasis */
  --accent:       #2ca471;
  --accent-hover: #249765;

  /* Data/chart teal ramp — use only inside data viz */
  --g900: #0A4A45;
  --g700: #0F766E;
  --g500: #14A399;
  --g300: #5EEAD4;
  --g100: #CCFBF1;
  --g50:  #F0FDFA;

  /* Editorial phase hues — use only on runbook phase badges / step borders.
     NEVER use on backgrounds or as decoration. */
  --phase-1: #d17149;  /* warm orange */
  --phase-2: #b88330;  /* amber */
  --phase-3: #7c5fbd;  /* muted violet */
  --phase-4: #3d8aa8;  /* muted cyan */
  --phase-5: #3f9b6c;  /* muted green */

  /* Semantic */
  --pos: #0F766E;  /* positive delta (use g700) */
  --neg: #9c3b3b;  /* negative delta */

  --radius: 6px;
}
```

**Colour rules:**
- Cream background, white panels. Never invert to a dark card on cream.
- Exactly one saturated accent (`--accent`) on the page — CTAs, section dots, link colour.
- Chart teal (`--g*`) only inside data visualisations (bars, progress fills, KPI accent card). Do not put teal on CTAs.
- Phase hues only on runbooks. Do not use them on dashboards.
- No gradients on containers. Gradients are permitted only on data bars (vertical teal ramp) and the subscribe strip's radial glow.

---

## 2. Typography

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter+Tight:wght@400;500;600&display=swap" rel="stylesheet">
```

- **Display & body:** `'Inter Tight', Inter, system-ui, sans-serif`. Weights 400/500/600 only.
- **Mono:** `'IBM Plex Mono', ui-monospace, monospace`. Weights 400/500 only.
- **Body size:** `14px / 1.55`. Never go below 13px for paragraphs.
- **Letter-spacing:**
  - H1 / H2: `-0.02em`
  - Body: default
  - Mono eyebrows & all-caps: `0.12em`–`0.18em`
- **Weights:** headings are `500`, not `700`. Bold is for inline emphasis only (`600`).
- **Numerals:** `font-feature-settings: "tnum";` on any element showing a number so tables align.

### Type scale (fixed)
| Role | Size | Weight | Family |
|---|---|---|---|
| H1 page title | 28px | 500 | Inter Tight |
| H2 section | 26px | 500 | Inter Tight |
| H3 card title | 15px | 500 | Inter Tight |
| Body | 14px | 400 | Inter Tight |
| Small / caption | 13px | 400 | Inter Tight |
| KPI value | 28–34px | 600 | Inter Tight |
| Eyebrow / mono label | 10–11px | 500 | IBM Plex Mono, uppercase, tracked |
| Section band | 10px | 500 | IBM Plex Mono, uppercase, tracked |

---

## 3. Layout

- **Max width:** `1100px` (content wrapper). Narrower pages (900–960px) are acceptable for text-heavy runbooks.
- **Gutter:** `28px` horizontal on desktop, `18–20px` on mobile.
- **Vertical rhythm:** section-to-section `24px` top margin on the section band; card-to-card `10–12px`; `.card-sub` description → content below is `10px`.
- **Grid:** CSS grid with `gap: 10px` for card rows; KPI rows use `grid-template-columns: repeat(4, 1fr)`.
- **Radius:** `6px` on cards, `4px` on inputs/buttons/bars. No pill shapes except the single stickiness progress bar.
- **Shadows:** none. Depth is communicated with borders and cream→white contrast. The only exception is the modal (`0 20px 60px rgba(0,0,0,0.15)`).

### Responsive breakpoints
- `≤ 820px`: KPI row → 2 cols, two-col → 1 col, header CTAs wrap.
- `≤ 700px`: tighten page padding, h1 down to 22–23px.

---

## 4. Required page structure

Every page ships these regions in this order:

```
.wrap
├── .nav-bar            ← back link + Tenzi logo
├── .header-row         ← eyebrow, H1, subtitle, meta-line + CTA group
├── [content sections]  ← each preceded by a .section-label band
├── section.subscribe   ← email capture strip
└── footer.page-footer
```

### 4.1 Nav bar
- Left: `← All Resources` linking to `../index.html`, in `--muted`.
- Right: Tenzi SVG logo, 34px tall on content pages (29px on the index nav). Use the approved inline SVG (present in existing pages — copy verbatim, do not redraw).

### 4.2 Header
```
Eyebrow (mono, dot prefix)       ← topic classification
H1 Title                          ← 28px, weight 500
Subtitle sentence                 ← 13px --muted, with one <strong>
META · KEY: VALUE · KEY: VALUE   ← mono 11px, tracked, --dim
```
Header CTAs live in a `.cta-group` flex row on the right: outlined LinkedIn button (cyan text, cyan border at 35% opacity) + solid green `Subscribe` button. Both use mono 11px uppercase labels.

### 4.3 Section bands
Every major section is preceded by:
```html
<div class="section-label">
  <span>Section name</span>
  <span class="section-num">02 / 05</span>
</div>
```
- Mono 10px, uppercase, tracked `0.18em`, colour `--muted`.
- `border-bottom: 1px solid var(--border)` with `padding-bottom: 8px`.
- Section count is always zero-padded and shows `N / TOTAL`.

### 4.4 Cards
```html
<div class="card">
  <div class="card-head">
    <h3>Card title</h3>
    <span class="card-index">LABEL</span>  <!-- mono eyebrow, right-aligned -->
  </div>
  <div class="card-sub">One-sentence description</div>
  <!-- content -->
</div>
```
- White background, 1px `--border`, 6px radius, 20px padding.
- Hover: `border-color: var(--border-bright)`.
- No inner shadows, no gradients.

### 4.5 Subscribe strip
Positioned above the footer. Radial glow background, border-top + border-bottom, inline form with green `Subscribe` button. Copy: short brief (1 line) + one-sentence description.

### 4.6 Footer
Mono 11px, tracked `0.12em`, uppercase:
- Left: `© 2026 TENZI · RESOURCES.TENZI.AI`
- Right: `TENZI.AI · LINKEDIN · EMAIL`

---

## 5. Component patterns

### 5.1 KPI card
```
Label (mono eyebrow)
VALUE (28–34px, weight 600, tnum)
Delta chip (mono, tiny, coloured background)
Secondary line (mono, --dim)
```
- First KPI may use the `.accent` variant: `linear-gradient(135deg, var(--g50) 0%, var(--panel) 100%)` + `border-color: rgba(20,163,153,0.25)`.
- Delta chip backgrounds: up=`--g100`, down=`rgba(156,59,59,0.08)`, neutral=`--g100`.

### 5.2 Data tables
- Column headers: mono 10px uppercase, `--muted`, tracked `0.14em`, bottom `1px solid --border`.
- Rows: 13px body, dashed bottom border (`1px dashed --border`).
- Numeric cells right-aligned, mono, weight 600, `tnum`.
- Positive values: `--pos`. Negative values: `--neg`.
- **Alternating row wash:** `tr:nth-child(even) td { background: rgba(15,118,110,0.025); }` — keeps dense tables from feeling like floating digits without introducing a second colour.

### 5.3 Chart bars
- Flat single-colour OR two-stop vertical gradient (`--g300 → --g700`), never horizontal gradients on containers.
- Rounded 4px corners on the exposed end only.
- Track/background: `--border-light`.
- Value labels in mono above/below bars.

### 5.4 Badges
```
.badge.new { background: var(--g100); color: var(--g700); border: 1px solid rgba(15,118,110,0.2); }
```
Mono 9.5px, tracked `0.12em`, uppercase. 2px radius.

### 5.5 Runbook steps
Five phase badges with the `--phase-*` hues; step cards carry a 4px left border keyed by actor (`broker`, `client`, `insurer`, `decision`). Decision steps also take a faint amber wash. No other uses of the phase palette.

### 5.6 Embedded figures (GIFs, animations, static charts)
- Wrap media in `.chart-wrap` — `background: var(--panel)`, `1px solid var(--border)`, `6px radius`, `8px padding`.
- Cap container at `max-width: 780px; margin-left: auto; margin-right: auto;` so wide assets (flow diagrams at 1100px+) don't dominate the page and smaller assets don't upscale past their native resolution.
- Captions below the image in `.chart-caption`: mono 10px uppercase, `--dim`, tracked `0.14em`, split label left / date-range right.

### 5.7 Figure slideshow (sections carrying several tall figures)

When a section holds two or more portrait figures, put them in a horizontal scroll-snap track rather than stacking them — three 4:5 charts otherwise run to ~3,000px of scrolling.

- **Track:** `display:flex; overflow-x:auto; scroll-snap-type:x mandatory; scroll-behavior:smooth`, scrollbar hidden. Slides are `flex:0 0 100%` with `scroll-snap-align:center`.
- **Mini-image tabs above the track** — the primary affordance, and they must sit *above* the figures: tall charts push anything below them off-screen, so bottom dots alone leave the carousel undiscoverable. Reuse the slide's own `src` for the tab image (already loaded, so no extra request) and give the tab the same aspect ratio as the slide so the miniature is uncropped. Active tab takes an `--accent` border and label.
- **Prev/next arrows** flanking the frame: solid `--accent`, white chevron, `--radius` corners (not circles). Disabled state reverts to `--panel` + `--border`.
- **One aspect ratio across all slides.** Unequal heights make the frame and arrows jump on navigation. Normalise the source images onto a common canvas — pad symmetrically so the spare space reads as a margin — rather than letterboxing in CSS.
- **Degrade cleanly:** scroll-snap gives touch swipe for free, arrow keys work on the focused track, and with JS off it stays a plain horizontal scroller. Tabs and arrows are enhancement, never the only route through.
- Reference: `premium-samples/gi-broking-network-threshold.html`.

---

## 6. Icons & imagery

- **Icons:** inline SVG, stroke-based, 14–16px, `stroke-width: 2`, `currentColor`. Never use icon fonts, never use emoji as UI.
- **No stock illustrations, no 3D renders, no gradient shapes.**
- **Logo:** copy the approved inline Tenzi SVG verbatim from any existing resource page. Do not regenerate.

---

## 7. Motion

- Entry: single `fadeUp` (6–12px, 0.35s ease, opacity 0→1) on cards. Stagger with `nth-child` delays of 30ms if worth it.
- Hover: 0.15s border/background transitions only.
- No parallax, no scroll-linked animation, no autoplay video. A user-driven figure slideshow (§5.7) is fine — the ban is on motion the visitor didn't ask for.

---

## 8. Tracking & forms

Every resource page MUST include the shared tracking beacon and subscribe endpoint. Copy from any existing page — these endpoints are stable:

- Google Apps Script endpoint: `https://script.google.com/macros/s/AKfycbzO6crfhklS6kIOXOGNIBBSk9ZiIUdM1lESOw6hGkqfE7qxz9MbVz47_ydAitFyFQtW/exec`
- `trackBeacon('(page view)')` fires on load.
- `trackCta('<action>')` fires on every CTA click (`subscribe_click`, `linkedin_click`, etc.).
- Both the header `Subscribe` button AND the subscribe strip submit to the same endpoint.
- No third-party analytics, no cookies, no GTM.

---

## 9. Writing voice

- **Tight, operator-direct.** No marketing padding. "What this is · Why it matters · What you do with it."
- **Numbers first.** Lead KPIs and headlines with the number, not the label.
- **No exclamation marks. No "game-changing". No "unlock".**
- Section names are short noun phrases (`Population bridge`, `Movement flows`), not sentences.
- `—` (em dash) is the preferred connector. Avoid `–` and hyphens-as-dashes.
- Dates: `11 Jan 2026`. Periods: `11 Jan 2026 → 8 Apr 2026`.
- Lowercase section labels (`Source & method`), sentence-case card titles (`Biggest growers`).

---

## 10. Anti-patterns (do not ship these)

- ❌ DM Sans, JetBrains Mono, Inter plain, or any other font.
- ❌ Heavy drop shadows, soft blurs, glassmorphism.
- ❌ Rounded corners above 8px (except the stickiness progress pill).
- ❌ Multiple accent colours on CTAs in the same page.
- ❌ Emoji in UI copy or headings.
- ❌ "Hero section" marketing tropes — no gradient mesh backgrounds, no floating phone mockups.
- ❌ Left-border accent cards as decoration (reserved for runbook step actor coding).
- ❌ Iconography next to every list item just to fill space.
- ❌ Full-width banner images.
- ❌ Light-mode pages that invert a single section to dark for "contrast".

---

## 11. Starting a new page

1. **Copy** `reports/gi-broker-movement-dashboard.html` or `reports/gi-broker-ar-profile.html` as a template.
2. Keep the `<head>` (fonts, tokens, tracking) unchanged.
3. Keep the nav bar, subscribe strip, footer, and modal unchanged — only edit their copy if strictly needed.
4. Replace the content sections. Each new section gets a numbered `section-label` band and a concise card-based layout.
5. Before shipping, verify:
   - Uses only the tokens in §1.
   - IBM Plex Mono + Inter Tight are the only two families loaded.
   - Page reads cleanly at 820px and 700px widths.
   - Tracking beacon fires on load, Subscribe submits, LinkedIn CTA (if present) tracks.
   - Section bands are numbered `N / TOTAL` and in order.
   - No emoji, no secondary accent colour, no shadows.

---

## 12. Reference implementations

| Page | Role | Notes |
|---|---|---|
| `index.html` | Catalogue / landing | Canonical bento density. |
| `reports/gi-broker-movement-dashboard.html` | Data dashboard | KPI row + waterfall + tables pattern. |
| `reports/gi-broker-ar-profile.html` | Data explainer | Record holders + bar-list pattern. |
| `runbooks/claims-management-runbook.html` | Runbook | Phase badges + actor-coded steps. |
| `premium-samples/gi-broking-network-threshold.html` | Premium sample | Findings list + figure slideshow (§5.7) + caveats + Cal.com CTA strip. |
| `premium-samples/index.html` | Catalogue / listing | Card grid over an existing thumbnail set. |

When in doubt, match one of these files exactly.
