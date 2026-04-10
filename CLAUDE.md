# Tenzi Resources

Free data insights, dashboards, and runbooks for Australian GI brokers and licensees.
Hosted on GitHub Pages at `https://resources.tenzi.ai`.

## Site structure

| File | Description | Palette | CTA |
|-|-|-|-|
| `index.html` | Central landing page, links to all resources | Warm beige | Subscribe modal |
| `gi-broker-movement-dashboard.html` | AR movement dashboard (Apr 2026) — KPIs, waterfall, AFSL tables, flows | Forest green | Subscribe button + bottom CTA banner |
| `gi-broker-ar-profile.html` | "Average AR" profile (Jan 2026) — state distribution, tenure, loyalty, records | Deep teal | Subscribe button |
| `new-business-quoting-runbook.html` | New business/quotes broker workflow (v2.0) — 5-phase step-by-step | Warm beige | "Request a Copy" modal |

Every page has: back-link to index, Tenzi logo in nav bar, page view tracking.

## Design system

- Self-contained HTML files — no build step, no external CSS/JS frameworks
- Fonts: DM Sans (body) + JetBrains Mono (data values) via Google Fonts. Runbook uses Inter.
- Tenzi logo: inline SVG (exported from Inkscape). Gradient arcs: pink/orange + purple/cyan. Wordmark: dark navy (#1C233C).
- Primary accent: deep teal (#0F766E) — chosen to complement logo and convey insurance trust. Used on AR profile page. Movement dashboard still uses forest green (#1A5E45).
- Responsive: breakpoint at 700px. Cards, KPI rows, and tables reflow to single column.
- Animations: `fadeUp` keyframe on cards with staggered delays.

## Analytics and tracking

All pages track via a Google Apps Script endpoint that writes to a Google Sheet.

**Endpoint:** `https://script.google.com/macros/s/AKfycbzO6crfhklS6kIOXOGNIBBSk9ZiIUdM1lESOw6hGkqfE7qxz9MbVz47_ydAitFyFQtW/exec`

**Sheet columns:** A=email, B=page, C=timestamp, D=ip, E=referrer

**Page views (GET via Image beacon):**
- Fetches visitor IP from `api.ipify.org` first, then fires beacon
- Params: `email=(page view)`, `page=<title>`, `ip=<ip>`, `ref=<document.referrer>`
- Falls back without IP if ipify is blocked

**Form submissions (POST via fetch, no-cors):**
- JSON body: `{ email, page, timestamp, ip, referrer }`
- IP is fetched on page load and stored in `visitorIp` variable
- Success shown immediately regardless of network outcome — don't block UX

**Apps Script functions:**
- `doGet(e)` — reads `e.parameter.email`, `.page`, `.ip`, `.ref`, appends row with `new Date().toISOString()` for timestamp
- `doPost(e)` — parses `e.postData.contents` as JSON, reads `.email`, `.page`, `.timestamp`, `.ip`, `.referrer`
- After editing the script: Deploy > Manage deployments > edit > New version > Deploy (keeps same URL)

## Hosting

- Repo: `rroosshhaann/tenzi-resources`
- GitHub Pages from `main` branch
- Custom domain: `resources.tenzi.ai` (CNAME file in repo root)
- HTTPS enforced, cert auto-renewed by GitHub (current cert expires 2026-07-08)
- DNS: A records pointing to GitHub Pages IPs (185.199.108-111.153)

## Data sources

Dashboard data comes from the `ar-dataset/` project in the `python-scrapbook` repo:
- ASIC AFS Licensee and AR register CSVs from data.gov.au
- ABS population data for per-capita calculations
- See `python-scrapbook` memory for corrected broker filter definition and data caveats

## Adding a new page

1. Create a self-contained HTML file with inline CSS
2. Include the Tenzi logo SVG in the nav bar (copy from an existing page)
3. Add back-link: `<a class="back-link" href="index.html">&larr; All Resources</a>`
4. Add page view tracking script at bottom (copy from existing page)
5. If collecting emails: add subscribe modal + form submission script
6. Add a card linking to the new page in `index.html`
7. Commit and push to `main` — GitHub Pages deploys automatically
