# Tenzi Analytics Dashboard

Private, server-rendered HTML analytics page built into the same Apps Script web app that handles tracking. Branches on `?view=dashboard` (the **Site** view) or `?view=newsletter` (the **Newsletter** view) instead of writing an Events row, aggregates the `Events` and `Contacts` sheets in memory, and returns a single static page styled to match the resources site (Terminal Grid (Light) — see [`DESIGN_STANDARD.md`](./DESIGN_STANDARD.md)). The two views share auth, CSS, and most helper functions; the toggle in the filter bar of either view links to the other.

This doc is the source of truth for the dashboard. Everything else (CLAUDE.md, README.md, the Apps Script header) points here.

## What it shows

Top to bottom:

1. **Nav** — `tenzi · analytics` brand on the left, window + site summary on the right
2. **Hero** — `Site analytics` H1 + one-line subtitle
3. **Filters** — Range buttons (`7D / 30D / 90D / 1Y`) and Site tabs (`All / Marketing / Resources`)
4. **KPI strip** — six tiles, all scoped to the current window:

   | Tile | Source |
   |-|-|
   | Page views | Count of `(page view)` rows |
   | Unique visitors | Distinct IPs across all events in window |
   | CTA clicks | Count of `(cta: …)` rows |
   | Subscribers | Rows whose Event column contains `@` (form submissions to Events) |
   | Contacts | Rows in the Contacts sheet |
   | Median dwell | Median seconds across all `(dwell: N)` rows |

5. **Daily activity chart** — inline SVG line chart. Page views (green) + unique visitors (grey) per day, gap-filled across the window. Hover anywhere over a column to surface a tooltip (date, page views, unique visitors) plus a vertical guide line and highlighted dots — handled by a small inline `<script>` block, no chart library
6. **Top pages** — view count + share-of-total bar
7. **CTA clicks** — click count bar per action, sorted desc
8. **Median dwell per page** — Median, P90, sample count, sorted by median desc
9. **Recent subscribers** — Email + timestamp + originating page, sorted newest first. Deduped by email (case-insensitive, trimmed) — when the same address appears more than once in the window, only the most recent occurrence is shown. The `Subscribers` KPI in the strip uses the same deduped count.
10. **Recent unsubscribes** — Recipient (column G of the Events sheet) + timestamp + campaign tag (the `page` field on the unsubscribe beacon), sorted newest first. Deduped by recipient (case-insensitive, trimmed) — same convention as Recent subscribers, so the row reflects the latest unsubscribe action per address. Sourced from rows where Event = `(cta: email_unsubscribe_click)` AND column G is non-empty. Anonymous unsubscribe clicks (no recipient) are excluded — they shouldn't happen in practice because the static unsubscribe page refuses to fire the beacon when the URL is missing the `recipient` param. Pair with Recent subscribers above to read sub:unsub ratios at a glance.
11. **Recent contacts** — full row from Contacts sheet, sorted newest first
12. **Top referrers** — distinct external sources sending traffic to the sites, sorted by visit count. Internal traffic (`tenzi.ai`, `resources.tenzi.ai`, any `*.tenzi.ai` subdomain) is excluded so the list shows true outside sources only — LinkedIn, Google, Cal.com, email clients, etc. Visits with no `Referrer` header land in a `(direct)` row; unparseable referrers fall into `(unknown)`. Counted from `(page view)` events only — CTA clicks and dwell don't add to referrer counts.
13. **Footer** — refresh time + window summary

**List pagination.** Every list section (top pages, CTA clicks, dwell, recent subscribers, recent contacts, top referrers) renders 15 rows per page with `← Prev` / `Next →` buttons below the table. Lists with 15 or fewer rows show no paginator. All data up to the server-side cap (200 for top-N lists, 500 for recent rows) is rendered into the page upfront and switched client-side via inline JS — no extra round trips per page change. Each list maintains independent page state.

## URL

Same web-app URL as the tracking beacon. The script branches on `view`:

```
https://script.google.com/macros/s/AKfycbz…/exec?view=dashboard&token=<TOKEN>&days=30&site=all
```

Range and site buttons inside the page carry the token through, so once you load it with a valid token, you can navigate freely.

### Parameters

| Param | Required | Default | Notes |
|-|-|-|-|
| `view` | yes | — | Must be `dashboard` |
| `token` | yes | — | Must match `DASHBOARD_TOKEN` in the script |
| `days` | no | `30` | Window length in days, 1–365 |
| `site` | no | `all` | `all`, `marketing`, or `resources` |

## Auth

Token in the URL. `DASHBOARD_TOKEN` is a constant near the top of `apps-script.gs`. Any request without `&token=<right-value>` gets the "Access denied" page.

**Why token instead of Google login:** the same web-app deployment handles anonymous tracking beacons from `track.js`. If access were "Anyone with Google account", beacons would break. Running two deployments (anonymous tracking + auth-gated dashboard) is more setup overhead than the privacy gap warrants for personal analytics.

**What this guards against:**
- Random URL guessing (token is opaque)
- Search-engine indexing or referrer leaks (URL is never linked publicly)

**What it doesn't:**
- Bookmark theft — treat the dashboard URL like a password
- The token sits in browser history. Don't load the dashboard on shared machines.

## Setup (one-time)

1. Open the Google Sheet linked to the Apps Script → **Extensions → Apps Script**
2. Replace the entire script with the contents of [`apps-script.gs`](./apps-script.gs)
3. Generate a token: `openssl rand -hex 24`
4. Replace `DASHBOARD_TOKEN = 'REPLACE_WITH_A_LONG_RANDOM_STRING'` with your token
5. **Deploy → Manage deployments → edit existing → Version: New version → Deploy**
6. Bookmark `<web-app URL>?view=dashboard&token=<your-token>&days=30&site=all`

The auth check explicitly refuses the placeholder string, so the dashboard is locked until step 4 is done.

### Rotating the token

Change `DASHBOARD_TOKEN`, redeploy, update the bookmark. The old URL stops working immediately.

### Revoking access

Set `DASHBOARD_TOKEN` back to the placeholder and redeploy. All `?view=dashboard` requests return Access Denied.

## Data sources

Both reads happen on every dashboard load (no caching yet):

- **`Events`** — `Event | Page | Timestamp | IP | Referrer | Site | Recipient | UserAgent`. Column G holds the recipient email for newsletter beacons (empty for site events). Column H holds the visitor User-Agent — passed as a URL param by `track.js` / `r/` / `unsubscribe/` because Apps Script `doGet` doesn't expose request headers. Used by the newsletter view to drop scanner traffic. Header row optional; the script tolerates missing headers via `readSheetWithHeaders_` (matches the first cell against expected header names).
- **`Contacts`** — `Timestamp | Name | Email | Organisation | Role | Interest | Message | Page | IP | Referrer | Site`. Header row is written by `writeContact_` on first use of the sheet.

## Aggregation

`computeStats_(days, siteFilter)` walks the Events sheet once and bucketizes by event type:

| Row type | Detection | Drives |
|-|-|-|
| Page view | `Event === '(page view)'` | Total / daily PV, unique visitors, top pages |
| CTA click | starts with `(cta: ` | Total / daily CTA, action breakdown |
| Dwell | starts with `(dwell: ` | Median/P90/N per page, overall median |
| Subscriber | contains `@` and doesn't start with `(` | Daily + recent subscriber list |

`Contacts` is filtered by date + site separately.

**Date filtering:** rows older than `cutoff = today - (days - 1)` at midnight in the script's runtime timezone are skipped. **Site filtering:** when `site != all`, rows whose Site column doesn't match are skipped.

The daily series is **gap-filled** — every date in the window appears even if zero events landed, so the chart x-axis is continuous.

## Code map

All dashboard code lives in `apps-script.gs` under the comment `// ── DASHBOARD ─────`. Key functions:

| Function | Role |
|-|-|
| `renderDashboard_(e)` | Entry point. Auth → parse params → compute → render |
| `isAuthorizedForDashboard_(e)` | Token check (refuses the placeholder string) |
| `computeStats_(days, siteFilter)` | Single-pass aggregation over Events + Contacts |
| `readSheetWithHeaders_(sheet, defaults)` | Returns rows as `{Header: value}` objects, tolerates missing header row |
| `parseTs_`, `dateKey_`, `pad2_`, `median_`, `percentile_`, `mapToList_` | Small utilities |
| `escapeHtml_`, `formatNumber_`, `formatDuration_`, `formatTs_` | Output formatters — escape EVERYTHING from the sheet |
| `buildAccessDeniedHtml_` | Static 403 page |
| `buildDashboardHtml_(stats, days, siteFilter, token)` | Top-level page template |
| `dashboardCss_` | Inline CSS — Terminal Grid tokens copied verbatim from the resources site |
| `kpi_`, `sectionLabel_` | Markup helpers |
| `buildLineChart_` | Hand-rolled inline-SVG line chart with per-day hover groups (no Chart.js) |
| `dashboardJs_` | Inline JS injected before `</body>` — wires the line-chart hover tooltip; no other client-side behaviour |
| `buildTopPagesTable_`, `buildCtaTable_`, `buildDwellTable_`, `buildSubscribersTable_`, `buildContactsTable_`, `buildReferrersTable_`, `buildUnsubscribesTable_` | The site-view tables |
| `renderNewsletterDashboard_(e)`, `computeNewsletterStats_(days)`, `buildNewsletterHtml_`, `buildCampaignSection_`, `buildNewsletterCtaTable_`, `buildNewsletterTimeline_`, `buildNewsletterRecipientsTable_`, `buildSuspiciousTable_`, `buildCampaignOverview_`, `newsletterCss_`, `looksLikeBotUa_` | Newsletter-view stack — see "Newsletter view" below |

After any code change: paste the updated `apps-script.gs` into the Apps Script editor and **Deploy → New version**. The script is the deployment unit — there's no separate dashboard hosting.

### URL building

Filter buttons use absolute URLs because the dashboard HTML is rendered inside an iframe at `script.googleusercontent.com`, not the bookmarked `script.google.com/macros/.../exec`. Relative `href`s would resolve against the iframe URL and 404. `buildDashboardHtml_` calls `ScriptApp.getService().getUrl()` to get the deployed web-app URL and prepends it to every link.

## Newsletter view

`?view=newsletter&token=<TOKEN>&days=N&campaign=<id>` renders a campaign-centric variant of the same dashboard, scoped to rows where `Site=email`.

### What it shows

1. **Filters** — View toggle (Site / Newsletter), Range (30D / 90D / 180D / 1Y, default 90D), Campaign dropdown listing every real campaign in the window with its send date
2. **Selected campaign block** — section header with the campaign id and date range, then a 6-tile KPI strip: **Engaged subscribers** (real + raw side-by-side), **Opens** (real + raw), **Clicks** (real + raw), **Unsubscribes** (real + raw), **Open rate** (real-opens / real-recipients %), **Click-through** (real-clicks / real-opens %)
3. **CTA breakdown** — bar list of every `email_*` action (excluding `email_open` + `email_unsubscribe_click`) for the selected campaign
4. **Activity by hour after send** — table showing real opens/clicks/unsubs per hour for the first 48 hours, with a small inline bar visualising relative activity. Hour 0 is the campaign's first event timestamp (effectively the send moment)
5. **Recipient activity** — paginated table of engaged subscribers with per-recipient open/click/unsub counts and the timestamp of their latest action, sorted by total engagement
6. **Suspicious rows** — collapsed `<details>` panel listing dropped rows (timestamp, event, recipient, UA, drop reason). Pop it open for forensic auditing of scanner noise
7. **All campaigns** — cross-campaign overview at the bottom, one row per real campaign, click-through to switch the selected campaign

### Filter logic — what counts as "real"

Three derived sets, computed every load:

- **`realSubscribers`** — every email that appears anywhere in the Events sheet as a subscribe row (column A contains `@` AND doesn't start with `(`). All time, all sites — the subscribe set is the source of truth for who's allowed to count.
- **`realCampaigns`** — every column-B value from `Site=email` rows that has been seen with **≥`NEWSLETTER_REAL_CAMPAIGN_THRESHOLD` (=3)** distinct real subscribers. A scanner can scramble the campaign id per-recipient, but it can't forge the cross-product of (real subscriber × real campaign id) at scale, so this filter cleanly drops scanner mangle.
- **Bot UA tag** — UA matches `NEWSLETTER_BOT_UA_REGEX` (`HeadlessChrome|Mimecast|ProofPoint|Barracuda|GoogleAppsScript|safelinks|urldefense|fetcher|prefetch|bot|crawler|spider|scanner`). UA is captured client-side and passed via the `&ua=` URL param because Apps Script `doGet` can't read headers. Image-beacon opens have no UA (email pixels can't run JS) so they're not bot-tagged on UA alone.

A row counts toward "real" if **`recipient ∈ realSubscribers` AND `campaign ∈ realCampaigns` AND `not bot UA`**. Anything else lands in the suspicious-rows panel with a reason tag.

The campaign selector + cross-campaign overview only show real campaigns. Scrambled scanner-only campaign ids are hidden but counted toward the dropped-rows tally.

### KPI definitions

| KPI | Formula |
|-|-|
| Engaged subscribers | distinct real recipients with ≥1 event |
| Opens (real) | rows where `Event = '(cta: email_open)'` AND passes the real filter |
| Clicks (real) | rows where `Event` is a `(cta: email_*_click)` (excluding `email_unsubscribe_click`) AND passes |
| Unsubscribes (real) | rows where `Event = '(cta: email_unsubscribe_click)'` AND passes |
| Open rate | real opens ÷ real engaged subscribers (× 100) |
| Click-through | real clicks ÷ real opens (× 100) |

Open rate uses engaged-subscriber count (not list size) as the denominator because the script doesn't have access to `recipients.csv` — that file lives only on your laptop and is gitignored. Treat the displayed rate as "of subscribers we can prove engaged at all, what fraction opened" — the absolute number is meaningful only relative to itself across campaigns.

### Tuning the filter

Two constants near the top of the newsletter section in `apps-script.gs`:

- `NEWSLETTER_REAL_CAMPAIGN_THRESHOLD` (default `3`) — minimum distinct real subscribers required for a campaign id to be considered real. Drop to `1` if your list is small (every send still validates the campaign id, but accepts more scanner noise); raise to `5+` for stricter filtering.
- `NEWSLETTER_BOT_UA_REGEX` — case-insensitive pattern of UA substrings to flag as scanner traffic. Add new vendor patterns here when you spot them in the suspicious-rows panel.

## Performance and limits

- **Read cost** — every load reads the full Events sheet via `getDataRange().getValues()`. Comfortable up to ~50K rows; beyond that expect 5–10s page loads.
- **Memory** — aggregations build a few `{key → count}` and `{key → [samples]}` maps. Negligible at expected volumes.
- **No client-side fetching** — everything is rendered server-side; filter changes are full reloads.
- **No caching** — adding `CacheService` with a 5-minute TTL is straightforward if loads slow down (the wins would be biggest on `7D` views — repeated daily checks).

## Caveats

- **Dwell warm-up** — dwell rows are empty until visitors leave a page after `track.js` deployed (April 2026 onwards). Historical visits to old pages have no dwell signal.
- **Missing IPs** — when `api.ipify.org` fails or is blocked, the IP cell is empty. Those rows still count as page views but don't contribute to unique-visitor counts.
- **Legacy rows + site filter** — rows written before `track.js` shipped have an empty `Site` column. They're INCLUDED in `site=all` views but EXCLUDED from `site=marketing` / `site=resources`.
- **Clock skew** — timestamps are written as Melbourne-formatted strings (`yyyy-MM-dd HH:mm:ss`) by `Utilities.formatDate(date, 'Australia/Melbourne', …)`, then parsed back as local `Date` objects in the script's runtime timezone. If the script TZ isn't Melbourne (set in Apps Script project settings), events near midnight may bucket on the "wrong" calendar day. Pin the script TZ to `Australia/Melbourne` for accuracy.
- **Subscriber detection is heuristic** — any Events row whose `Event` cell contains `@` and doesn't start with `(` is counted as a subscriber. False positives are unlikely (event placeholders all start with `(`), but worth knowing if you ever add a non-form event with `@` in the name.

## Roadmap (not built)

Rough priority order if/when it matters:

- Per-day CTA breakdown, not just totals
- Funnel: page view → CTA click → form submit, per page
- Per-page dwell histogram (not just median/P90)
- Cohort retention (return visits across days)
- Server-side cache (`CacheService`, 5-min TTL)
- Email digest on cron (`PropertiesService` trigger)
- Geo (country/city) inference from IP

Each of these is a small addition to `computeStats_` plus one new chart/table block in `buildDashboardHtml_`.
