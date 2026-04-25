# Tenzi Resources

Free data insights, dashboards, and runbooks for Australian GI brokers and licensees.
Hosted on GitHub Pages at `https://resources.tenzi.ai`.

## Site structure

```
tenzi-resources/
  index.html                              # Central landing page
  reports/                                # Free analytics reports
    gi-broker-movement-dashboard.html
    gi-broker-ar-profile.html
  runbooks/                               # Free operational runbooks
    new-business-quoting-runbook.html
    renewals-runbook.html
    claims-management-runbook.html
  premium-samples/                        # Sample of premium paid reports
    gi-broker-race-chart.html             # Top 20 GI broker AFSLs (24mo)
    resilium-ar-flow.html                 # Resilium AR flow analysis (48mo)
    *.gif                                 # Embedded chart assets
```

| Page type | CTA pattern |
|-|-|
| Index landing | Header "Subscribe" scrolls to inline subscribe strip + "Book a chat" → Cal.com |
| Free reports | Header "Subscribe to updates" opens `subscribeModal` + inline subscribe strip at bottom |
| Runbooks | "Request a Copy" opens `copyModal` |
| Premium samples | "Get the full report" / "Book a call" → Cal.com |

Every page has: back-link to index, Tenzi logo in nav bar, page view tracking, CTA click tracking.

## Design system

Visual, typographic, and layout rules live in [`DESIGN_STANDARD.md`](./DESIGN_STANDARD.md) — that's the source of truth for colours, fonts, grid, components, and page structure. The standard is named **"Terminal Grid (Light)"**: cream background, green accent, Inter Tight + IBM Plex Mono.

Operational constants worth knowing at a glance:

- Self-contained HTML files for layout — no build step, no external CSS frameworks. The only external JS dependency is `https://tenzi.ai/track.js` (shared analytics tracker — source lives in the `tenzi-homepage` repo)
- Fonts: `Inter Tight` (display/body) + `IBM Plex Mono` (eyebrows, numerals, labels) via Google Fonts
- Primary accent: green `#2ca471` — the only saturated colour on CTAs and emphasis
- Tenzi logo: inline SVG copied verbatim from an existing page — pink→orange and purple→cyan gradient arcs, navy `#1C233C` wordmark. Do not regenerate.
- Premium pills still use the Tenzi rainbow gradient: `linear-gradient(135deg, #EC2BA6, #F69068, #762BB7, #2FC2EF)`
- Responsive breakpoints: `820px` (KPI rows → 2 col) and `700px` (tighter padding)

## Analytics and tracking

All client-side tracking is handled by the shared **`track.js`** library (lives in the sibling `tenzi-homepage` repo, served at `https://tenzi.ai/track.js`). Both `resources.tenzi.ai` and `tenzi.ai` load the same file — single source of truth for page views, CTA clicks, dwell time, and form POSTs.

**Endpoint (still the Apps Script):** `https://script.google.com/macros/s/AKfycbzO6crfhklS6kIOXOGNIBBSk9ZiIUdM1lESOw6hGkqfE7qxz9MbVz47_ydAitFyFQtW/exec`

**Sheets:**
- `Events` — A=event, B=page, C=timestamp (Melbourne time), D=ip, E=referrer, F=site (`marketing` / `resources`). All page views, CTA clicks, dwell events, and resources-site form submissions land here. Rows written before `track.js` shipped have an empty F.
- `Contacts` — Timestamp, Name, Email, Organisation, Role, Interest, Message, Page, IP, Referrer, Site. Driven by the `tenzi.ai` holding-page contact form (POSTs with `source: 'holding_page_contact'`). Resources pages do not write here. Each row also fires a notification email to `roshan@tenzi.ai` via `MailApp.sendEmail`.

The Apps Script (`apps-script.gs` in this repo — deploy via Apps Script editor) branches on `data.source` and auto-creates either sheet on first write.

### Event types in the email column

| Email value | What it means |
|-|-|
| `(page view)` | Visitor loaded the page (fires on `tenziTrack.init()`) |
| `(dwell: N)` | Page dwell time in whole seconds — fires on `pagehide`, visibility-aware (paused when tab hidden), skipped below 2s, capped at 3600s |
| `(cta: subscribe_click)` | Clicked Subscribe button (modal opened — may not have submitted) |
| `(cta: request_copy_click)` | Clicked Request a Copy button on a runbook |
| `(cta: book_chat_click)` | Clicked Book a chat (Cal.com link) |
| `(cta: PREMIUM_get_full_report_click)` | Clicked "Get the full report" header button on premium sample |
| `(cta: PREMIUM_book_call_click)` | Clicked "Book a call to discuss" CTA on premium sample |
| `(cta: linkedin_click)` | Clicked "Join the conversation" LinkedIn button on a free report/runbook |
| `(cta: PREMIUM_linkedin_click)` | Clicked "Join the conversation" LinkedIn button on a premium sample |
| Real email address | Form submission (subscribe or request copy) |

Compare CTA click counts vs actual form submissions to measure drop-off. Column F lets Looker Studio slice by origin site.

### Standard tracking block (copy into every new page)

```html
<script src="https://tenzi.ai/track.js"></script>
<script>tenziTrack.init({ site: 'resources' });</script>
```

Place at the very bottom of `<body>` (before `</body>`). `init` fires `(page view)` and starts the dwell timer.

### `tenziTrack` API (from `track.js`)

| Call | Purpose |
|-|-|
| `tenziTrack.init({ site })` | Fire page view, start dwell timer, warm visitor-IP cache |
| `tenziTrack.trackCta(action)` | Fire `(cta: action)` beacon |
| `tenziTrack.trackBeacon(event)` | Fire arbitrary-named beacon |
| `tenziTrack.postForm(data)` | POST JSON to the Apps Script with `page`, `timestamp`, `referrer`, `site`, `ip` auto-added |
| `tenziTrack.getVisitorIp()` | Cached IP (best-effort, may be empty) |

`window.trackCta` and `window.trackBeacon` are defined as back-compat globals so every existing inline `onclick="trackCta('...')"` keeps working. New code should prefer the namespaced `tenziTrack.trackCta()`.

### Wiring CTA buttons

Every CTA button needs `onclick="trackCta('action_name'); ..."` prepended to its existing onclick:

```html
<!-- Modal-opening button -->
<button onclick="trackCta('subscribe_click'); document.getElementById('subscribeModal').classList.add('open')">

<!-- Cal.com link (premium) -->
<a href="https://cal.com/roshan-khozouei/30min" target="_blank" onclick="trackCta('PREMIUM_book_call_click')">

<!-- LinkedIn "Join the conversation" (secondary, when a post exists for the page) -->
<a href="https://www.linkedin.com/posts/roshan-khozouei_..." target="_blank" rel="noopener" onclick="trackCta('linkedin_click')">
```

### LinkedIn conversation button

When a LinkedIn post exists for a page, add a "Join the conversation" secondary button in the header, paired with the primary CTA inside a flex wrapper so both buttons sit on the same row and wrap on narrow screens. In the current design it's rendered as an outlined cyan button (`#7aa8d4` text, `rgba(122,168,212,0.35)` border) with the LinkedIn "in" icon and an IBM Plex Mono uppercase label.

- Tracking: `trackCta('linkedin_click')` on free reports and runbooks, `trackCta('PREMIUM_linkedin_click')` on premium samples (PREMIUM_ prefix is mandatory for filtering).
- Placement: to the left of the primary CTA, inside `<div style="display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;">`.
- External link safety: always `target="_blank" rel="noopener"`.
- Strip LinkedIn's `?utm_source=share&utm_medium=...&rcm=...` tracking params from the URL before committing — they bloat the link without benefit.
- Label font: `IBM Plex Mono` 11px 500, uppercase, letter-spacing `0.1em`. Matches the mono-eyebrow treatment defined in the design standard.
- Copy the full button markup from an existing page rather than retyping the SVG path.

### Apps Script (source of truth: `apps-script.gs` in this repo)

Canonical source is [`apps-script.gs`](./apps-script.gs). The deployed script lives in the linked Google Sheet — after editing the file, paste it into the Apps Script editor and Deploy > Manage deployments > New version. Summary:

- `doPost(e)` — branches on `data.source === 'holding_page_contact'` (Contacts sheet + honeypot + rate limit + notify email) vs everything else (Events sheet).
- `doGet(e)` — branches on `e.parameter.view === 'dashboard'` (renders the analytics dashboard) vs the default tracking-beacon path (writes an Events row). Both paths share the same web-app deployment.
- `writeEvent_(email, page, melbTime, ip, referrer, site)` — appends to Events. Column F = site tag.
- `writeContact_(data, melbTime)` — appends to Contacts (11 cols including site).
- `isExcludedIp_` / `EXCLUDED_IPS` — silently drop rows from listed IPs.
- `withinRateLimit_` — PropertiesService-backed per-IP cap on contact submissions (5/hour).
- `renderDashboard_` and helpers — server-rendered HTML analytics built from Events + Contacts. Auth = secret token in URL (`DASHBOARD_TOKEN` constant). Hit at `<web-app-url>?view=dashboard&token=<TOKEN>&days=30&site=all`. See "Dashboard" section below.

### Dashboard

The deployed web app doubles as a private analytics dashboard for `roshan@tenzi.ai`. It reads the Events + Contacts sheets, aggregates server-side, and returns a single HTML page with KPIs, a daily activity line chart, top pages, CTA breakdown, dwell stats per page, and recent subscribers/contacts.

**Auth:** the script constant `DASHBOARD_TOKEN` is a secret. Append `&token=<value>` to the URL to access. Token must NOT appear in `track.js`, page HTML, or commits — only in the bookmark.

**URL params:**
- `view=dashboard` (required)
- `token=<TOKEN>` (required, must match `DASHBOARD_TOKEN`)
- `days=N` (1–365, default 30)
- `site=all|marketing|resources` (default `all`)

**Setup:** open the Apps Script editor, replace `DASHBOARD_TOKEN` with a long random string (e.g. `openssl rand -hex 24`), Deploy > Manage deployments > New version. Bookmark the URL. Same web-app URL as the tracking beacon — branching is on the `view` param.

**Hardening notes:**

- **Honeypot:** The contact form on `tenzi.ai` includes a hidden `website` field. Real users never see it; bots auto-filling all fields will populate it. Submissions where `data.website` is non-empty are silently dropped (return `ok` so bots don't retry).
- **Rate limit:** Contact submissions are capped at 5 per IP per hour using `PropertiesService`. Excess submissions silently drop. Page views and CTA tracking are not rate-limited.
- **MailApp try/catch:** Notification emails are best-effort. If `MailApp` quota is exhausted (1,500/day on Workspace), the contact row still saves — only the email notification is lost. Errors land in the Apps Script Executions log.
- **IP exclusion:** Add IPs to `EXCLUDED_IPS` to silently drop all events from those addresses (page views, CTAs, contact submissions). Useful for keeping personal/internal testing out of the sheets. Find your current IP in the existing Events sheet IP column, or visit `https://api.ipify.org` in your browser. Note that home ISPs often rotate IPs — re-check periodically.

After editing the script: Deploy > Manage deployments > edit > New version > Deploy (keeps same URL).

### Form submissions

Forms call `tenziTrack.postForm({ email, source })`. The shared tracker auto-adds `page`, `timestamp`, `referrer`, `site: 'resources'`, and cached `ip` before POSTing with `mode: 'no-cors'`:

```html
<form onsubmit="return submitSubscribe(event)">…</form>
<script>
  function submitSubscribe(e) {
    e.preventDefault();
    tenziTrack.postForm({ email: document.getElementById('subscribeEmail').value, source: 'subscribe' });
    tenziTrack.trackCta('subscribe_submit');
    e.target.innerHTML = '<div class="confirm">✓ Subscribed — check your inbox.</div>';
    return false;
  }
</script>
```

Server-side `melbTime` overrides `data.timestamp` for consistency. Show the success view immediately without waiting for a response.

## Hosting

- Repo: `rroosshhaann/tenzi-resources`
- GitHub Pages from `main` branch
- Custom domain: `resources.tenzi.ai` (CNAME file in repo root)
- HTTPS enforced, cert auto-renewed by GitHub
- DNS: A records pointing to GitHub Pages IPs (185.199.108-111.153)

## Data sources

Dashboard data comes from the `ar-dataset/` project in the `python-scrapbook` repo:
- ASIC AFS Licensee and AR register CSVs from data.gov.au
- ABS population data for per-capita calculations
- See `python-scrapbook/ar-dataset/CLAUDE.md` for filter definitions and data caveats

## Adding a new page — MANDATORY checklist

Every page on the site MUST have all of the following. No exceptions.

1. **Nav bar** — back-link on left, Tenzi logo SVG on right. Copy from an existing page. Back-link href should use `../index.html` for pages in subfolders.
2. **Page view tracking + CTA tracking helper** — paste the standard shared-tracker block (see Analytics section above: two `<script>` tags — load `https://tenzi.ai/track.js`, then call `tenziTrack.init({ site: 'resources' })`) at the bottom of the page.
3. **CTA buttons** — every page must have a call-to-action. Each CTA button must have `trackCta('action_name')` in its `onclick`:
   - **Runbooks**: "Request a Copy" button in header → opens `copyModal` with email form. Use `trackCta('request_copy_click')`.
   - **Free reports/dashboards**: "Subscribe to updates" button in header → opens `subscribeModal`. Use `trackCta('subscribe_click')`.
   - **Premium samples**: "Get the full report" + "Book a call" → links to Cal.com. Use `trackCta('PREMIUM_get_full_report_click')` and `trackCta('PREMIUM_book_call_click')`. PREMIUM_ prefix is mandatory for filtering.
   - **Index page Book a chat**: `trackCta('book_chat_click')`.
   - **LinkedIn "Join the conversation"** (when a post exists for the page): secondary button in the header paired with the primary CTA inside a flex wrapper. Use `trackCta('linkedin_click')` on free pages, `trackCta('PREMIUM_linkedin_click')` on premium samples. See the "LinkedIn conversation button" section above for placement and styling rules.
4. **Email modal (for subscribe/copy CTAs)** — copy modal HTML and form submission script from an existing page. Form handlers call `tenziTrack.postForm({ email, source })`; the tracker auto-adds `page`, `timestamp`, `referrer`, `site`, `ip`. Show the success view immediately.
5. **Card on index.html** — add a tile linking to the new page using the matching grid class:
   - `.tile-data` inside `.data-grid` — free reports/dashboards
   - `.tile-runbook` inside `.runbook-grid` — operational runbooks
   - `.tile-premium` inside `.premium-grid` — premium samples (green "Premium" pill in the tile foot)
6. **Self-contained HTML for layout** — inline CSS, no build step, no external CSS frameworks. The one external JS dependency is `https://tenzi.ai/track.js` (shared analytics); everything else is inline. Follow [`DESIGN_STANDARD.md`](./DESIGN_STANDARD.md) for tokens, type scale, and component patterns.
7. Commit and push to `main` — GitHub Pages deploys automatically
