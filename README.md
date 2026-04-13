# Tenzi Resources

Free data insights, dashboards, and runbooks for Australian GI brokers and licensees.

Live at **https://resources.tenzi.ai**

## Pages

- **Resources index** (`index.html`) — Landing page linking to all resources
- **GI Broker Movement Dashboard** (`gi-broker-movement-dashboard.html`) — Monthly AR movement analysis: who's growing, shrinking, and where brokers are moving between AFSLs
- **Profile of the Average GI Broker AR** (`gi-broker-ar-profile.html`) — State distribution, tenure, AFSL loyalty stats, and record holders
- **New Business / Quotes Runbook** (`new-business-quoting-runbook.html`) — End-to-end broker workflow from enquiry to binding

## Hosting

GitHub Pages from `main` branch with custom domain (`resources.tenzi.ai`). HTTPS enforced. Push to `main` and it deploys automatically.

## Analytics

Every page tracks page views and email signups via a Google Apps Script endpoint that writes to a Google Sheet.

**What's collected:**

| Column | Field | Source |
|-|-|-|
| A | Email | Form input, or `(page view)` for visits |
| B | Page | `document.title` |
| C | Timestamp | `new Date().toISOString()` |
| D | IP | Client-side lookup via `api.ipify.org` |
| E | Referrer | `document.referrer` |

**How it works:**
- Page views fire a GET request via an `Image()` beacon
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
3. Add page view tracking script with IP (via `api.ipify.org`) and referrer (`document.referrer`) — copy the standard block from any existing page
4. Add a CTA that collects email addresses via modal — "Request a Copy" for runbooks, "Subscribe to updates" for free reports. Premium samples can link to Cal.com instead.
5. Add a card linking to it in `index.html`
6. Push to `main`

## Design notes

- No frameworks — each page is a single HTML file with inline styles
- Fonts: DM Sans + JetBrains Mono (Google Fonts). Runbook uses Inter.
- Primary accent: deep teal (`#0F766E`), chosen to complement the Tenzi logo
- Movement dashboard uses forest green (`#1A5E45`)
- Responsive at 700px breakpoint

## Data sources

- **ASIC Financial Advisers Register** — AFS Licensee and Authorised Representative CSVs from data.gov.au
- **ABS** — Population data for per-capita calculations
- Analysis scripts live in the `ar-dataset/` folder of the `python-scrapbook` repo

## Links

- Cal.com booking: https://cal.com/roshan-khozouei/30min
- Contact: roshan@tenzi.ai
