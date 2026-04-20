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
5. Add a card linking to it in `index.html` with the appropriate theme:
   - `theme-green` for free data/reports
   - `theme-warm` for runbooks
   - `theme-premium` for premium samples
6. Push to `main`

See `CLAUDE.md` for full code snippets.

## Design notes

- No frameworks — each page is a single HTML file with inline styles
- Fonts: DM Sans + JetBrains Mono (Google Fonts). Runbooks use Inter.
- Primary accent: deep teal (`#0F766E`), chosen to complement the Tenzi logo
- Movement dashboard uses forest green (`#1A5E45`)
- Premium pills use the Tenzi rainbow gradient (pink → orange → purple → cyan)
- Responsive at 700px breakpoint

## Data sources

- **ASIC Financial Advisers Register** — AFS Licensee and Authorised Representative CSVs from data.gov.au
- **ABS** — Population data for per-capita calculations
- Analysis scripts live in the `ar-dataset/` folder of the `python-scrapbook` repo

## Links

- Cal.com booking: https://cal.com/roshan-khozouei/30min
- Contact: roshan@tenzi.ai
