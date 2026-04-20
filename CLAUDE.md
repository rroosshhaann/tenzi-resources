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

| Page type | Theme | CTA pattern |
|-|-|-|
| Index landing | Warm beige | "Subscribe to updates" modal + "Book a chat" → Cal.com |
| Free reports | Forest green / Deep teal | "Subscribe to updates" modal |
| Runbooks | Warm beige | "Request a Copy" modal |
| Premium samples | Tenzi rainbow gradient pill | "Get the full report" / "Book a call" → Cal.com |

Every page has: back-link to index, Tenzi logo in nav bar, page view tracking, CTA click tracking.

## Design system

- Self-contained HTML files — no build step, no external CSS/JS frameworks
- Fonts: DM Sans (body) + JetBrains Mono (data values) via Google Fonts. Runbooks use Inter.
- Tenzi logo: inline SVG (exported from Inkscape). Gradient arcs: pink (#EC2BA6) → orange (#F69068) and purple (#762BB7) → cyan (#2FC2EF). Wordmark: dark navy (#1C233C).
- Primary accent: deep teal (#0F766E) — chosen to complement logo and convey insurance trust. Used on AR profile page.
- Movement dashboard uses forest green (#1A5E45). Runbooks use blue (#2563EB) for CTA.
- Premium pills use the Tenzi rainbow gradient: `linear-gradient(135deg, #EC2BA6, #F69068, #762BB7, #2FC2EF)`
- Responsive: breakpoint at 700px.
- Card layout: eyebrow row contains category text on left + tag/pill right-aligned. Arrow `→` is a CSS `::after` pseudo-element bottom-right (no extra HTML row needed).

## Analytics and tracking

All pages track via a Google Apps Script endpoint that writes to a Google Sheet.

**Endpoint:** `https://script.google.com/macros/s/AKfycbzO6crfhklS6kIOXOGNIBBSk9ZiIUdM1lESOw6hGkqfE7qxz9MbVz47_ydAitFyFQtW/exec`

**Sheet columns:** A=email, B=page, C=timestamp (Melbourne time), D=ip, E=referrer

### Event types in the email column

| Email value | What it means |
|-|-|
| `(page view)` | Visitor loaded the page |
| `(cta: subscribe_click)` | Clicked Subscribe button (modal opened — may not have submitted) |
| `(cta: request_copy_click)` | Clicked Request a Copy button on a runbook |
| `(cta: book_chat_click)` | Clicked Book a chat (Cal.com link) |
| `(cta: PREMIUM_get_full_report_click)` | Clicked "Get the full report" header button on premium sample |
| `(cta: PREMIUM_book_call_click)` | Clicked "Book a call to discuss" CTA on premium sample |
| Real email address | Form submission (subscribe or request copy) |

Compare CTA click counts vs actual form submissions to measure drop-off.

### Standard tracking script (copy into every new page)

```html
<script>
function trackBeacon(eventName) {
  var url = 'https://script.google.com/macros/s/AKfycbzO6crfhklS6kIOXOGNIBBSk9ZiIUdM1lESOw6hGkqfE7qxz9MbVz47_ydAitFyFQtW/exec?email=' + encodeURIComponent(eventName) + '&page=' + encodeURIComponent(document.title);
  fetch('https://api.ipify.org?format=json').then(function(r){return r.json()}).then(function(d){
    new Image().src = url + '&ip=' + encodeURIComponent(d.ip) + '&ref=' + encodeURIComponent(document.referrer);
  }).catch(function(){
    new Image().src = url + '&ref=' + encodeURIComponent(document.referrer);
  });
}
function trackCta(action) { trackBeacon('(cta: ' + action + ')'); }
trackBeacon('(page view)');
</script>
```

### Wiring CTA buttons

Every CTA button needs `onclick="trackCta('action_name'); ..."` prepended to its existing onclick:

```html
<!-- Modal-opening button -->
<button onclick="trackCta('subscribe_click'); document.getElementById('subscribeModal').classList.add('open')">

<!-- Cal.com link (premium) -->
<a href="https://cal.com/roshan-khozouei/30min" target="_blank" onclick="trackCta('PREMIUM_book_call_click')">
```

### Apps Script (for reference, lives in the linked Google Sheet)

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  var melbTime = Utilities.formatDate(new Date(), 'Australia/Melbourne', 'yyyy-MM-dd HH:mm:ss');
  sheet.appendRow([data.email, data.page, melbTime, data.ip || '', data.referrer || '']);
  return ContentService.createTextOutput('ok');
}

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var melbTime = Utilities.formatDate(new Date(), 'Australia/Melbourne', 'yyyy-MM-dd HH:mm:ss');
  sheet.appendRow([e.parameter.email || '(page view)', e.parameter.page || '', melbTime, e.parameter.ip || '', e.parameter.ref || '']);
  return ContentService.createTextOutput('ok');
}
```

After editing the script: Deploy > Manage deployments > edit > New version > Deploy (keeps same URL).

### Form submissions

Form POSTs include the same fields plus the actual email:
```javascript
var data = { email: email, page: document.title, timestamp: new Date().toISOString(), ip: visitorIp, referrer: document.referrer };
fetch(endpoint, { method: 'POST', body: JSON.stringify(data), mode: 'no-cors' }).catch(function(){});
```

Note: server-side `melbTime` overrides `data.timestamp` for consistency. Show success view immediately without waiting for response.

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
2. **Page view tracking + CTA tracking helper** — paste the standard tracking script block (see Analytics section above) at the bottom of the page. Includes `trackBeacon`, `trackCta`, and the page view fire.
3. **CTA buttons** — every page must have a call-to-action. Each CTA button must have `trackCta('action_name')` in its `onclick`:
   - **Runbooks**: "Request a Copy" button in header → opens `copyModal` with email form. Use `trackCta('request_copy_click')`.
   - **Free reports/dashboards**: "Subscribe to updates" button in header → opens `subscribeModal`. Use `trackCta('subscribe_click')`.
   - **Premium samples**: "Get the full report" + "Book a call" → links to Cal.com. Use `trackCta('PREMIUM_get_full_report_click')` and `trackCta('PREMIUM_book_call_click')`. PREMIUM_ prefix is mandatory for filtering.
   - **Index page Book a chat**: `trackCta('book_chat_click')`.
4. **Email modal (for subscribe/copy CTAs)** — copy modal HTML and form submission script from an existing page. Form data must include `email`, `page`, `timestamp`, `ip`, `referrer`. Use `mode: 'no-cors'` and show success view immediately.
5. **Card on index.html** — add a card linking to the new page with appropriate theme class:
   - `theme-green` — free data/reports
   - `theme-warm` — operational runbooks
   - `theme-premium` — premium samples (uses Tenzi rainbow gradient pill)
6. **Self-contained HTML** — inline CSS, no build step, no external frameworks
7. Commit and push to `main` — GitHub Pages deploys automatically
