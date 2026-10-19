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
const dateKey = days => ago(days).slice(0, 10);
// Days ago of the Monday that starts the most recent complete Monday-to-Sunday week.
const lastFullWeekMonday = () => (new Date().getDay() + 6) % 7 + 7;

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

test('the weekly series totals each complete Monday-to-Sunday week and counts a returning visitor once', () => {
  const mon = lastFullWeekMonday();
  const stats = dashboard([
    view('Report', mon, '192.0.2.1'), view('Report', mon - 6, '192.0.2.1'), // Monday and Sunday, same visitor
    view('Index', mon - 2, '192.0.2.2'), signup('a@example.com', 'Index', mon - 1)
  ]).computeStats_(90, 'all', '');
  const week = stats.weekly.find(w => w.date === dateKey(mon));
  assert.deepEqual({...week}, {date: dateKey(mon), pageViews: 3, uniqueVisitors: 2, ctaClicks: 0, subscribers: 1});
});

test('the weekly series leaves out part weeks, including the one still in progress', () => {
  const weeks = Array.from(dashboard([view('Report', 0, '192.0.2.1')]).computeStats_(90, 'all', '').weekly,
    w => w.date);
  assert.equal(weeks.at(-1), dateKey(lastFullWeekMonday()));
  assert.ok(weeks[0] >= dateKey(89), 'the first week starts inside the window');
  assert.ok(weeks.every(d => new Date(d + 'T12:00:00').getDay() === 1), 'every week starts on a Monday');
});

test('long windows offer a Daily / Weekly toggle on the activity chart, short ones do not', () => {
  const render = days => dashboard([view('Report', 1, '192.0.2.1')])
    .renderDashboard_({parameter: {view: 'dashboard', token: 'test-token', days: String(days)}}).html;
  const year = render(365);
  assert.match(year, /<button type="button" data-interval-btn="week">Weekly<\/button>/);
  assert.match(year, /<div class="interval" data-interval="week">/);
  assert.match(year, /data-date="Week of \d{4}-\d{2}-\d{2}"/);
  assert.doesNotMatch(render(30), /<button[^>]*data-interval-btn/);
});
