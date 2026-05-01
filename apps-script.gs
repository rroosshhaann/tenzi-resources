// Tenzi tracking + contact-form endpoint + analytics dashboard.
// Lives in the Google Sheet linked to resources.tenzi.ai and tenzi.ai.
// Canonical source-of-truth: this file. Paste into Apps Script after edits,
// then Deploy > Manage deployments > New version > Deploy.
//
// Dashboard reference — layout, params, auth, caveats, roadmap:
//   ./DASHBOARD.md
// Tracking client — page-view / CTA / dwell / form POST helpers:
//   ../tenzi-homepage/track.js  (served at https://tenzi.ai/track.js)

var EVENTS_SHEET = 'Events';
var CONTACTS_SHEET = 'Contacts';
var NOTIFY_EMAIL = 'roshan@tenzi.ai';
var CONTACT_RATE_LIMIT = 5;             // contact submissions per IP per window
var CONTACT_RATE_WINDOW_MS = 3600000;   // 1 hour
var EXCLUDED_IPS = [];                  // IPs silently dropped from all sheets — populate with your own (find via the Events sheet IP column)

// Hosts permitted as redirect destinations from the click-tracking endpoint
// (?redirect=<url>). Anything else is refused so the endpoint can't be abused
// as an open redirect to phishing sites.
var ALLOWED_REDIRECT_HOSTS = ['tenzi.ai', 'resources.tenzi.ai', 'linkedin.com', 'cal.com'];

// Dashboard auth — token in the URL is the simplest gate. Generate a long
// random string and replace the placeholder. Bookmark the dashboard URL with
// ?view=dashboard&token=<TOKEN>. The token must NOT appear anywhere public
// (track.js, page HTML, commits) — it's only ever in your bookmark.
var DASHBOARD_TOKEN = 'REPLACE_WITH_A_LONG_RANDOM_STRING';
var DASHBOARD_TIMEZONE = 'Australia/Melbourne';

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  if (isExcludedIp_(data.ip)) return ContentService.createTextOutput('ok');
  var melbTime = Utilities.formatDate(new Date(), DASHBOARD_TIMEZONE, 'yyyy-MM-dd HH:mm:ss');

  if (data.source === 'holding_page_contact') {
    // Honeypot — silently drop bots that filled the hidden `website` field
    if (data.website) return ContentService.createTextOutput('ok');
    // Rate limit per IP — silently drop excess
    if (!withinRateLimit_(data.ip, CONTACT_RATE_LIMIT, CONTACT_RATE_WINDOW_MS)) {
      return ContentService.createTextOutput('ok');
    }
    writeContact_(data, melbTime);
    notifyContact_(data);
  } else {
    writeEvent_(data.email, data.page, melbTime, data.ip, data.referrer, data.site, '', data.ua);
  }
  return ContentService.createTextOutput('ok');
}

function doGet(e) {
  if (e && e.parameter && e.parameter.view === 'dashboard') {
    return renderDashboard_(e);
  }
  if (e && e.parameter && e.parameter.view === 'newsletter') {
    return renderNewsletterDashboard_(e);
  }
  if (isExcludedIp_(e.parameter.ip)) return ContentService.createTextOutput('ok');
  var melbTime = Utilities.formatDate(new Date(), DASHBOARD_TIMEZONE, 'yyyy-MM-dd HH:mm:ss');

  // Click-tracking redirect — used by HTML newsletter links. Logs the CTA
  // event (with recipient identity) and immediately redirects to the
  // destination URL. Dest must match ALLOWED_REDIRECT_HOSTS.
  if (e.parameter.redirect) {
    var dest = String(e.parameter.redirect);
    if (!isAllowedRedirect_(dest)) {
      return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><title>Blocked</title><p>Redirect blocked.</p>');
    }
    writeEvent_(
      e.parameter.email || '(cta: email_click)',
      e.parameter.page || '',
      melbTime, e.parameter.ip, e.parameter.ref,
      e.parameter.site || 'email',
      e.parameter.recipient,
      e.parameter.ua
    );
    // HtmlService output is wrapped in a same-origin iframe at
    // script.googleusercontent.com, so a bare location.replace() only navigates
    // the iframe — and most destinations (GitHub Pages, LinkedIn) send
    // X-Frame-Options: DENY, which would render a blocked page. top.location
    // navigates the parent window and is permitted cross-origin (it's a
    // navigation, not a read). The target="_top" link is the no-JS fallback;
    // meta-refresh is intentionally omitted because it can't break out of the
    // iframe either.
    var safeAttr = escapeHtml_(dest);
    return HtmlService.createHtmlOutput(
      '<!doctype html><html><head><meta charset="utf-8">' +
      '<title>Redirecting…</title></head>' +
      '<body style="font-family:system-ui,sans-serif;color:#6b6560;padding:40px;text-align:center">' +
      '<script>(function(d){try{top.location.replace(d)}catch(e){location.replace(d)}})(' + JSON.stringify(dest) + ');</script>' +
      '<p>Redirecting to <a href="' + safeAttr + '" target="_top" rel="noopener">' + safeAttr + '</a>…</p>' +
      '<noscript><p>JavaScript is required. <a href="' + safeAttr + '" target="_top" rel="noopener">Continue manually</a>.</p></noscript>' +
      '</body></html>'
    );
  }

  writeEvent_(
    e.parameter.email || '(page view)',
    e.parameter.page || '',
    melbTime, e.parameter.ip, e.parameter.ref,
    e.parameter.site,
    e.parameter.recipient,
    e.parameter.ua
  );
  return ContentService.createTextOutput('ok');
}

function isAllowedRedirect_(url) {
  var m = url.match(/^https?:\/\/([^\/?#]+)/i);
  if (!m) return false;
  var host = m[1].toLowerCase();
  for (var i = 0; i < ALLOWED_REDIRECT_HOSTS.length; i++) {
    var h = ALLOWED_REDIRECT_HOSTS[i].toLowerCase();
    if (host === h || host.length > h.length && host.substring(host.length - h.length - 1) === '.' + h) {
      return true;
    }
  }
  return false;
}

function isExcludedIp_(ip) {
  return ip && EXCLUDED_IPS.indexOf(ip) !== -1;
}

// Column F holds the originating site tag ('marketing' / 'resources' / 'email').
// Column G holds the recipient email for newsletter click/open events; empty
// for site events. Column H holds the visitor's User-Agent — passed as a URL
// param by track.js / r/ / unsubscribe/ because Apps Script doGet doesn't
// expose request headers. Used by the dashboard to flag scanner traffic
// (HeadlessChrome, Mimecast, Google-Apps-Script, Bot, Crawler etc.). Older
// rows written before either column shipped will have blank cells.
function writeEvent_(email, page, melbTime, ip, referrer, site, recipient, ua) {
  getOrCreate_(EVENTS_SHEET).appendRow([email || '', page || '', melbTime, ip || '', referrer || '', site || '', recipient || '', ua || '']);
}

function writeContact_(data, melbTime) {
  var sheet = getOrCreate_(CONTACTS_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp','Name','Email','Organisation','Role','Interest','Message','Page','IP','Referrer','Site']);
  }
  sheet.appendRow([melbTime, data.name||'', data.email||'', data.organisation||'', data.role||'', data.interest||'', data.message||'', data.page||'', data.ip||'', data.referrer||'', data.site||'']);
}

function notifyContact_(data) {
  // Wrapped in try/catch so MailApp quota exhaustion doesn't break the row save.
  try {
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      replyTo: data.email || NOTIFY_EMAIL,
      subject: '[tenzi.ai] New contact: ' + (data.name || data.email || 'unknown'),
      body:
        'From: ' + (data.name||'') + ' <' + (data.email||'') + '>\n' +
        'Organisation: ' + (data.organisation||'') + '\n' +
        'Role: ' + (data.role||'') + '\n' +
        'Interest: ' + (data.interest||'') + '\n\n' +
        (data.message||'') + '\n\n---\n' +
        'Page: ' + (data.page||'') + '\n' +
        'IP: ' + (data.ip||'') + '\n' +
        'Referrer: ' + (data.referrer||'')
    });
  } catch (err) {
    console.log('MailApp.sendEmail failed:', err);
  }
}

function withinRateLimit_(ip, limit, windowMs) {
  if (!ip) return true;  // no IP info — allow rather than reject genuine users
  var props = PropertiesService.getScriptProperties();
  var key = 'rl:' + ip;
  var now = Date.now();
  var raw = props.getProperty(key);
  var entry = raw ? JSON.parse(raw) : null;
  if (!entry || now > entry.reset) {
    entry = { count: 1, reset: now + windowMs };
  } else {
    entry.count++;
  }
  props.setProperty(key, JSON.stringify(entry));
  return entry.count <= limit;
}

function getOrCreate_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

// Extract the bare domain from a referrer URL: 'https://www.linkedin.com/x' → 'linkedin.com'.
function extractDomain_(url) {
  var m = String(url).match(/^https?:\/\/([^\/?#]+)/i);
  if (!m) return '(unknown)';
  return m[1].toLowerCase().replace(/^www\./, '');
}

// True if the referrer domain is one of our own properties — we exclude these
// so the Top referrers list shows external sources only (LinkedIn, Google,
// Cal.com, email clients, etc.). '(direct)' is treated as external.
function isInternalReferrer_(domain) {
  if (!domain || domain === '(direct)' || domain === '(unknown)') return false;
  return domain === 'tenzi.ai' || domain === 'resources.tenzi.ai' ||
         domain.indexOf('.tenzi.ai') !== -1;
}

// Wrap a list/table HTML fragment with a paginator UI. Each row inside `html`
// must carry data-row="N" (0-indexed page). Lists with 15 rows or fewer get
// no UI — pagination only kicks in beyond that. Page switching is handled
// client-side by the JS in dashboardJs_.
var DASHBOARD_PAGE_SIZE = 15;
function wrapPaged_(html, totalRows) {
  if (totalRows <= DASHBOARD_PAGE_SIZE) return html;
  var totalPages = Math.ceil(totalRows / DASHBOARD_PAGE_SIZE);
  return '<div class="paged" data-pages="' + totalPages + '">' +
    html +
    '<div class="pager">' +
      '<button type="button" class="pg-prev">← Prev</button>' +
      '<span class="pg-status">Page <span class="pg-current">1</span> of ' + totalPages + '</span>' +
      '<button type="button" class="pg-next">Next →</button>' +
    '</div>' +
  '</div>';
}

// ── DASHBOARD ─────────────────────────────────────────────────────────
// Server-rendered HTML. Read Events + Contacts, aggregate, return a single
// page with KPIs, a daily activity chart, top pages, CTA breakdown, dwell
// stats, and recent subscribers/contacts. URL params:
//   ?view=dashboard       — required
//   &token=<TOKEN>        — required (must match DASHBOARD_TOKEN)
//   &days=N               — window length, 1..365 (default 30)
//   &site=all|marketing|resources  — site filter (default all)

function renderDashboard_(e) {
  if (!isAuthorizedForDashboard_(e)) {
    return HtmlService.createHtmlOutput(buildAccessDeniedHtml_()).setTitle('Access denied');
  }
  var days = parseInt(e.parameter.days || '30', 10);
  if (isNaN(days) || days < 1) days = 30;
  if (days > 365) days = 365;
  var siteFilter = e.parameter.site || 'all';
  if (['all','marketing','resources'].indexOf(siteFilter) === -1) siteFilter = 'all';

  var stats = computeStats_(days, siteFilter);
  var html = buildDashboardHtml_(stats, days, siteFilter, e.parameter.token);
  return HtmlService.createHtmlOutput(html)
    .setTitle('Tenzi · Analytics')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function isAuthorizedForDashboard_(e) {
  if (!DASHBOARD_TOKEN || DASHBOARD_TOKEN === 'REPLACE_WITH_A_LONG_RANDOM_STRING') return false;
  return !!(e.parameter.token && e.parameter.token === DASHBOARD_TOKEN);
}

function computeStats_(days, siteFilter) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var events = readSheetWithHeaders_(ss.getSheetByName(EVENTS_SHEET),
    ['Event','Page','Timestamp','IP','Referrer','Site','Recipient','UserAgent']);
  var contacts = readSheetWithHeaders_(ss.getSheetByName(CONTACTS_SHEET),
    ['Timestamp','Name','Email','Organisation','Role','Interest','Message','Page','IP','Referrer','Site']);

  var cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days + 1);

  var byDate = {};
  var viewsByPage = {}, ctaByAction = {}, dwellByPage = {};
  var refByDomain = {};
  // Subscribers + unsubscribes are deduped by email / recipient (case-insensitive,
  // trimmed). When the same address appears more than once, we keep the most recent
  // occurrence so the row reflects the latest action. Contacts aren't deduped — each
  // contact-form submission is a distinct conversation worth seeing.
  var subscribersByEmail = {}, unsubscribesByRecipient = {}, allContacts = [];
  var totalPv = 0, totalCta = 0;
  var ipsAllTime = {};

  events.forEach(function(row) {
    var ev = String(row.Event || '');
    if (!ev) return;
    var page = String(row.Page || '');
    var ts = parseTs_(row.Timestamp);
    if (!ts || ts < cutoff) return;
    var ip = String(row.IP || '');
    var site = String(row.Site || '');
    if (siteFilter !== 'all' && site !== siteFilter) return;

    var key = dateKey_(ts);
    var entry = byDate[key] || (byDate[key] = { pageViews:0, ips:{}, ctaClicks:0, subscribers:0 });

    if (ev === '(page view)') {
      totalPv++;
      entry.pageViews++;
      if (ip) { entry.ips[ip] = true; ipsAllTime[ip] = true; }
      viewsByPage[page] = (viewsByPage[page] || 0) + 1;
      // External referrer aggregation — internal tenzi.ai traffic excluded.
      var ref = String(row.Referrer || '').trim();
      var domain = ref ? extractDomain_(ref) : '(direct)';
      if (!isInternalReferrer_(domain)) {
        refByDomain[domain] = (refByDomain[domain] || 0) + 1;
      }
    } else if (ev.indexOf('(cta: ') === 0 && ev.charAt(ev.length - 1) === ')') {
      totalCta++;
      entry.ctaClicks++;
      var action = ev.substring(6, ev.length - 1);
      ctaByAction[action] = (ctaByAction[action] || 0) + 1;
      // Unsubscribes also get collected into a dedicated list so the dashboard
      // can show who opted out (column G) — not just the aggregate count.
      if (action === 'email_unsubscribe_click') {
        var recipient = String(row.Recipient || '').trim();
        if (recipient) {
          var rkey = recipient.toLowerCase();
          var existingUnsub = unsubscribesByRecipient[rkey];
          if (!existingUnsub || existingUnsub.ts < ts) {
            unsubscribesByRecipient[rkey] = { ts: ts, recipient: recipient, campaign: page, site: site };
          }
        }
      }
    } else if (ev.indexOf('(dwell: ') === 0 && ev.charAt(ev.length - 1) === ')') {
      var sec = parseInt(ev.substring(8, ev.length - 1), 10);
      if (!isNaN(sec) && sec > 0) {
        (dwellByPage[page] = dwellByPage[page] || []).push(sec);
      }
    } else if (ev.indexOf('@') !== -1 && ev.charAt(0) !== '(') {
      entry.subscribers++;
      var ekey = ev.trim().toLowerCase();
      var existingSub = subscribersByEmail[ekey];
      if (!existingSub || existingSub.ts < ts) {
        subscribersByEmail[ekey] = { email: ev, page: page, ts: ts, site: site };
      }
    }
  });

  contacts.forEach(function(row) {
    var ts = parseTs_(row.Timestamp);
    if (!ts || ts < cutoff) return;
    var site = String(row.Site || '');
    if (siteFilter !== 'all' && site !== siteFilter) return;
    allContacts.push({
      ts: ts,
      name: String(row.Name||''),
      email: String(row.Email||''),
      organisation: String(row.Organisation||''),
      role: String(row.Role||''),
      interest: String(row.Interest||''),
      page: String(row.Page||'')
    });
  });

  // Gap-fill the daily series so empty days still render
  var daily = [];
  for (var i = 0; i < days; i++) {
    var d = new Date(cutoff);
    d.setDate(cutoff.getDate() + i);
    var k = dateKey_(d);
    var entry = byDate[k] || { pageViews:0, ips:{}, ctaClicks:0, subscribers:0 };
    daily.push({
      date: k,
      pageViews: entry.pageViews,
      uniqueVisitors: Object.keys(entry.ips).length,
      ctaClicks: entry.ctaClicks,
      subscribers: entry.subscribers
    });
  }

  // Caps bumped from earlier 20/50 limits — pagination handles display.
  var topPages = mapToList_(viewsByPage, 'page', 'views').slice(0, 200);
  var topCtas = mapToList_(ctaByAction, 'action', 'clicks').slice(0, 200);
  var topReferrers = mapToList_(refByDomain, 'source', 'visits').slice(0, 200);

  var dwellRows = [];
  Object.keys(dwellByPage).forEach(function(p) {
    var arr = dwellByPage[p].slice().sort(function(a,b){return a-b});
    dwellRows.push({ page: p, samples: arr.length, median: median_(arr), p90: percentile_(arr, 90) });
  });
  dwellRows.sort(function(a, b) { return b.median - a.median; });
  dwellRows = dwellRows.slice(0, 200);

  var allDwell = [];
  Object.keys(dwellByPage).forEach(function(p) {
    allDwell = allDwell.concat(dwellByPage[p]);
  });
  allDwell.sort(function(a, b) { return a - b; });

  // Flatten the dedup maps into arrays for sorting + display.
  var allSubscribers = Object.keys(subscribersByEmail).map(function(k) { return subscribersByEmail[k]; });
  var allUnsubscribes = Object.keys(unsubscribesByRecipient).map(function(k) { return unsubscribesByRecipient[k]; });

  return {
    totals: {
      pageViews: totalPv,
      uniqueVisitors: Object.keys(ipsAllTime).length,
      ctaClicks: totalCta,
      subscribers: allSubscribers.length,
      contacts: allContacts.length,
      medianDwell: median_(allDwell)
    },
    daily: daily,
    topPages: topPages,
    topCtas: topCtas,
    topReferrers: topReferrers,
    dwellRows: dwellRows,
    subscribers: allSubscribers.sort(function(a,b){return b.ts-a.ts}).slice(0, 500),
    unsubscribes: allUnsubscribes.sort(function(a,b){return b.ts-a.ts}).slice(0, 500),
    contacts: allContacts.sort(function(a,b){return b.ts-a.ts}).slice(0, 500)
  };
}

function readSheetWithHeaders_(sheet, defaultHeaders) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (!data.length) return [];
  var firstCellLc = String(data[0][0] || '').trim().toLowerCase();
  var hasHeader = defaultHeaders.some(function(h) { return h.toLowerCase() === firstCellLc; });
  var headers = hasHeader ? data[0].map(function(h) { return String(h).trim(); }) : defaultHeaders;
  var rows = hasHeader ? data.slice(1) : data;
  return rows.map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function parseTs_(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  var s = String(value);
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function pad2_(n) { n = String(n); return n.length < 2 ? '0' + n : n; }

function dateKey_(d) {
  return d.getFullYear() + '-' + pad2_(d.getMonth() + 1) + '-' + pad2_(d.getDate());
}

function mapToList_(map, nameKey, valueKey) {
  var out = [];
  Object.keys(map).forEach(function(k) {
    var o = {}; o[nameKey] = k; o[valueKey] = map[k]; out.push(o);
  });
  out.sort(function(a, b) { return b[valueKey] - a[valueKey]; });
  return out;
}

function median_(arr) {
  if (!arr || !arr.length) return 0;
  var sorted = arr.slice().sort(function(a,b){return a-b});
  var mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function percentile_(sorted, p) {
  if (!sorted || !sorted.length) return 0;
  var idx = Math.floor(sorted.length * p / 100);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function escapeHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatNumber_(n) {
  return String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDuration_(secs) {
  secs = Math.round(secs || 0);
  if (secs === 0) return '—';
  if (secs < 60) return secs + 's';
  var m = Math.floor(secs / 60), s = secs % 60;
  return m + 'm ' + (s < 10 ? '0' : '') + s + 's';
}

function formatTs_(d) {
  return d.getFullYear() + '-' + pad2_(d.getMonth() + 1) + '-' + pad2_(d.getDate())
    + ' ' + pad2_(d.getHours()) + ':' + pad2_(d.getMinutes());
}

function buildAccessDeniedHtml_() {
  return '<!doctype html><html><head><meta charset="utf-8"><title>Access denied</title>' +
    '<style>body{font-family:Inter,system-ui,sans-serif;background:#faf8f4;color:#1a1a1a;padding:60px 24px;max-width:600px;margin:0 auto;line-height:1.6}h1{font-size:24px;margin-bottom:14px;font-weight:500}p{color:#6b6560}code{background:#fff;padding:2px 6px;border:1px solid #e5e1d9;border-radius:4px;font-size:12px}</style>' +
    '</head><body><h1>Access denied</h1>' +
    '<p>The Tenzi analytics dashboard is restricted. Open it via <code>?view=dashboard&amp;token=&lt;your-token&gt;</code> with the right token. ' +
    'If <code>DASHBOARD_TOKEN</code> still says <code>REPLACE_WITH_A_LONG_RANDOM_STRING</code> in the script, set it to something secret first and redeploy.</p></body></html>';
}

function buildDashboardHtml_(stats, days, siteFilter, token) {
  var t = stats.totals;
  // Apps Script renders this HTML inside an iframe at script.googleusercontent.com,
  // so relative URLs would resolve to the wrong host. Use the deployed web-app URL.
  var baseUrl = ScriptApp.getService().getUrl();
  var qs = function(d, s) { return baseUrl + '?view=dashboard&token=' + encodeURIComponent(token) + '&days=' + d + '&site=' + s; };

  var rangeBtn = function(label, d) {
    return '<a href="' + qs(d, siteFilter) + '" class="' + (days === d ? 'active' : '') + '">' + label + '</a>';
  };
  var siteBtn = function(label, s) {
    return '<a href="' + qs(days, s) + '" class="' + (siteFilter === s ? 'active' : '') + '">' + label + '</a>';
  };

  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Tenzi · Analytics</title>' +
    '<base target="_top">' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter+Tight:wght@400;500;600&display=swap" rel="stylesheet">' +
    '<style>' + dashboardCss_() + '</style>' +
    '</head><body><div class="wrap">' +
      '<nav class="nav">' +
        '<div class="brand">tenzi · <strong>analytics</strong></div>' +
        '<div class="user">window: ' + days + 'd · site: ' + siteFilter + '</div>' +
      '</nav>' +
      '<h1>Site analytics</h1>' +
      '<div class="subtitle">Page views, CTA clicks, dwell, and signups across tenzi.ai and resources.tenzi.ai. Server-rendered from the linked Google Sheet.</div>' +

      '<div class="filters">' +
        '<span class="label">View</span>' +
        '<div class="range"><a class="active">Site</a><a href="' + baseUrl + '?view=newsletter&token=' + encodeURIComponent(token) + '&days=' + days + '">Newsletter</a></div>' +
        '<span class="label">Range</span>' +
        '<div class="range">' + rangeBtn('7D', 7) + rangeBtn('30D', 30) + rangeBtn('90D', 90) + rangeBtn('1Y', 365) + '</div>' +
        '<span class="label">Site</span>' +
        '<div class="site-tabs">' + siteBtn('All', 'all') + siteBtn('Marketing', 'marketing') + siteBtn('Resources', 'resources') + '</div>' +
      '</div>' +

      '<div class="kpi-row">' +
        kpi_('Page views', formatNumber_(t.pageViews), true) +
        kpi_('Unique visitors', formatNumber_(t.uniqueVisitors), false) +
        kpi_('CTA clicks', formatNumber_(t.ctaClicks), false) +
        kpi_('Subscribers', formatNumber_(t.subscribers), false) +
        kpi_('Contacts', formatNumber_(t.contacts), false) +
        kpi_('Median dwell', formatDuration_(t.medianDwell), false) +
      '</div>' +

      sectionLabel_('Daily activity', 'PAGE VIEWS · UNIQUE VISITORS · ' + days + ' DAYS') +
      '<div class="card">' + buildLineChart_(stats.daily) + '</div>' +

      '<div class="grid-2">' +
        '<div>' +
          sectionLabel_('Top pages', stats.topPages.length + ' SHOWN') +
          '<div class="card">' + buildTopPagesTable_(stats.topPages, t.pageViews) + '</div>' +
        '</div>' +
        '<div>' +
          sectionLabel_('CTA clicks', stats.topCtas.length + ' ACTIONS') +
          '<div class="card">' + buildCtaTable_(stats.topCtas) + '</div>' +
        '</div>' +
      '</div>' +

      sectionLabel_('Median dwell per page', stats.dwellRows.length + ' PAGES') +
      '<div class="card">' + buildDwellTable_(stats.dwellRows) + '</div>' +

      '<div class="grid-2">' +
        '<div>' +
          sectionLabel_('Recent subscribers', stats.subscribers.length + ' SHOWN') +
          '<div class="card">' + buildSubscribersTable_(stats.subscribers) + '</div>' +
        '</div>' +
        '<div>' +
          sectionLabel_('Recent unsubscribes', stats.unsubscribes.length + ' SHOWN') +
          '<div class="card">' + buildUnsubscribesTable_(stats.unsubscribes) + '</div>' +
        '</div>' +
      '</div>' +

      sectionLabel_('Recent contacts', 'TENZI.AI HOLDING-PAGE FORM') +
      '<div class="card">' + buildContactsTable_(stats.contacts) + '</div>' +

      sectionLabel_('Top referrers', 'EXTERNAL SOURCES · ' + stats.topReferrers.length + ' DOMAINS') +
      '<div class="card">' + buildReferrersTable_(stats.topReferrers) + '</div>' +

      '<footer class="foot">' +
        '<span>Window: last ' + days + ' days · Site: ' + siteFilter + '</span>' +
        '<span>Refreshed: ' + Utilities.formatDate(new Date(), DASHBOARD_TIMEZONE, 'yyyy-MM-dd HH:mm') + ' Melbourne</span>' +
      '</footer>' +
    '</div>' +
    '<script>' + dashboardJs_() + '</script>' +
    '</body></html>';
}

function dashboardJs_() {
  return '(function(){' +
    'var wrap=document.querySelector(".chart-wrap");if(!wrap)return;' +
    'var tip=wrap.querySelector(".chart-tip");' +
    'var dps=wrap.querySelectorAll(".dp");' +
    'function fmt(n){return String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g,",")}' +
    'function show(g){' +
      'tip.innerHTML="<div class=\\"tip-date\\">"+g.getAttribute("data-date")+"</div>"+' +
        '"<div class=\\"tip-row\\"><span class=\\"tip-lbl\\">Page views</span><span class=\\"tip-val tip-pv\\">"+fmt(g.getAttribute("data-pv"))+"</span></div>"+' +
        '"<div class=\\"tip-row\\"><span class=\\"tip-lbl\\">Unique</span><span class=\\"tip-val tip-uv\\">"+fmt(g.getAttribute("data-uv"))+"</span></div>";' +
      'tip.hidden=false;' +
      'var dot=g.querySelector(".dp-pv");' +
      'var dr=dot.getBoundingClientRect();' +
      'var wr=wrap.getBoundingClientRect();' +
      'var half=tip.offsetWidth/2;' +
      'var raw=dr.left+dr.width/2-wr.left;' +
      'var left=Math.max(half+4,Math.min(wrap.clientWidth-half-4,raw));' +
      'tip.style.left=left+"px";' +
      'tip.style.top=(dr.top-wr.top)+"px";' +
    '}' +
    'for(var i=0;i<dps.length;i++){' +
      'dps[i].addEventListener("mouseenter",function(){show(this)});' +
    '}' +
    'wrap.addEventListener("mouseleave",function(){tip.hidden=true});' +
  '})();' +
  // Per-list pagination — one independent paginator per .paged container.
  '(function(){' +
    'var lists=document.querySelectorAll(".paged");' +
    'for(var p=0;p<lists.length;p++){' +
      '(function(list){' +
        'var rows=list.querySelectorAll("[data-row]");' +
        'var total=parseInt(list.getAttribute("data-pages")||"1",10);' +
        'var prev=list.querySelector(".pg-prev");' +
        'var next=list.querySelector(".pg-next");' +
        'var status=list.querySelector(".pg-current");' +
        'var current=0;' +
        'function show(page){' +
          'if(page<0)page=0;if(page>total-1)page=total-1;' +
          'current=page;' +
          'for(var i=0;i<rows.length;i++){' +
            'if(parseInt(rows[i].getAttribute("data-row"),10)===page){rows[i].classList.add("visible")}else{rows[i].classList.remove("visible")}' +
          '}' +
          'if(status)status.textContent=page+1;' +
          'if(prev)prev.disabled=page===0;' +
          'if(next)next.disabled=page===total-1;' +
        '}' +
        'if(prev)prev.addEventListener("click",function(){show(current-1)});' +
        'if(next)next.addEventListener("click",function(){show(current+1)});' +
        'show(0);' +
      '})(lists[p]);' +
    '}' +
  '})();';
}

function dashboardCss_() {
  return ':root{--bg:#faf8f4;--panel:#fff;--border:#e5e1d9;--border-bright:#d3cec3;--border-light:#ece8df;--text:#1a1a1a;--muted:#6b6560;--dim:#a59f93;--accent:#2ca471;--accent-hover:#249765;--g700:#0F766E;--g500:#14A399;--g300:#5EEAD4;--g100:#CCFBF1;--g50:#F0FDFA;--neg:#9c3b3b;--radius:6px}' +
    '*{margin:0;padding:0;box-sizing:border-box}' +
    'body{font:14px/1.55 "Inter Tight",Inter,system-ui,sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased}' +
    'a{color:var(--accent)}' +
    '.wrap{max-width:1200px;margin:0 auto;padding:24px 28px}' +
    '.nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}' +
    '.brand{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:var(--muted)}' +
    '.brand strong{color:var(--text);font-weight:500}' +
    '.user{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10px;letter-spacing:0.12em;color:var(--dim);text-transform:uppercase}' +
    'h1{font-size:28px;font-weight:500;letter-spacing:-0.02em;margin-bottom:6px}' +
    '.subtitle{font-size:13px;color:var(--muted);margin-bottom:20px;line-height:1.6;max-width:740px}' +
    '.filters{display:flex;gap:14px;align-items:center;padding:12px 16px;background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:18px;flex-wrap:wrap}' +
    '.filters .label{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:var(--muted)}' +
    '.range,.site-tabs{display:flex;gap:0;border:1px solid var(--border);border-radius:4px;overflow:hidden}' +
    '.range a,.site-tabs a{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px;padding:6px 12px;color:var(--muted);text-decoration:none;border-right:1px solid var(--border);letter-spacing:0.08em;text-transform:uppercase}' +
    '.range a:last-child,.site-tabs a:last-child{border-right:none}' +
    '.range a:hover,.site-tabs a:hover{color:var(--text);background:var(--bg)}' +
    '.range a.active,.site-tabs a.active{background:var(--accent);color:#fff;border-color:var(--accent)}' +
    '.kpi-row{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:18px}' +
    '.kpi{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:16px}' +
    '.kpi.accent{background:linear-gradient(135deg,var(--g50) 0%,var(--panel) 100%);border-color:rgba(20,163,153,0.25)}' +
    '.kpi .lbl{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}' +
    '.kpi .val{font-size:28px;font-weight:600;letter-spacing:-0.02em;font-feature-settings:"tnum"}' +
    '.section-label{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;color:var(--muted);margin:24px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--border);display:flex;align-items:baseline;justify-content:space-between}' +
    '.section-label .num{color:var(--dim)}' +
    '.card{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:20px}' +
    '.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:0}' +
    '.chart{width:100%;height:220px;display:block;overflow:visible}' +
    '.chart-wrap{position:relative}' +
    '.chart .dp:hover .dp-dot,.chart .dp:hover .dp-guide{opacity:1}' +
    '.chart .dp-hit{cursor:crosshair}' +
    '.chart-tip{position:absolute;background:#1a1a1a;color:#f5f0e8;font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px;line-height:1.4;padding:8px 10px;border-radius:5px;pointer-events:none;white-space:nowrap;transform:translate(-50%,calc(-100% - 10px));box-shadow:0 4px 14px rgba(0,0,0,0.18);z-index:10}' +
    '.chart-tip[hidden]{display:none}' +
    '.chart-tip .tip-date{color:#a59f93;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:5px}' +
    '.chart-tip .tip-row{display:flex;justify-content:space-between;gap:18px}' +
    '.chart-tip .tip-row + .tip-row{margin-top:2px}' +
    '.chart-tip .tip-lbl{color:#a59f93}' +
    '.chart-tip .tip-val{font-weight:500}' +
    '.chart-tip .tip-pv{color:#5EEAD4}' +
    '.chart-tip .tip-uv{color:#e0dbcf}' +
    'table{width:100%;border-collapse:collapse;font-feature-settings:"tnum"}' +
    'th{text-align:left;font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);padding:0 0 8px 0;border-bottom:1px solid var(--border)}' +
    'th.r{text-align:right}' +
    'td{padding:9px 0;font-size:13px;border-bottom:1px dashed var(--border);color:var(--muted);vertical-align:middle}' +
    'td.r{text-align:right;font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:12.5px;font-weight:500;color:var(--text)}' +
    'td.page{color:var(--text)}' +
    'td.tsmono{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px;color:var(--dim)}' +
    'tr:last-child td{border-bottom:none}' +
    '.empty{font-size:13px;color:var(--dim);padding:18px 0;text-align:center;font-style:italic}' +
    '.bar{display:flex;align-items:center;gap:8px}' +
    '.bar-track{flex:1;height:6px;background:var(--border-light);border-radius:3px;overflow:hidden;min-width:60px}' +
    '.bar-fill{height:100%;background:linear-gradient(90deg,var(--g300),var(--g700));border-radius:3px}' +
    '.paged tr[data-row]:not(.visible){display:none}' +
    '.pager{display:flex;align-items:center;justify-content:center;gap:14px;padding-top:14px;font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px;color:var(--muted);letter-spacing:0.04em}' +
    '.pager button{background:var(--panel);border:1px solid var(--border);padding:5px 12px;border-radius:4px;cursor:pointer;font:inherit;color:var(--text);letter-spacing:0.04em}' +
    '.pager button:hover:not(:disabled){border-color:var(--border-bright)}' +
    '.pager button:disabled{opacity:0.35;cursor:not-allowed}' +
    '.pg-current{color:var(--text);font-weight:500}' +
    '.foot{padding:24px 0 12px;font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--dim);display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-top:18px;border-top:1px solid var(--border)}' +
    '@media(max-width:900px){.kpi-row{grid-template-columns:repeat(3,1fr)}.grid-2{grid-template-columns:1fr}}' +
    '@media(max-width:600px){.kpi-row{grid-template-columns:repeat(2,1fr)}.filters{flex-direction:column;align-items:stretch}}';
}

function kpi_(label, value, accent) {
  return '<div class="kpi' + (accent ? ' accent' : '') + '">' +
    '<div class="lbl">' + escapeHtml_(label) + '</div>' +
    '<div class="val">' + escapeHtml_(value) + '</div>' +
    '</div>';
}

function sectionLabel_(left, right) {
  return '<div class="section-label"><span>' + escapeHtml_(left) + '</span><span class="num">' + escapeHtml_(right) + '</span></div>';
}

function buildLineChart_(daily) {
  if (!daily || !daily.length) return '<div class="empty">No data in this window.</div>';

  var w = 1100, h = 220, padL = 50, padR = 14, padT = 28, padB = 30;
  var innerW = w - padL - padR, innerH = h - padT - padB;
  var n = daily.length;
  var maxVal = 0;
  daily.forEach(function(d) {
    if (d.pageViews > maxVal) maxVal = d.pageViews;
    if (d.uniqueVisitors > maxVal) maxVal = d.uniqueVisitors;
  });
  if (maxVal < 4) maxVal = 4;
  // round up to a clean tick
  var tick = Math.pow(10, Math.floor(Math.log(maxVal) / Math.log(10)));
  maxVal = Math.ceil(maxVal / tick) * tick;

  function x(i) { return padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW); }
  function y(v) { return padT + innerH - (v / maxVal) * innerH; }

  var pvPts = daily.map(function(d, i) { return x(i) + ',' + y(d.pageViews); }).join(' ');
  var uvPts = daily.map(function(d, i) { return x(i) + ',' + y(d.uniqueVisitors); }).join(' ');

  var grid = '';
  for (var t = 0; t <= 4; t++) {
    var yy = padT + (t / 4) * innerH;
    var lbl = Math.round(maxVal * (1 - t / 4));
    grid += '<line x1="' + padL + '" y1="' + yy + '" x2="' + (w - padR) + '" y2="' + yy +
      '" stroke="#ece8df" stroke-dasharray="2 3"/>' +
      '<text x="' + (padL - 8) + '" y="' + (yy + 3) + '" text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="9" fill="#a59f93">' + lbl + '</text>';
  }

  var xLabels = '';
  var step = Math.max(1, Math.floor(n / 8));
  for (var i = 0; i < n; i += step) {
    var dt = daily[i].date.substring(5);
    xLabels += '<text x="' + x(i) + '" y="' + (h - 10) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="9" fill="#a59f93">' + dt + '</text>';
  }

  var legend =
    '<g font-family="IBM Plex Mono,monospace" font-size="9" letter-spacing="0.08em">' +
      '<rect x="' + padL + '" y="6" width="8" height="8" fill="#2ca471"/>' +
      '<text x="' + (padL + 14) + '" y="13" fill="#1a1a1a">PAGE VIEWS</text>' +
      '<rect x="' + (padL + 110) + '" y="6" width="8" height="8" fill="#a59f93"/>' +
      '<text x="' + (padL + 124) + '" y="13" fill="#1a1a1a">UNIQUE VISITORS</text>' +
    '</g>';

  // Hover overlay — one group per day. Hit-zone rect captures hover for the
  // whole vertical column; dots + guide line fade in via CSS; the tooltip is
  // positioned by JS using the page-views dot's bounding rect.
  var colW = n === 1 ? innerW : innerW / (n - 1);
  var hover = '';
  for (var j = 0; j < n; j++) {
    var xi = x(j);
    var pvY = y(daily[j].pageViews);
    var uvY = y(daily[j].uniqueVisitors);
    var hitX, hitW;
    if (n === 1)        { hitX = padL;          hitW = innerW; }
    else if (j === 0)   { hitX = padL;          hitW = colW / 2; }
    else if (j === n-1) { hitX = xi - colW / 2; hitW = colW / 2; }
    else                { hitX = xi - colW / 2; hitW = colW; }
    hover +=
      '<g class="dp" data-date="' + daily[j].date +
        '" data-pv="' + daily[j].pageViews +
        '" data-uv="' + daily[j].uniqueVisitors + '">' +
        '<line class="dp-guide" x1="' + xi + '" y1="' + padT + '" x2="' + xi + '" y2="' + (padT + innerH) + '" stroke="#1a1a1a" stroke-width="0.6" stroke-dasharray="2 3" opacity="0"/>' +
        '<circle class="dp-dot" cx="' + xi + '" cy="' + uvY + '" r="3.5" fill="#a59f93" stroke="#fff" stroke-width="1.5" opacity="0"/>' +
        '<circle class="dp-dot dp-pv" cx="' + xi + '" cy="' + pvY + '" r="3.5" fill="#2ca471" stroke="#fff" stroke-width="1.5" opacity="0"/>' +
        '<rect class="dp-hit" x="' + hitX + '" y="' + padT + '" width="' + hitW + '" height="' + innerH + '" fill="transparent"/>' +
      '</g>';
  }

  return '<div class="chart-wrap">' +
    '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      grid +
      '<polyline points="' + uvPts + '" fill="none" stroke="#a59f93" stroke-width="1.5"/>' +
      '<polyline points="' + pvPts + '" fill="none" stroke="#2ca471" stroke-width="2"/>' +
      xLabels + legend + hover +
    '</svg>' +
    '<div class="chart-tip" hidden></div>' +
  '</div>';
}

function buildTopPagesTable_(rows, total) {
  if (!rows.length) return '<div class="empty">No page views in this window.</div>';
  var maxV = rows[0].views;
  var html = '<table><thead><tr><th>Page</th><th class="r">Views</th><th class="r" style="width:120px">Share</th></tr></thead><tbody>';
  rows.forEach(function(r, i) {
    var pct = total > 0 ? Math.round(r.views / total * 100) : 0;
    var pg = Math.floor(i / DASHBOARD_PAGE_SIZE);
    html += '<tr data-row="' + pg + '"><td class="page">' + escapeHtml_(r.page) + '</td>' +
            '<td class="r">' + formatNumber_(r.views) + '</td>' +
            '<td class="r"><div class="bar"><div class="bar-track"><div class="bar-fill" style="width:' + (r.views/maxV*100) + '%"></div></div><span style="font-size:11px;color:var(--dim);font-family:\'IBM Plex Mono\',monospace;min-width:36px;text-align:right">' + pct + '%</span></div></td></tr>';
  });
  return wrapPaged_(html + '</tbody></table>', rows.length);
}

function buildCtaTable_(rows) {
  if (!rows.length) return '<div class="empty">No CTA clicks in this window.</div>';
  var maxV = rows[0].clicks;
  var html = '<table><thead><tr><th>Action</th><th class="r" style="width:140px">Clicks</th></tr></thead><tbody>';
  rows.forEach(function(r, i) {
    var pg = Math.floor(i / DASHBOARD_PAGE_SIZE);
    html += '<tr data-row="' + pg + '"><td class="page">' + escapeHtml_(r.action) + '</td>' +
            '<td class="r"><div class="bar"><div class="bar-track"><div class="bar-fill" style="width:' + (r.clicks/maxV*100) + '%"></div></div><span style="min-width:36px;text-align:right">' + formatNumber_(r.clicks) + '</span></div></td></tr>';
  });
  return wrapPaged_(html + '</tbody></table>', rows.length);
}

function buildDwellTable_(rows) {
  if (!rows.length) return '<div class="empty">No dwell data yet — visitors need to leave a page for it to fire.</div>';
  var html = '<table><thead><tr><th>Page</th><th class="r">Median</th><th class="r">P90</th><th class="r">N</th></tr></thead><tbody>';
  rows.forEach(function(r, i) {
    var pg = Math.floor(i / DASHBOARD_PAGE_SIZE);
    html += '<tr data-row="' + pg + '"><td class="page">' + escapeHtml_(r.page) + '</td>' +
            '<td class="r">' + formatDuration_(r.median) + '</td>' +
            '<td class="r" style="color:var(--dim)">' + formatDuration_(r.p90) + '</td>' +
            '<td class="r" style="color:var(--dim)">' + r.samples + '</td></tr>';
  });
  return wrapPaged_(html + '</tbody></table>', rows.length);
}

function buildSubscribersTable_(rows) {
  if (!rows.length) return '<div class="empty">No subscribers in this window.</div>';
  var html = '<table><thead><tr><th>Email</th><th>When</th><th>From page</th></tr></thead><tbody>';
  rows.forEach(function(r, i) {
    var pg = Math.floor(i / DASHBOARD_PAGE_SIZE);
    html += '<tr data-row="' + pg + '"><td class="page">' + escapeHtml_(r.email) + '</td>' +
            '<td class="tsmono">' + formatTs_(r.ts) + '</td>' +
            '<td>' + escapeHtml_(r.page) + '</td></tr>';
  });
  return wrapPaged_(html + '</tbody></table>', rows.length);
}

function buildUnsubscribesTable_(rows) {
  if (!rows.length) return '<div class="empty">No unsubscribes in this window.</div>';
  var html = '<table><thead><tr><th>Recipient</th><th>When</th><th>Campaign</th></tr></thead><tbody>';
  rows.forEach(function(r, i) {
    var pg = Math.floor(i / DASHBOARD_PAGE_SIZE);
    html += '<tr data-row="' + pg + '"><td class="page">' + escapeHtml_(r.recipient) + '</td>' +
            '<td class="tsmono">' + formatTs_(r.ts) + '</td>' +
            '<td>' + escapeHtml_(r.campaign) + '</td></tr>';
  });
  return wrapPaged_(html + '</tbody></table>', rows.length);
}

function buildContactsTable_(rows) {
  if (!rows.length) return '<div class="empty">No contact-form submissions in this window.</div>';
  var html = '<table><thead><tr><th>When</th><th>Name</th><th>Email</th><th>Org</th><th>Role</th><th>Interest</th></tr></thead><tbody>';
  rows.forEach(function(r, i) {
    var pg = Math.floor(i / DASHBOARD_PAGE_SIZE);
    html += '<tr data-row="' + pg + '"><td class="tsmono">' + formatTs_(r.ts) + '</td>' +
            '<td class="page">' + escapeHtml_(r.name) + '</td>' +
            '<td>' + escapeHtml_(r.email) + '</td>' +
            '<td>' + escapeHtml_(r.organisation) + '</td>' +
            '<td>' + escapeHtml_(r.role) + '</td>' +
            '<td>' + escapeHtml_(r.interest) + '</td></tr>';
  });
  return wrapPaged_(html + '</tbody></table>', rows.length);
}

function buildReferrersTable_(rows) {
  if (!rows.length) return '<div class="empty">No external referrers in this window — visits are arriving direct, from internal links, or with no referrer header.</div>';
  var maxV = rows[0].visits;
  var totalVisits = 0;
  rows.forEach(function(r) { totalVisits += r.visits; });
  var html = '<table><thead><tr><th>Source</th><th class="r">Visits</th><th class="r" style="width:120px">Share</th></tr></thead><tbody>';
  rows.forEach(function(r, i) {
    var pct = totalVisits > 0 ? Math.round(r.visits / totalVisits * 100) : 0;
    var pg = Math.floor(i / DASHBOARD_PAGE_SIZE);
    html += '<tr data-row="' + pg + '"><td class="page">' + escapeHtml_(r.source) + '</td>' +
            '<td class="r">' + formatNumber_(r.visits) + '</td>' +
            '<td class="r"><div class="bar"><div class="bar-track"><div class="bar-fill" style="width:' + (r.visits/maxV*100) + '%"></div></div><span style="font-size:11px;color:var(--dim);font-family:\'IBM Plex Mono\',monospace;min-width:36px;text-align:right">' + pct + '%</span></div></td></tr>';
  });
  return wrapPaged_(html + '</tbody></table>', rows.length);
}

// ── NEWSLETTER DASHBOARD ──────────────────────────────────────────────
// Same web app, branches on ?view=newsletter. Filters Events to Site=email
// and applies real-recipient + real-campaign cross-validation so scanner
// noise (Mimecast/ProofPoint/etc auto-fetches with scrambled local-parts
// or scrambled campaign ids) doesn't pollute the numbers.
//
//   "Real subscriber" = an email address that appears anywhere in the Events
//     sheet as a subscribe row (column A contains '@' and doesn't start with '(').
//   "Real campaign" = a column-B value that has been seen with at least
//     NEWSLETTER_REAL_CAMPAIGN_THRESHOLD distinct real subscribers — scanners
//     can't fake this without forging real subscribers against a real campaign id.
//
// UA (column H) is also captured (via track.js / r/ / unsubscribe/) and any
// row whose UA matches NEWSLETTER_BOT_UA_REGEX is dropped from real counts.

var NEWSLETTER_REAL_CAMPAIGN_THRESHOLD = 3;
var NEWSLETTER_BOT_UA_REGEX = /HeadlessChrome|Mimecast|ProofPoint|Barracuda|GoogleAppsScript|google-apps-script|safelinks|urldefense|fetcher|prefetch|\bbot\b|crawler|spider|scanner/i;

function looksLikeBotUa_(ua) {
  if (!ua) return false;
  return NEWSLETTER_BOT_UA_REGEX.test(ua);
}

function renderNewsletterDashboard_(e) {
  if (!isAuthorizedForDashboard_(e)) {
    return HtmlService.createHtmlOutput(buildAccessDeniedHtml_()).setTitle('Access denied');
  }
  var days = parseInt(e.parameter.days || '90', 10);
  if (isNaN(days) || days < 1) days = 90;
  if (days > 365) days = 365;
  var selectedCampaign = e.parameter.campaign || '';

  var stats = computeNewsletterStats_(days);
  if (!selectedCampaign && stats.campaigns.length) {
    selectedCampaign = stats.campaigns[0].campaign;
  }
  var html = buildNewsletterHtml_(stats, days, selectedCampaign, e.parameter.token);
  return HtmlService.createHtmlOutput(html)
    .setTitle('Tenzi · Newsletter')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function computeNewsletterStats_(days) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var events = readSheetWithHeaders_(ss.getSheetByName(EVENTS_SHEET),
    ['Event','Page','Timestamp','IP','Referrer','Site','Recipient','UserAgent']);

  var cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days + 1);

  // Pass 1: build realSubscribers from subscribe rows across all time / all sites.
  var realSubscribers = {};
  events.forEach(function(row) {
    var ev = String(row.Event || '');
    if (ev.indexOf('@') !== -1 && ev.charAt(0) !== '(') {
      realSubscribers[ev.trim().toLowerCase()] = true;
    }
  });

  // Pass 2: collect email events within the window, tag each with realRecipient + botUa.
  var emailEvents = [];
  var realRecipientsByCampaign = {};
  events.forEach(function(row) {
    if (String(row.Site || '') !== 'email') return;
    var ts = parseTs_(row.Timestamp);
    if (!ts || ts < cutoff) return;
    var campaign = String(row.Page || '').trim();
    var recipient = String(row.Recipient || '').trim();
    var rkey = recipient.toLowerCase();
    var realRecipient = !!realSubscribers[rkey];
    emailEvents.push({
      ts: ts,
      event: String(row.Event || ''),
      campaign: campaign,
      recipient: recipient,
      ua: String(row.UserAgent || ''),
      realRecipient: realRecipient,
      botUa: looksLikeBotUa_(String(row.UserAgent || ''))
    });
    if (realRecipient && campaign) {
      var set = realRecipientsByCampaign[campaign] || (realRecipientsByCampaign[campaign] = {});
      set[rkey] = true;
    }
  });

  // Pass 3: derive realCampaigns — those with >= threshold distinct real recipients.
  var realCampaigns = {};
  Object.keys(realRecipientsByCampaign).forEach(function(c) {
    if (Object.keys(realRecipientsByCampaign[c]).length >= NEWSLETTER_REAL_CAMPAIGN_THRESHOLD) {
      realCampaigns[c] = true;
    }
  });

  // Pass 4: aggregate per-campaign — track raw + real side-by-side.
  var campaigns = {};
  emailEvents.forEach(function(e) {
    var c = e.campaign;
    if (!c) return;
    var entry = campaigns[c] || (campaigns[c] = {
      campaign: c,
      first: e.ts, last: e.ts,
      raw: { opens: 0, clicks: 0, unsubs: 0, recipients: {} },
      real: { opens: 0, clicks: 0, unsubs: 0, recipients: {}, ctaActions: {}, byHour: {}, recipientActivity: {} },
      isReal: !!realCampaigns[c],
      botRows: 0,
      suspiciousRows: []
    });
    if (e.ts < entry.first) entry.first = e.ts;
    if (e.ts > entry.last) entry.last = e.ts;

    var ev = e.event;
    var isOpen = ev === '(cta: email_open)';
    var isUnsub = ev === '(cta: email_unsubscribe_click)';
    var isCta = ev.indexOf('(cta: ') === 0 && !isOpen && !isUnsub && ev.charAt(ev.length - 1) === ')';
    var rkey = e.recipient.toLowerCase();

    if (isOpen) entry.raw.opens++;
    else if (isUnsub) entry.raw.unsubs++;
    else if (isCta) entry.raw.clicks++;
    if (rkey) entry.raw.recipients[rkey] = true;

    var passes = e.realRecipient && entry.isReal && !e.botUa;
    if (!passes) {
      entry.botRows++;
      if (entry.suspiciousRows.length < 50) {
        entry.suspiciousRows.push({
          ts: e.ts, event: ev, recipient: e.recipient, ua: e.ua,
          reason: !e.realRecipient ? 'recipient not in subscribers'
                : !entry.isReal ? 'campaign id failed cross-validation'
                : 'bot UA'
        });
      }
      return;
    }

    if (isOpen) entry.real.opens++;
    else if (isUnsub) entry.real.unsubs++;
    else if (isCta) {
      entry.real.clicks++;
      var action = ev.substring(6, ev.length - 1);
      entry.real.ctaActions[action] = (entry.real.ctaActions[action] || 0) + 1;
    }
    if (rkey) {
      entry.real.recipients[rkey] = true;
      var act = entry.real.recipientActivity[rkey] || (entry.real.recipientActivity[rkey] = {
        recipient: e.recipient, opens: 0, clicks: 0, unsubs: 0, last: e.ts
      });
      if (isOpen) act.opens++;
      else if (isUnsub) act.unsubs++;
      else if (isCta) act.clicks++;
      if (e.ts > act.last) act.last = e.ts;
    }
    var hourBucket = Math.floor((e.ts - entry.first) / 3600000);
    if (hourBucket >= 0 && hourBucket < 168) {
      var hb = entry.real.byHour[hourBucket] || (entry.real.byHour[hourBucket] = { opens: 0, clicks: 0, unsubs: 0 });
      if (isOpen) hb.opens++;
      else if (isUnsub) hb.unsubs++;
      else if (isCta) hb.clicks++;
    }
  });

  var campaignList = Object.keys(campaigns).map(function(c) {
    var entry = campaigns[c];
    return {
      campaign: c, first: entry.first, last: entry.last, isReal: entry.isReal,
      raw: entry.raw, real: entry.real,
      rawRecipientCount: Object.keys(entry.raw.recipients).length,
      realRecipientCount: Object.keys(entry.real.recipients).length,
      botRows: entry.botRows,
      suspiciousRows: entry.suspiciousRows
    };
  });
  campaignList.sort(function(a, b) { return b.last - a.last; });

  var realCampaignList = campaignList.filter(function(c) { return c.isReal; });

  return {
    campaigns: realCampaignList,
    allCampaigns: campaignList,
    realSubscriberCount: Object.keys(realSubscribers).length
  };
}

function buildNewsletterHtml_(stats, days, selectedCampaign, token) {
  var baseUrl = ScriptApp.getService().getUrl();
  var qs = function(d, c) {
    return baseUrl + '?view=newsletter&token=' + encodeURIComponent(token) + '&days=' + d
      + (c ? '&campaign=' + encodeURIComponent(c) : '');
  };
  var rangeBtn = function(label, d) {
    return '<a href="' + qs(d, selectedCampaign) + '" class="' + (days === d ? 'active' : '') + '">' + label + '</a>';
  };

  var selectedEntry = null;
  for (var i = 0; i < stats.campaigns.length; i++) {
    if (stats.campaigns[i].campaign === selectedCampaign) { selectedEntry = stats.campaigns[i]; break; }
  }

  var campaignOptions = stats.campaigns.map(function(c) {
    var lbl = c.campaign + '  ·  ' + Utilities.formatDate(c.last, DASHBOARD_TIMEZONE, 'd MMM');
    var sel = (c.campaign === selectedCampaign) ? ' selected' : '';
    return '<option value="' + escapeHtml_(qs(days, c.campaign)) + '"' + sel + '>' + escapeHtml_(lbl) + '</option>';
  }).join('');

  var body =
    '<nav class="nav">' +
      '<div class="brand">tenzi · <strong>newsletter</strong></div>' +
      '<div class="user">window: ' + days + 'd · campaigns: ' + stats.campaigns.length + ' · subscribers: ' + stats.realSubscriberCount + '</div>' +
    '</nav>' +
    '<h1>Newsletter analytics</h1>' +
    '<div class="subtitle">Email opens, clicks, unsubscribes by campaign. Filtered to real subscribers (column G is in the subscribe set) and real campaign ids (≥' + NEWSLETTER_REAL_CAMPAIGN_THRESHOLD + ' distinct subscribers engaged). Scanner UA strings (Mimecast, ProofPoint, headless Chrome) are dropped from "real" counts but kept in raw + suspicious-rows panel.</div>' +

    '<div class="filters">' +
      '<span class="label">View</span>' +
      '<div class="range"><a href="' + baseUrl + '?view=dashboard&token=' + encodeURIComponent(token) + '&days=' + days + '">Site</a><a class="active">Newsletter</a></div>' +
      '<span class="label">Range</span>' +
      '<div class="range">' + rangeBtn('30D', 30) + rangeBtn('90D', 90) + rangeBtn('180D', 180) + rangeBtn('1Y', 365) + '</div>' +
      (stats.campaigns.length
        ? '<span class="label">Campaign</span>' +
          '<select class="campaign-select" onchange="if(this.value)location.href=this.value">' + campaignOptions + '</select>'
        : '') +
    '</div>';

  if (!stats.campaigns.length) {
    body += '<div class="card empty-card"><h3>No campaigns yet</h3>' +
            '<p>No real campaigns detected in this window. A campaign becomes "real" once at least ' + NEWSLETTER_REAL_CAMPAIGN_THRESHOLD + ' subscribers from the subscribe set engage with it. Send a campaign and refresh.</p>' +
            (stats.allCampaigns.length ? '<p style="color:var(--dim);font-size:12px">Saw ' + stats.allCampaigns.length + ' campaign-id values that didn\'t cross-validate — likely all scanner mangling.</p>' : '') +
            '</div>';
  } else if (selectedEntry) {
    body += buildCampaignSection_(selectedEntry);
  }

  body += sectionLabel_('All campaigns', stats.campaigns.length + ' SHOWN') +
          '<div class="card">' + buildCampaignOverview_(stats.campaigns, qs, days) + '</div>';

  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Tenzi · Newsletter</title>' +
    '<base target="_top">' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter+Tight:wght@400;500;600&display=swap" rel="stylesheet">' +
    '<style>' + dashboardCss_() + newsletterCss_() + '</style>' +
    '</head><body><div class="wrap">' + body +
    '<footer class="foot">' +
      '<span>Window: last ' + days + ' days · Real-campaign threshold: ≥' + NEWSLETTER_REAL_CAMPAIGN_THRESHOLD + ' real subscribers</span>' +
      '<span>Refreshed: ' + Utilities.formatDate(new Date(), DASHBOARD_TIMEZONE, 'yyyy-MM-dd HH:mm') + ' Melbourne</span>' +
    '</footer>' +
    '</div>' +
    '<script>' + dashboardJs_() + '</script>' +
    '</body></html>';
}

function newsletterCss_() {
  return '.campaign-select{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px;padding:6px 10px;border:1px solid var(--border);border-radius:4px;background:var(--panel);color:var(--text);min-width:280px;cursor:pointer}' +
    '.campaign-select:hover{border-color:var(--border-bright)}' +
    '.kpi-pair{display:flex;align-items:baseline;gap:8px;font-feature-settings:"tnum"}' +
    '.kpi-pair .raw{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px;color:var(--dim)}' +
    '.empty-card{padding:32px;text-align:center;color:var(--muted)}' +
    '.empty-card h3{color:var(--text);font-weight:500;margin-bottom:8px;font-size:18px}' +
    '.timeline-table td.r{font-feature-settings:"tnum"}' +
    '.suspicious-toggle{margin:18px 0 4px;font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px;color:var(--muted);cursor:pointer;text-transform:uppercase;letter-spacing:0.12em;display:inline-block;padding:6px 10px;border:1px solid var(--border);border-radius:4px;background:var(--panel)}' +
    '.suspicious-toggle:hover{border-color:var(--border-bright);color:var(--text)}' +
    '.ua-cell{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10px;color:var(--dim);max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.reason-tag{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.12em;padding:2px 6px;border-radius:2px;background:rgba(156,59,59,0.08);color:#9c3b3b}';
}

function buildCampaignSection_(c) {
  var t = c.real, raw = c.raw;
  var realRecipients = c.realRecipientCount;
  var rawRecipients = c.rawRecipientCount;
  var openRate = realRecipients > 0 ? Math.round(t.opens / realRecipients * 100) : 0;
  var clickRate = t.opens > 0 ? Math.round(t.clicks / t.opens * 100) : 0;
  var unsubRate = realRecipients > 0 ? Math.round(t.unsubs / realRecipients * 100 * 10) / 10 : 0;

  function pair(label, real, raw, accent) {
    return '<div class="kpi' + (accent ? ' accent' : '') + '">' +
      '<div class="lbl">' + label + '</div>' +
      '<div class="val">' + formatNumber_(real) + '</div>' +
      (raw !== undefined && raw !== real ? '<div class="kpi-pair"><span class="raw">raw ' + formatNumber_(raw) + '</span></div>' : '') +
    '</div>';
  }
  function ratio(label, value, suffix) {
    return '<div class="kpi"><div class="lbl">' + label + '</div><div class="val">' + value + (suffix || '') + '</div></div>';
  }

  var html = sectionLabel_(c.campaign, Utilities.formatDate(c.first, DASHBOARD_TIMEZONE, 'd MMM') + ' &rarr; ' + Utilities.formatDate(c.last, DASHBOARD_TIMEZONE, 'd MMM') + (c.botRows ? ' · ' + c.botRows + ' rows dropped' : ''));
  html += '<div class="kpi-row">' +
    pair('Engaged subscribers', realRecipients, rawRecipients, true) +
    pair('Opens', t.opens, raw.opens) +
    pair('Clicks', t.clicks, raw.clicks) +
    pair('Unsubscribes', t.unsubs, raw.unsubs) +
    ratio('Open rate', openRate, '%') +
    ratio('Click-through', clickRate, '%') +
  '</div>';

  // CTA breakdown
  var ctaRows = mapToList_(t.ctaActions, 'action', 'clicks');
  html += '<div class="grid-2">' +
    '<div>' +
      sectionLabel_('CTA breakdown', ctaRows.length + ' ACTIONS') +
      '<div class="card">' + buildNewsletterCtaTable_(ctaRows) + '</div>' +
    '</div>' +
    '<div>' +
      sectionLabel_('Activity by hour after send', '0–48H') +
      '<div class="card">' + buildNewsletterTimeline_(t.byHour) + '</div>' +
    '</div>' +
  '</div>';

  // Recipient activity
  var recipientRows = Object.keys(t.recipientActivity).map(function(k) { return t.recipientActivity[k]; });
  recipientRows.sort(function(a, b) { return (b.opens + b.clicks) - (a.opens + a.clicks); });
  html += sectionLabel_('Recipient activity', recipientRows.length + ' SUBSCRIBERS ENGAGED') +
    '<div class="card">' + buildNewsletterRecipientsTable_(recipientRows) + '</div>';

  // Suspicious rows panel — collapsed by default
  if (c.suspiciousRows.length) {
    html += '<details class="card" style="padding:14px 18px"><summary class="suspicious-toggle">Suspicious rows · ' + c.botRows + ' dropped this campaign · click to expand</summary>' +
      '<div style="margin-top:12px">' + buildSuspiciousTable_(c.suspiciousRows) + '</div>' +
    '</details>';
  }

  return html;
}

function buildNewsletterCtaTable_(rows) {
  if (!rows.length) return '<div class="empty">No clicks recorded for this campaign yet.</div>';
  var maxV = rows[0].clicks;
  var html = '<table><thead><tr><th>Action</th><th class="r" style="width:140px">Clicks</th></tr></thead><tbody>';
  rows.forEach(function(r) {
    html += '<tr><td class="page">' + escapeHtml_(r.action) + '</td>' +
            '<td class="r"><div class="bar"><div class="bar-track"><div class="bar-fill" style="width:' + (r.clicks / maxV * 100) + '%"></div></div><span style="min-width:36px;text-align:right">' + formatNumber_(r.clicks) + '</span></div></td></tr>';
  });
  return html + '</tbody></table>';
}

function buildNewsletterTimeline_(byHour) {
  var keys = Object.keys(byHour).map(function(k) { return parseInt(k, 10); }).sort(function(a, b) { return a - b; });
  if (!keys.length) return '<div class="empty">No activity recorded yet for this campaign.</div>';
  var maxHour = Math.min(48, keys[keys.length - 1] + 1);
  var maxVal = 0;
  for (var h = 0; h < maxHour; h++) {
    var b = byHour[h];
    if (b) maxVal = Math.max(maxVal, b.opens + b.clicks);
  }
  if (maxVal === 0) maxVal = 1;
  var html = '<table class="timeline-table"><thead><tr><th>Hour</th><th class="r">Opens</th><th class="r">Clicks</th><th class="r">Unsubs</th><th style="width:120px">Activity</th></tr></thead><tbody>';
  for (var hr = 0; hr < maxHour; hr++) {
    var b = byHour[hr] || { opens: 0, clicks: 0, unsubs: 0 };
    var total = b.opens + b.clicks;
    if (total === 0 && b.unsubs === 0 && hr > 12) continue;
    var pct = (total / maxVal * 100);
    html += '<tr><td class="tsmono">+' + (hr < 10 ? '0' + hr : hr) + 'h</td>' +
            '<td class="r">' + formatNumber_(b.opens) + '</td>' +
            '<td class="r">' + formatNumber_(b.clicks) + '</td>' +
            '<td class="r">' + (b.unsubs ? formatNumber_(b.unsubs) : '') + '</td>' +
            '<td><div class="bar-track" style="height:6px"><div class="bar-fill" style="width:' + pct + '%"></div></div></td></tr>';
  }
  return html + '</tbody></table>';
}

function buildNewsletterRecipientsTable_(rows) {
  if (!rows.length) return '<div class="empty">No engaged subscribers yet.</div>';
  var html = '<table><thead><tr><th>Recipient</th><th class="r">Opens</th><th class="r">Clicks</th><th class="r">Unsub</th><th class="r">Last activity</th></tr></thead><tbody>';
  rows.forEach(function(r, i) {
    var pg = Math.floor(i / DASHBOARD_PAGE_SIZE);
    html += '<tr data-row="' + pg + '">' +
            '<td>' + escapeHtml_(r.recipient) + '</td>' +
            '<td class="r">' + formatNumber_(r.opens) + '</td>' +
            '<td class="r">' + formatNumber_(r.clicks) + '</td>' +
            '<td class="r">' + (r.unsubs ? '<span style="color:#9c3b3b">✓</span>' : '') + '</td>' +
            '<td class="r tsmono">' + formatTs_(r.last) + '</td></tr>';
  });
  return wrapPaged_(html + '</tbody></table>', rows.length);
}

function buildSuspiciousTable_(rows) {
  var html = '<table><thead><tr><th>When</th><th>Event</th><th>Recipient</th><th>UA</th><th>Reason</th></tr></thead><tbody>';
  rows.forEach(function(r) {
    var event = r.event;
    if (event.length > 36) event = event.substring(0, 33) + '…';
    html += '<tr>' +
            '<td class="tsmono">' + formatTs_(r.ts) + '</td>' +
            '<td>' + escapeHtml_(event) + '</td>' +
            '<td>' + escapeHtml_(r.recipient || '—') + '</td>' +
            '<td class="ua-cell" title="' + escapeHtml_(r.ua) + '">' + escapeHtml_(r.ua || '—') + '</td>' +
            '<td><span class="reason-tag">' + escapeHtml_(r.reason) + '</span></td></tr>';
  });
  return html + '</tbody></table>';
}

function buildCampaignOverview_(rows, qs, days) {
  if (!rows.length) return '<div class="empty">No real campaigns yet.</div>';
  var html = '<table><thead><tr><th>Campaign</th><th class="r">Sent</th><th class="r">Opens</th><th class="r">Clicks</th><th class="r">Unsubs</th><th class="r">Open rate</th></tr></thead><tbody>';
  rows.forEach(function(r) {
    var openRate = r.realRecipientCount > 0 ? Math.round(r.real.opens / r.realRecipientCount * 100) : 0;
    var sentDate = Utilities.formatDate(r.first, DASHBOARD_TIMEZONE, 'd MMM yy');
    html += '<tr>' +
            '<td><a href="' + escapeHtml_(qs(days, r.campaign)) + '" style="color:var(--accent);text-decoration:none">' + escapeHtml_(r.campaign) + '</a></td>' +
            '<td class="r tsmono">' + sentDate + '</td>' +
            '<td class="r">' + formatNumber_(r.real.opens) + '</td>' +
            '<td class="r">' + formatNumber_(r.real.clicks) + '</td>' +
            '<td class="r">' + formatNumber_(r.real.unsubs) + '</td>' +
            '<td class="r">' + openRate + '%</td></tr>';
  });
  return html + '</tbody></table>';
}
