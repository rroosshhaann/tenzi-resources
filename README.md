# Tenzi Resources

Free data insights, dashboards, and runbooks for Australian GI brokers and licensees.

Live at **https://resources.tenzi.ai**

## Pages

```
tenzi-resources/
  index.html                       Central landing page
  reports/                         Free analytics reports
  runbooks/                        Free operational runbooks
  premium-samples/                 Samples of premium paid reports
  r/index.html                     Newsletter click-tracking redirect
  unsubscribe/index.html           Newsletter unsubscribe (with confirm step)
  tenzi-blue-transparent.png       Logo asset used by the newsletter email
```

**Free reports** (`reports/`)
- **GI Broker Movement Dashboard — April 2026** (`gi-broker-movement-april-2026.html`) — Monthly cadence (31 Mar → 30 Apr) with three-way scope toggle (AR / AR + CAR / CAR), headline insights, KPI strip, waterfall, AFSL performance tables, and movement flows. Index tile primary link
- **GI Broker Movement Dashboard — Q1 2026** (`gi-broker-movement-dashboard.html`) — 3-month window (Jan → Apr) Individual ARs only. Reachable via the "Take me to the Q1 report" pill button on the April page (and the index tile's nested Q1 button)
- **Profile of the Average GI Broker AR** — State distribution, tenure, AFSL loyalty stats, and record holders

**Runbooks** (`runbooks/`)
- **New Business / Quotes** — End-to-end broker workflow from enquiry to binding
- **Renewals** — Identification through market review, recommendation, and binding
- **Claims Management** — First notice of loss through to resolution and file closure

**Premium samples** (`premium-samples/`)
- **GI Broker Network Health Score** — Composite 0–100 score across seven signals, ranked within peer size segment. Metrix Connect tops every Dominant; size isn't health
- **GI Broker AFSL Race Chart** — Animated 24-month view of the Top 20 GI broker networks
- **Resilium AR Flow Analysis** — 48 months of inbound/outbound AR movement for a single AFSL
- **PSC Connect AR Flow Analysis** — 48 months of AR movement showing McLardy McShane capturing 57% of traceable departures

## Hosting

GitHub Pages from `main` branch with custom domain (`resources.tenzi.ai`). HTTPS enforced. Push to `main` and it deploys automatically.

## Analytics

Every page loads the shared **`track.js`** (served from `https://tenzi.ai/track.js` — source in the `tenzi-homepage` repo) which fires events to a Google Apps Script endpoint that writes to a Google Sheet. `tenzi.ai` uses the same file, so Events rows are tagged by `site` (column F).

**Sheet columns:**

| Column | Field | Source |
|-|-|-|
| A | Event / email | `(page view)`, `(cta: action_name)`, `(dwell: N)`, or real form-submission email |
| B | Page | `document.title` (or campaign tag for email-link events) |
| C | Timestamp | Server-side Melbourne time (`Australia/Melbourne`, formatted in Apps Script) |
| D | IP | Client-side lookup via `api.ipify.org` |
| E | Referrer | `document.referrer` |
| F | Site | `marketing`, `resources`, or `email` (empty for rows written before `track.js` shipped) |
| G | Recipient | Email of the newsletter recipient who opened/clicked an email link (empty for site events) |
| H | UserAgent | `navigator.userAgent` from the visitor's browser. Passed via `&ua=` URL param because Apps Script `doGet` can't read request headers. Used by the newsletter dashboard view to flag scanner traffic. Empty for image-beacon opens (email pixels can't run JS) and rows written before UA capture shipped |
| I | Reason | Optional unsubscribe-form reason — populated only on `(cta: email_unsubscribe_click)` rows |
| J | Comment | Optional unsubscribe-form free-text comment — same trigger as I |

**Event types** (in column A):
- `(page view)` — fires on `tenziTrack.init()`
- `(dwell: N)` — seconds the tab was visible; fires on `pagehide`, visibility-aware, skipped below 2s, capped at 3600s
- `(cta: subscribe_click)` — clicked Subscribe (modal opened, may not have submitted)
- `(cta: request_copy_click)` — clicked Request a Copy on a runbook
- `(cta: book_chat_click)` — clicked Book a chat (Cal.com)
- `(cta: PREMIUM_get_full_report_click)` — clicked premium "Get the full report"
- `(cta: PREMIUM_book_call_click)` — clicked premium "Book a call to discuss"
- `(cta: linkedin_click)` — clicked "Join the conversation" on a free report/runbook
- `(cta: PREMIUM_linkedin_click)` — clicked "Join the conversation" on a premium sample
- `(cta: email_click)` — default action for newsletter click-tracking redirects (recipient in column G; site=`email`)
- `(cta: email_open)` / `email_report_click` / `email_premium_health_click` / `email_book_chat_click` / `email_resources_click` / `email_website_click` / `email_linkedin_click` — newsletter-email events (open pixel + the six labelled CTAs); recipient in column G, campaign id in column B
- `(cta: email_unsubscribe_click)` — newsletter recipient hit `/unsubscribe/` and clicked the confirm button (recipient in column G; campaign in B; optional reason/comment in I/J)
- Real email — form submission (Events sheet) or contact form (Contacts sheet)

Compare CTA click counts vs actual form submissions to measure drop-off per page. Column F lets Looker Studio slice by origin site.

**How it works:**
- `tenziTrack.init({ site: 'resources' })` fires `(page view)` and starts a visibility-aware dwell timer.
- `tenziTrack.trackCta(action)` — GET beacon via `Image()`; global alias `window.trackCta` is defined for inline `onclick` attributes.
- `tenziTrack.postForm({ email, source })` — POST with `mode: 'no-cors'`; auto-adds page/timestamp/referrer/site/ip.
- Dwell on `pagehide` uses `fetch({ keepalive: true })` so the request survives unload. Falls back to an `Image()` beacon where unsupported.
- Success UI shows immediately without waiting for a response. IP lookup is best-effort.

**Updating the Apps Script:**
1. Edit [`apps-script.gs`](./apps-script.gs) in this repo (source of truth) and commit the change.
2. Paste the new contents into the Apps Script editor (linked Google Sheet > Extensions > Apps Script).
3. Deploy > Manage deployments > edit existing > set version to "New version" > Deploy.

## Newsletter integration

The `tenzi-newsletter` repo (separate, private) sends a monthly HTML email
that hits this site's tracking endpoint. Two static pages live here purely
for newsletter use:

- **`/r/index.html`** — click-tracking redirect. Reads
  `?to=<dest>&action=<cta>&recipient=<email>&campaign=<id>` from the URL,
  fires a beacon to the Apps Script `doGet` (writes a row tagged `site=email`
  with recipient in column G), then `location.replace`s to `to`. Same
  allowlist as `apps-script.gs` (`tenzi.ai`, `linkedin.com`, `cal.com` plus
  subdomains). Routing through this page rather than the Apps Script's own
  `?redirect=` mode keeps visitors on `resources.tenzi.ai` instead of the
  Apps Script wrapper at `script.google.com`.
- **`/unsubscribe/index.html`** — opt-out page with an explicit
  "Yes, unsubscribe me" confirm button. Required to defeat corporate email
  security scanners (Mimecast, MS Defender Safe Links, Proofpoint) that
  pre-fetch every URL in incoming emails — they fetch the HTML but don't
  simulate UI clicks, so the beacon doesn't fire. After click: writes
  `(cta: email_unsubscribe_click)` to Events.

Both pages are pure GitHub Pages static HTML, no build step. Apps Script is
only the beacon receiver. The `apps-script.gs` `?redirect=` mode and
`ALLOWED_REDIRECT_HOSTS` are dead code now (kept as a fallback) — newsletter
clicks don't go through them.

## Dashboard

The same Apps Script web app exposes a private analytics dashboard with two views, switchable via a "View: Site / Newsletter" toggle in the filter bar of either page:

- **Site** (`?view=dashboard&token=<TOKEN>`) — KPIs, daily activity chart with hover tooltips, top pages, CTA breakdown, dwell stats, recent contacts, top external referrers.
- **Newsletter** (`?view=newsletter&token=<TOKEN>`) — campaign selector, per-campaign KPI strip (real + raw side-by-side: engaged subscribers, opens, clicks, unsubscribes, plus open rate + click-through), CTA breakdown, hour-by-hour activity for the first 48h after send, recipient activity, suspicious-rows panel, cross-campaign overview, and the Recent subscribers + Recent unsubscribes lists. Filters scanner noise via the `realSubscribers`/`realCampaigns`/UA cross-validation described in [`DASHBOARD.md`](./DASHBOARD.md).

Every list paginates at 15 rows. Token-gated, server-rendered HTML in the same Terminal Grid (Light) style as the rest of the site. Full reference: [`DASHBOARD.md`](./DASHBOARD.md).

## Adding a new page

Every page must have all of the following:

1. Create a self-contained HTML file (inline CSS, no build step)
2. Copy the nav bar (back-link + Tenzi logo SVG) from an existing page
3. Add the shared-tracker block at the bottom of `<body>`:
   ```html
   <script src="https://tenzi.ai/track.js"></script>
   <script>tenziTrack.init({ site: 'resources' });</script>
   ```
4. Add a CTA appropriate to the page type:
   - **Runbooks** → "Request a Copy" modal, `trackCta('request_copy_click')`
   - **Free reports** → "Subscribe to updates" modal, `trackCta('subscribe_click')`
   - **Premium samples** → Cal.com link, `trackCta('PREMIUM_get_full_report_click')` or `trackCta('PREMIUM_book_call_click')`
   - **LinkedIn "Join the conversation"** (when a post exists) → secondary button in the header paired with the primary CTA, `trackCta('linkedin_click')` or `trackCta('PREMIUM_linkedin_click')`
5. Add a tile linking to it in `index.html` inside the matching grid:
   - `.tile-data` inside `.data-grid` — free reports/dashboards
   - `.tile-runbook` inside `.runbook-grid` — runbooks
   - `.tile-premium` inside `.premium-grid` — premium samples (green "Premium" pill in the tile foot)
6. Push to `main`

See `CLAUDE.md` for operational detail (tracking script, modal HTML, endpoint) and `DESIGN_STANDARD.md` for visual/layout rules.

## Design notes

Visual/typographic/layout rules are codified in [`DESIGN_STANDARD.md`](./DESIGN_STANDARD.md) under the name **"Terminal Grid (Light)"**. Quick summary:

- No frameworks — each page is a single self-contained HTML file with inline styles
- Fonts: `Inter Tight` (body/display) + `IBM Plex Mono` (eyebrows, numerals, labels) via Google Fonts
- Cream background (`#faf8f4`), white panels, single green accent (`#2ca471`) on CTAs and emphasis
- Teal ramp (`#0F766E` → `#5EEAD4`) only inside data visualisations; phase hues only on runbook step cards
- Premium pills use the Tenzi rainbow gradient (pink → orange → purple → cyan)
- Responsive breakpoints: 820px (KPI rows collapse) and 700px (tighter padding)

## Data sources

- **ASIC Financial Advisers Register** — AFS Licensee and Authorised Representative CSVs from data.gov.au
- **ABS** — Population data for per-capita calculations
- Analysis scripts live in the `ar-dataset/` folder of the `python-scrapbook` repo

## Links

- Cal.com booking: https://cal.com/roshan-khozouei/30min
- Contact: roshan@tenzi.ai
