# Tenzi Resources

Free data insights, dashboards, and runbooks for Australian GI brokers and licensees.

Live at **https://resources.tenzi.ai**

## Pages

```
tenzi-resources/
  index.html              Central landing page
  reports/                Free analytics reports
  runbooks/               Free operational runbooks
  premium-samples/        Samples of premium paid reports
```

**Free reports** (`reports/`)
- **GI Broker Movement Dashboard** — Monthly AR movement analysis: who's growing, shrinking, and where brokers are moving between AFSLs
- **Profile of the Average GI Broker AR** — State distribution, tenure, AFSL loyalty stats, and record holders

**Runbooks** (`runbooks/`)
- **New Business / Quotes** — End-to-end broker workflow from enquiry to binding
- **Renewals** — Identification through market review, recommendation, and binding
- **Claims Management** — First notice of loss through to resolution and file closure

**Premium samples** (`premium-samples/`)
- **GI Broker AFSL Race Chart** — Animated 24-month view of the Top 20 GI broker networks
- **Resilium AR Flow Analysis** — 48 months of inbound/outbound AR movement for a single AFSL
- **PSC Connect AR Flow Analysis** — 48 months of AR movement showing McLardy McShane capturing 57% of traceable departures

## Hosting

GitHub Pages from `main` branch with custom domain (`resources.tenzi.ai`). HTTPS enforced. Push to `main` and it deploys automatically.

## Analytics

Every page tracks page views, CTA clicks, and email signups via a Google Apps Script endpoint that writes to a Google Sheet.

**Sheet columns:**

| Column | Field | Source |
|-|-|-|
| A | Email | Form input, `(page view)`, or `(cta: action_name)` |
| B | Page | `document.title` |
| C | Timestamp | Server-side Melbourne time (`Australia/Melbourne`, formatted in Apps Script) |
| D | IP | Client-side lookup via `api.ipify.org` |
| E | Referrer | `document.referrer` |

**Event types** (in the email column):
- `(page view)` — visitor loaded the page
- `(cta: subscribe_click)` — clicked Subscribe (modal opened, may not have submitted)
- `(cta: request_copy_click)` — clicked Request a Copy on a runbook
- `(cta: book_chat_click)` — clicked Book a chat (Cal.com)
- `(cta: PREMIUM_get_full_report_click)` — clicked premium "Get the full report"
- `(cta: PREMIUM_book_call_click)` — clicked premium "Book a call to discuss"
- `(cta: linkedin_click)` — clicked "Join the conversation" on a free report/runbook
- `(cta: PREMIUM_linkedin_click)` — clicked "Join the conversation" on a premium sample
- Real email — form submission

Compare CTA click counts vs actual form submissions to measure drop-off per page.

**How it works:**
- Page views and CTA clicks fire a GET request via an `Image()` beacon
- Form submissions use `fetch()` POST with `mode: 'no-cors'`
- Success is shown immediately without waiting for a response
- IP lookup is best-effort — tracking still fires if it fails

**Updating the Apps Script:**
1. Open the linked Google Sheet > Extensions > Apps Script
2. Edit `doGet(e)` and/or `doPost(e)`
3. Deploy > Manage deployments > edit existing > set version to "New version" > Deploy

## Adding a new page

Every page must have all of the following:

1. Create a self-contained HTML file (inline CSS, no build step)
2. Copy the nav bar (back-link + Tenzi logo SVG) from an existing page
3. Add the standard tracking script block (with `trackBeacon`, `trackCta`, and page view fire) — copy from any existing page
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
