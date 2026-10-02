const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../apps-script.gs'), 'utf8');

// A fresh copy of the script whose Events sheet holds `events` under a header row.
function dashboard(events) {
  const sheets = {Events: [['Event', 'Page', 'Timestamp', 'IP', 'Referrer', 'Site'], ...events]};
  const context = vm.createContext({
    SpreadsheetApp: {getActiveSpreadsheet: () => ({getSheetByName: name =>
      sheets[name] && {getDataRange: () => ({getValues: () => sheets[name]})}})},
    HtmlService: {XFrameOptionsMode: {ALLOWALL: 'ALLOWALL'},
      createHtmlOutput: html => ({html, setTitle() { return this; }, setXFrameOptionsMode() { return this; }})},
    ScriptApp: {getService: () => ({getUrl: () => 'https://script.example/exec'})},
    Utilities: {formatDate: () => '2026-09-23 10:00'}
  });
  vm.runInContext(source, context);
  context.DASHBOARD_TOKEN = 'test-token';
  return context;
}

// Noon `days` ago, in the yyyy-MM-dd HH:mm:ss format the script writes.
function ago(days) {
  const d = new Date(); d.setDate(d.getDate() - days);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} 12:00:00`;
}

const view = (page, days, ip) => ['(page view)', page, ago(days), ip, '', 'resources'];
const signup = (email, page, days, site = 'resources') => [email, page, ago(days), '192.0.2.9', '', site];
const topPages = stats => Array.from(stats.topPages, r => ({...r}));

test('top pages credits each subscriber once, to the page of their earliest sign-up in the window', () => {
  const stats = dashboard([
    view('Report', 6, '192.0.2.1'), view('Report', 5, '192.0.2.2'), view('Report', 4, '192.0.2.3'),
    view('Index', 3, '192.0.2.4'), view('Index', 2, '192.0.2.5'),
    signup(' A@Example.com', 'Index', 2), // a later repeat listed first still leaves the credit with Report
    signup('a@example.com', 'Report', 5),
    signup('b@example.com', 'Index', 3), signup('c@example.com', 'Index', 4),
    signup('d@example.com', 'Index', 40) // previous window
  ]).computeStats_(30, 'all', '');
  assert.deepEqual(topPages(stats),
    [{page: 'Report', views: 3, subscribers: 1}, {page: 'Index', views: 2, subscribers: 2}]);
  assert.equal(stats.totals.subscribers, 3);
});

test('a sign-up on a page without views in the window still gets a row, so the column adds up to the tile', () => {
  const stats = dashboard([view('Report', 1, '192.0.2.1'), signup('a@example.com', 'Quiet page', 1)])
    .computeStats_(30, 'all', '');
  assert.deepEqual(topPages(stats),
    [{page: 'Report', views: 1, subscribers: 0}, {page: 'Quiet page', views: 0, subscribers: 1}]);
});

test('the subscribers column follows the site filter like every other table', () => {
  const stats = dashboard([signup('a@example.com', 'Report', 1), signup('b@example.com', 'Home', 1, 'marketing')])
    .computeStats_(30, 'resources', '');
  assert.deepEqual(topPages(stats), [{page: 'Report', views: 0, subscribers: 1}]);
});

test('the top pages table renders a subscribers column', () => {
  const html = dashboard([view('Report', 1, '192.0.2.1'), signup('a@example.com', 'Report', 1)])
    .renderDashboard_({parameter: {view: 'dashboard', token: 'test-token'}}).html;
  const start = html.indexOf('Top pages'), table = html.slice(start, html.indexOf('CTA clicks', start));
  assert.match(table, /<th[^>]*>Subscribers<\/th><\/tr>/);
  assert.match(table, />1<\/td><\/tr>/);
  assert.doesNotMatch(html, /Subscribers by page/);
});
