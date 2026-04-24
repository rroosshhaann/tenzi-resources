// Tenzi tracking + contact-form endpoint.
// Lives in the Google Sheet linked to resources.tenzi.ai and tenzi.ai.
// Canonical source-of-truth: this file. Paste into Apps Script after edits,
// then Deploy > Manage deployments > New version > Deploy.

var EVENTS_SHEET = 'Events';
var CONTACTS_SHEET = 'Contacts';
var NOTIFY_EMAIL = 'roshan@tenzi.ai';
var CONTACT_RATE_LIMIT = 5;             // contact submissions per IP per window
var CONTACT_RATE_WINDOW_MS = 3600000;   // 1 hour
var EXCLUDED_IPS = [];                  // IPs silently dropped from all sheets — populate with your own (find via the Events sheet IP column)

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  if (isExcludedIp_(data.ip)) return ContentService.createTextOutput('ok');
  var melbTime = Utilities.formatDate(new Date(), 'Australia/Melbourne', 'yyyy-MM-dd HH:mm:ss');

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
    writeEvent_(data.email, data.page, melbTime, data.ip, data.referrer);
  }
  return ContentService.createTextOutput('ok');
}

function doGet(e) {
  if (isExcludedIp_(e.parameter.ip)) return ContentService.createTextOutput('ok');
  var melbTime = Utilities.formatDate(new Date(), 'Australia/Melbourne', 'yyyy-MM-dd HH:mm:ss');
  writeEvent_(e.parameter.email || '(page view)', e.parameter.page || '', melbTime, e.parameter.ip, e.parameter.ref);
  return ContentService.createTextOutput('ok');
}

function isExcludedIp_(ip) {
  return ip && EXCLUDED_IPS.indexOf(ip) !== -1;
}

function writeEvent_(email, page, melbTime, ip, referrer) {
  getOrCreate_(EVENTS_SHEET).appendRow([email || '', page || '', melbTime, ip || '', referrer || '']);
}

function writeContact_(data, melbTime) {
  var sheet = getOrCreate_(CONTACTS_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp','Name','Email','Organisation','Role','Interest','Message','Page','IP','Referrer']);
  }
  sheet.appendRow([melbTime, data.name||'', data.email||'', data.organisation||'', data.role||'', data.interest||'', data.message||'', data.page||'', data.ip||'', data.referrer||'']);
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
