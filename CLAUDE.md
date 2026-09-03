# Tenzi Resources

Free data insights, dashboards, and runbooks for Australian GI brokers and licensees.
Hosted on GitHub Pages at `https://resources.tenzi.ai`.

## Site structure

```
tenzi-resources/
  index.html                              # Central landing page
  og.png                                  # 2400×1260 social share card — every page's og:image points at it
  og-frame.html                           # source frame for og.png — see "Share card & search registration" below
  robots.txt                              # permissive (AI crawlers welcome); blocks /r/ + /unsubscribe/; points at sitemap
  sitemap.xml                             # every content page — add new pages here with lastmod
  llms.txt                                # site summary for AI assistants
  reports/                                # Free analytics reports
    gi-broker-movement-dashboard.html     # Q1 (Jan→Apr) 3-month window — restyled to match the monthly aesthetic
    gi-broker-movement-april-2026.html    # Monthly cadence (31 Mar → 30 Apr) — deeper-green / DM Sans variant
    gi-broker-movement-may-2026.html      # Monthly cadence
    gi-broker-movement-june-2026.html     # Monthly cadence
    gi-broker-movement-july-2026.html     # Monthly cadence
    gi-broker-movement-august-2026.html   # Monthly cadence (31 Jul → 31 Aug) — current index tile for the monthly series
    gi-broker-movement-august-2026.thumb.jpg # index tile thumbnail (AR + CAR view: KPI strip + population bridge)
    # Monthly build: the generator (python-scrapbook change-report/<prev>-<next>/<Month> 2026.html) emits
    # the bare dashboard only. Copy it here, then apply the portal layer — head metadata, Dataset JSON-LD,
    # nav + logo, header CTA group, prev-report row, Headline insights, subscribe strip + footer, modal,
    # track.js block. Fastest route: diff the previous month's raw file against its published version to
    # see the exact additions — but build the new month FROM its own raw file, never by 3-way merging onto
    # the previous month: the raw files get regenerated in place after publication, so their numbers drift
    # from what was published (raw June closes at 5,657 ARs+CARs, published June at 5,884).
    # Thumbnail: serve the repo, strip .nav-bar/.prev-report-row/.cta-group/
    # insights via injected JS, click the AR + CAR scope button, screenshot 1000x1000 @2x, crop the
    # 960x832 CSS-px content box and resize to 800px wide.
    gi-broker-ar-profile.html
    gi-broker-top20-metrics.html          # "Top 20 GI Broker Networks — Metric Review (August 2026)" — metric heatmap with size bars behind the network names, AR/CAR/combined toggle, Jul/Jun month-end headcount columns behind a hide/show button (Aug 2026 refresh of the FY2026 year-end edition). Keeps its own dashboard design (not Terminal Grid); the index SPECIAL REPORT section (first section, full-width tile, data_top20_click). REGEN, in full: generate_review.py --ref-month 2026-08 --top 20 --title "Top 20 GI Broker Networks — Metric Review (August 2026)" --portal --linkedin https://www.linkedin.com/posts/roshan-khozouei_if-youre-interested-into-some-additional-share-7495730625019301888-v9S7 --out <this path> — every flag matters, see the design-exception note below
    gi-broker-top20-metrics.thumb.jpg     # index tile thumbnail (cropped from the metric heatmap)
    gi-broker-whitespace-map.html         # Interactive whitespace map — business growth vs broker coverage by SA4 (linked map + quadrant, state zoom, all/employing-businesses toggle, employing split + top-3 growth industries in hovers). Keeps its own dashboard design (teal, change-report family). Tiled in the PREMIUM grid on the index (first tile, premium_whitespace_click) though the page itself keeps the free-report subscribe CTA; also in sitemap + llms.txt. Regen from python-scrapbook: geo-coverage/generate_interactive.py --portal --out <this path> — the generator emits the FULL page standard (nav, tracking, subscribe CTA+modal+strip, head metadata + Dataset JSON-LD), so regens are idempotent, no manual re-patching
    gi-broker-whitespace-map.thumb.jpg    # index tile thumbnail (cropped from the national whitespace map PNG)
  runbooks/                               # Free operational runbooks
    new-business-quoting-runbook.html
    renewals-runbook.html
    claims-management-runbook.html
  premium-samples/                        # Sample of premium paid reports
    index.html                            # Premium sample library — lists ALL 11 premium items (incl. the whitespace map, which lives in reports/). The index premium grid is capped at ONE row: the 3 newest samples + an "Every premium sample" card linking here (premium_view_all_click) — deliberately short so Market data / Runbooks / About aren't pushed below the fold. Card trackCta names match the index tiles, so clicks aggregate per sample across both pages — the Events Page column tells them apart. ADD NEW SAMPLES HERE AS WELL AS (or instead of) the index grid
    afsl-health-leaderboard.html          # GI broker network health score leaderboard (April 2026)
    gi-broking-network-threshold.html     # How many ARs make a broking network (July 2026) — 5+ threshold split, concentration long tail, 10yr licensee structure. Charts from python-scrapbook: niba-analytics/outputs/linkedin_niba_0{1,2,3}_*_202607.png. SOURCE CONSTRAINT: the niba-analytics folder is a NIBA-engagement exploration spike marked aggregate-only, no league tables — the three published charts carry no network names, so keep it that way; do NOT pull named-network detail from the internal strawman_*/niba_panel CSVs. The three charts sit in a horizontal slideshow (scroll-snap track + mini-image tabs + accent arrows; touch swipe and no-JS both degrade fine). The site copies of the PNGs are RE-PROCESSED in two steps: (1) collapse runs of entirely-background rows >=60px down to 40px — cuts 7-19% of height, since the 4:5 LinkedIn format leaves big dead bands; (2) pad each back out SYMMETRICALLY to a common 1500x1736 canvas (1:1.157 portrait). Step 2 matters: equal ratios keep the slideshow frame and arrows from jumping between slides, and centred padding reads as a margin rather than the bottom-heavy blob the raw exports have. Re-copying from python-scrapbook silently undoes both; re-run them if you refresh the charts
    gi-top-network-ar-share.html          # How much the top networks hold (July 2026) — companion to the threshold page, same NIBA source + same constraint. Concentration curve (share of ARs vs network-size threshold, log x) + top-60 rank table; charts 04/05 of the same linkedin_niba_* set, same tighten+pad treatment on a 1500x1828 canvas. The top-60 table is names-excluded, so it does NOT breach the no-league-tables rule
    gi-emerging-network-growth.html       # Who are the emerging networks (Jul 2023 → Jul 2026) — third NIBA page, same source + same no-names constraint. Built from the 14 Aug 2026 LinkedIn post; charts 08 (emerging cohort stacked area) + 06 (gains-vs-offsets waterfall, shared with the incumbent page), same tighten+pad treatment. Charts 06/07/08 share ONE 1500x1682 canvas so both pages' slide tabs use the same aspect ratio. Took the threshold page's index tile in Sep 2026 (premium_emerging_growth_click); the threshold page stays in the library
    gi-incumbent-network-growth.html      # How skewed is AR network growth (Jul 2023 → Jul 2026) — fourth NIBA page, from the 13 Aug 2026 post; charts 07 (incumbent growers ranked, unnamed) + 06. Took the ar-share page's index tile in Sep 2026 (premium_incumbent_growth_click); the ar-share page stays in the library
    gi-broker-race-chart.html             # Top 20 GI broker AFSLs (24mo)
    psc-connect-ar-flow.html              # PSC Connect AR flow analysis (48mo)
    resilium-ar-flow.html                 # Resilium AR flow analysis (48mo)
    senior-broker-quadrant.html           # Senior broker quadrant (May 2026)
    sphere-regis-ar-flow.html             # Sphere & Regis, one week of movement (June 2026)
    *.gif                                 # Embedded chart assets
  unsubscribe/                            # Newsletter unsubscribe landing
    index.html                            # Reads ?recipient= + ?campaign= from URL, requires confirm-button click, then fires (cta: email_unsubscribe_click) with recipient in column G + optional reason/comment in columns I/J
  r/                                      # Newsletter click-tracking redirect
    index.html                            # Reads ?to=&action=&recipient=&campaign=, fires beacon, then location.replace to ?to (allowlisted hosts only)
  tenzi-blue-transparent.png              # 741×291 RGBA logo asset used by the newsletter email header (sits on cream #faf8f4 background cleanly)
  tenzi-blue.svg                          # logo (arcs + wordmark), used by og-frame.html
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
- `Events` — A=event, B=page, C=timestamp (Melbourne time), D=ip, E=referrer, F=site (`marketing` / `resources` / `partner` / `email`), G=recipient, H=user-agent (URL-param, used to flag scanner traffic), I=reason, J=comment (optional unsubscribe-form fields, populated only on `(cta: email_unsubscribe_click)` rows where the visitor filled them in). All page views, CTA clicks, dwell events, resources-site form submissions, and email-link click-tracking land here. Rows written before `track.js` shipped have an empty F. Rows older than the email-link redirect feature have an empty G. Rows older than the UA-capture / unsubscribe-reason features have empty H / I / J. Site value `partner` tags rows from `partner.tenzi.ai` (the `tenzi-onboarding` repo). Site value `email` tags rows generated by the newsletter click-tracking redirect (`?redirect=`); the matching recipient identity sits in column G. Column G is also populated on `resources` / `marketing` rows when the visit arrived through a newsletter link — `/r/` hands the recipient to tenzi.ai destinations via `?tzr=` and `track.js` carries it for the rest of the tab session — and on `partner` rows via `init({ user })`.
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
| `(cta: email_click)` | Default action for newsletter click-tracking redirects (when the email-link URL omits an explicit `email` param). Recipient identity in column G; site=`email` |
| `(cta: email_open)` | Newsletter open-pixel fired (image beacon — no UA captured because email pixels can't run JS). Recipient in column G; campaign id in B |
| `(cta: email_report_click)` | Clicked the primary "Read the report" CTA button in the newsletter email |
| `(cta: email_report_image_click)` | Clicked the report thumbnail image in the newsletter email |
| `(cta: email_premium_<sample>_click)` | Clicked a premium-sample CTA button in the newsletter email — one action per featured sample (e.g. `email_premium_threshold_click`), with an `_image_click` variant for the thumbnail. Changes each campaign; canonical list in the `tenzi-newsletter` README. Older campaigns used the generic `email_premium_sample_click` / `email_premium_health_click` |
| `(cta: email_explore_resources_click)` | Clicked the "Browse the library" CTA in the newsletter |
| `(cta: email_book_chat_click)` | Clicked the "Book a 30-min chat" CTA in the newsletter (Cal.com) |
| `(cta: email_resources_click)` | Clicked the footer resources link in the newsletter |
| `(cta: email_website_click)` | Clicked the header logo / footer `tenzi.ai` link in the newsletter |
| `(cta: email_linkedin_click)` | Clicked the LinkedIn link in the newsletter footer |
| `(cta: email_linkedin_<post>_click)` | Clicked a "Join the conversation" post link in the newsletter body — one action per featured post, changes each campaign; the canonical list lives in the `tenzi-newsletter` README |
| `(cta: email_unsubscribe_click)` | Newsletter recipient hit the unsubscribe page AND clicked the confirm button. Recipient email in column G; campaign tag in B. Surfaced in the dashboard's Recent unsubscribes panel — filter Events for this action to get the opt-out list |
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

### Newsletter integration (static pages)

The `tenzi-newsletter` repo (private, `rroosshhaann/tenzi-newsletter`) sends a
monthly HTML email that hits this site's tracking endpoint. Two static pages
live here purely for newsletter use:

**`/r/index.html`** — click-tracking redirect.
- URL shape: `https://resources.tenzi.ai/r/?to=<dest>&action=<cta>&recipient=<email>&campaign=<id>`
- Fires a beacon to the Apps Script `doGet` (`?email=(cta:&nbsp;<action>)&page=<campaign>&recipient=<email>&site=email`) via `fetch({ keepalive: true })` with an `Image()` fallback, then `window.location.replace(to)`.
- Before redirecting to a `tenzi.ai` destination it appends `?tzr=<recipient>` so `track.js` on the landing page attributes the visit (page view, dwell, CTAs) to the recipient in column G for the rest of the tab session. Third-party destinations (LinkedIn, Cal.com) never receive the identity param, and `track.js` strips `tzr` from the URL immediately on load.
- Allowlist mirrored from `apps-script.gs` `ALLOWED_REDIRECT_HOSTS`: `tenzi.ai`, `linkedin.com`, `cal.com` plus subdomains. Anchored regex prevents host-spoof URLs.
- Deliberately routes through `resources.tenzi.ai` instead of the Apps Script's own `?redirect=` mode, so visitors briefly see the Tenzi domain rather than the `script.googleusercontent.com` iframe wrapper.

**`/unsubscribe/index.html`** — opt-out page with required confirm step.
- URL shape: `https://resources.tenzi.ai/unsubscribe/?recipient=<email>&campaign=<id>`
- Shows "Unsubscribe from Tenzi Monthly?" + recipient echoed back + green "Yes, unsubscribe me" button.
- Beacon **only** fires after button click — fires `(cta: email_unsubscribe_click)` to the same Apps Script doGet with recipient in column G. The form also offers an optional reason dropdown (`too_frequent` / `not_relevant` / `didnt_signup` / `decluttering` / `other`) and an optional ≤500-char free-text comment; both ride along on the beacon URL as `&reason=` / `&comment=` and land in columns I / J. Empty fields are omitted from the URL, not sent as blanks.
- The confirm step exists to defeat corporate email security scanners (Mimecast, MS Defender Safe Links, Proofpoint) that pre-fetch every URL in incoming emails and execute the page in sandbox browsers. They fetch the HTML but don't simulate UI clicks, so the beacon doesn't fire.

Both pages are pure GitHub Pages static HTML. No build step, no track.js (they fire their own beacons because they need to inject `recipient` into the URL — track.js doesn't support that). Apps Script is only the beacon receiver. The `apps-script.gs` `?redirect=` mode and `ALLOWED_REDIRECT_HOSTS`/`isAllowedRedirect_` are dead code now; left as a fallback but not used by current emails.

### Apps Script (source of truth: `apps-script.gs` in this repo)

Canonical source is [`apps-script.gs`](./apps-script.gs). The deployed script lives in the linked Google Sheet — after editing the file, paste it into the Apps Script editor and Deploy > Manage deployments > New version. Summary:

- `doPost(e)` — branches on `data.source === 'holding_page_contact'` (Contacts sheet + honeypot + rate limit + notify email) vs everything else (Events sheet).
- `doGet(e)` — branches on `e.parameter.view === 'dashboard'` (Site analytics view), `e.parameter.view === 'newsletter'` (Newsletter analytics view, scoped to Site=email rows with real-recipient + real-campaign cross-validation), `e.parameter.redirect=<url>` (legacy click-tracking redirect — dead code now that emails route through `/r/`), or the default tracking-beacon path (writes an Events row). All paths share the same web-app deployment.
- `writeEvent_(email, page, melbTime, ip, referrer, site, recipient, ua)` — appends to Events. Column F = site tag, G = recipient (newsletter only), H = User-Agent (passed via `&ua=` URL param because doGet can't read headers).
- `writeContact_(data, melbTime)` — appends to Contacts (11 cols including site).
- `isExcludedIp_` / `EXCLUDED_IPS` — silently drop rows from listed IPs.
- `withinRateLimit_` — PropertiesService-backed per-IP cap on contact submissions (5/hour).
- `renderDashboard_` and helpers — server-rendered Site-view HTML analytics built from Events + Contacts. Auth = secret token in URL (`DASHBOARD_TOKEN` constant). Hit at `<web-app-url>?view=dashboard&token=<TOKEN>&days=30&site=all`.
- `renderNewsletterDashboard_` / `computeNewsletterStats_` / `looksLikeBotUa_` and the `buildCampaign*` / `buildNewsletter*` / `buildSuspiciousTable_` helpers — Newsletter-view stack. Same auth, same CSS, scoped to `Site=email`. Filters scanner noise via three derived sets (`realSubscribers`, `realCampaigns` ≥ `NEWSLETTER_REAL_CAMPAIGN_THRESHOLD`, `NEWSLETTER_BOT_UA_REGEX`). Hit at `<web-app-url>?view=newsletter&token=<TOKEN>&days=90&campaign=<id>`.
- See "Dashboard" section below + [`DASHBOARD.md`](./DASHBOARD.md) for the full reference on both views.

### Dashboard

The deployed web app doubles as a private analytics dashboard with two views:
- **Site** — `?view=dashboard&token=<TOKEN>` (page views, dwell, CTAs, contacts, referrers). Default landing.
- **Newsletter** — `?view=newsletter&token=<TOKEN>` (per-campaign opens, clicks, unsubscribes, recipient activity, suspicious-rows panel — scoped to `Site=email`, cross-validated against the subscribe set + bot-UA regex). Recent subscribers + Recent unsubscribes lists live here.

A "View: Site / Newsletter" toggle in either view's filter bar links across. Token (`DASHBOARD_TOKEN` constant in the script) must NOT appear in `track.js`, page HTML, or commits — only in the bookmark.

Full reference — what's on each page, parameters, auth model, filter logic, code map, caveats, roadmap — lives in [`DASHBOARD.md`](./DASHBOARD.md). Update that doc whenever either view's layout, aggregation, or auth changes.

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

## Share card & search registration

- `og.png` (2400×1260) is rendered from `og-frame.html` at 2× — 1× cards come out blurry after LinkedIn's recompression. Procedure: serve the repo root (`python3 -m http.server 8123`), screenshot `http://localhost:8123/og-frame.html` with headless Chrome using `--force-device-scale-factor=2 --window-size=1200,630 --virtual-time-budget=10000`, copy the output over `og.png`. (Full command in the `tenzi-homepage` CLAUDE.md — same pipeline.) LinkedIn caches share images: re-scrape a changed page via LinkedIn Post Inspector.
- Search state (2026-07-03): covered by the `tenzi.ai` Google Search Console **domain property** (auto-verified via Workspace — no per-subdomain verification needed). `https://resources.tenzi.ai/sitemap.xml` submitted in GSC and Bing Webmaster. The Dataset JSON-LD on listed reports feeds Google Dataset Search; pickup typically takes days to a couple of weeks.
- `robots.txt` is deliberately permissive (AI crawlers welcome) apart from `/r/` and `/unsubscribe/` — don't add blanket Disallows.

## Data sources

Dashboard data comes from the `ar-dataset/` project in the `python-scrapbook` repo:
- ASIC AFS Licensee and AR register CSVs from data.gov.au
- ABS population data for per-capita calculations
- See `python-scrapbook/ar-dataset/CLAUDE.md` for filter definitions and data caveats

## Adding a new page — MANDATORY checklist

This applies to **content pages** — reports, runbooks, premium samples, and
the index. Utility pages (`/r/index.html` and `/unsubscribe/index.html`) are
explicitly **out of scope** for this checklist: they don't carry a nav bar,
don't load `track.js`, don't have a content CTA modal, and don't appear as
tiles on the index. They're functional plumbing for the newsletter, fully
documented in the "Newsletter integration (static pages)" section above. Do
not "fix" them by adding the missing pieces — that would break the
integration.

Every content page on the site MUST have all of the following. No exceptions.

**Design exception — `reports/gi-broker-top20-metrics.html`:** it keeps its source dashboard's own design rather than Terminal Grid (rule 6 relaxed), because it is generated wholesale by `python-scrapbook`. It IS listed like any other report (index tile, sitemap, llms.txt) as of Aug 2026 — direct-link-only before that. Republish with `generate_review.py --ref-month 2026-08 --top 20 --title "Top 20 GI Broker Networks — Metric Review (August 2026)" --portal --linkedin https://www.linkedin.com/posts/roshan-khozouei_if-youre-interested-into-some-additional-share-7495730625019301888-v9S7 --out tenzi-resources/reports/gi-broker-top20-metrics.html` — copy that line verbatim, every flag changes the output. **`--portal` now emits the FULL page standard** — head metadata (favicon / canonical / description / OG), nav bar + logo, LinkedIn + Subscribe CTAs, subscribe strip, modal and the track.js beacon — so regens are idempotent and need no manual re-patching (same model as the whitespace map). Two things to remember: **(a)** without `--top 20` the generator auto-detects the LARGEST top-N set on disk and will silently emit the top-40 page instead, since `top40_*_202606.csv` sit in the same folder; **(b)** `--linkedin` sets the header "Join the conversation" target and defaults to the Tenzi COMPANY PAGE, so omitting it silently downgrades the button from the post to the company page. Each edition gets its own post, so update the URL in the command above when you publish a new one (strip the `?utm_source=…&rcm=…` tail). **(c)** `<title>`/`<h1>`/OG all use a name derived from the ref month — "Top 20 AR Networks for FY 2026" for a June ref month, but any July-onward month derives the NEXT FY ("FY 2027"), which is why the August edition passes `--title`; keep the index tile, llms.txt and README in step with whatever name the page carries. **(d)** `--ref-month` pins the data month; without it the generator takes the newest `top*_combined_*.csv` on disk. The "Join the conversation" target is still the FY2026 year-end post — swap it when an August post exists.

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
   - `.tile-premium` inside `.premium-grid` — premium samples (green "Premium" pill in the tile foot). **`.premium-grid` is capped at ONE row**: the three newest samples + the "Every premium sample" card. A new sample always gets a card in `premium-samples/index.html` (the library); putting it on the landing page means displacing an existing tile, not appending one
6. **Self-contained HTML for layout** — inline CSS, no build step, no external CSS frameworks. The one external JS dependency is `https://tenzi.ai/track.js` (shared analytics); everything else is inline. Follow [`DESIGN_STANDARD.md`](./DESIGN_STANDARD.md) for tokens, type scale, and component patterns.
7. **Head metadata + sitemap** — every content page carries: the favicon (`<link rel="icon" type="image/svg+xml" href="../tenzi-arcs-small.svg">` — `../` for pages in subfolders), `<link rel="canonical">`, a ≤160-char `<meta name="description">`, and the OG/Twitter block pointing at `https://resources.tenzi.ai/og.png` (copy the block from an existing page, adjust title/description/URL). Data reports additionally get a `schema.org/Dataset` JSON-LD block (feeds Google Dataset Search). Add the page's URL + lastmod to `sitemap.xml`. Unlisted pages (e.g. top20) get the head metadata but stay OUT of `sitemap.xml`.
8. Commit and push to `main` — GitHub Pages deploys automatically
