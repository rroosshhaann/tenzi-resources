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

## Adding a new page — MANDATORY checklist

Every page on the site MUST have all of the following. No exceptions.

1. **Nav bar** — back-link on left, Tenzi logo SVG on right. Copy from an existing page. Back-link href should use `../index.html` for pages in subfolders.
2. **Page view tracking** — the IP + referrer beacon script at the bottom of the page. This is the standard block (copy from any existing page):
   ```html
   <script>
   fetch('https://api.ipify.org?format=json').then(function(r){return r.json()}).then(function(d){
     new Image().src = 'https://script.google.com/macros/s/AKfycbzO6crfhklS6kIOXOGNIBBSk9ZiIUdM1lESOw6hGkqfE7qxz9MbVz47_ydAitFyFQtW/exec?email=(page view)&page=' + encodeURIComponent(document.title) + '&ip=' + encodeURIComponent(d.ip) + '&ref=' + encodeURIComponent(document.referrer);
   }).catch(function(){
     new Image().src = 'https://script.google.com/macros/s/AKfycbzO6crfhklS6kIOXOGNIBBSk9ZiIUdM1lESOw6hGkqfE7qxz9MbVz47_ydAitFyFQtW/exec?email=(page view)&page=' + encodeURIComponent(document.title);
   });
   </script>
   ```
3. **CTA with email collection** — every page must have a call-to-action that collects an email address via modal. The type depends on the page:
   - **Runbooks**: "Request a Copy" button in header → `copyModal` with email form
   - **Free reports/dashboards**: "Subscribe to updates" button in header → `subscribeModal` with email form
   - **Premium samples**: "Get the full report" / "Book a call" button linking to Cal.com (no modal needed, but page view tracking is still required)
   - Form submissions must include: `email`, `page` (document.title), `timestamp`, `ip` (visitorIp), `referrer` (document.referrer)
   - IP is fetched on page load into a `visitorIp` variable, then included in POST body
   - Use `mode: 'no-cors'` for fetch, show success immediately without waiting for response
4. **Card on index.html** — add a card linking to the new page with appropriate theme class (`theme-green` for data, `theme-warm` for operations)
5. **Self-contained HTML** — inline CSS, no build step, no external frameworks
6. Commit and push to `main` — GitHub Pages deploys automatically
