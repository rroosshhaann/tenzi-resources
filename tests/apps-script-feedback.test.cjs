const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../apps-script.gs'), 'utf8');

function harness() {
  const sheets = new Map(), properties = new Map(), emails = [];
  let locked = false, busy = false, failWrite = false;
  function sheet(name) {
    const rows = [];
    return {rows, getLastRow: () => rows.length, setFrozenRows() {}, setColumnWidth() {},
      appendRow(row) { if (failWrite) throw Error('write failed'); rows.push(Array.from(row)); },
      getRange(start, col, count, width) {
        return {setFontWeight() {}, getValues: () => rows.slice(start - 1, start - 1 + count).map(row => row.slice(col - 1, col - 1 + width)),
          createTextFinder(value) { return {matchEntireCell() { return this; }, findNext() {
            return rows.slice(start - 1, start - 1 + count).some(row => row[col - 1] === value) ? {} : null;
          }}; }};
      }};
  }
  const spreadsheet = {
    getSheetByName: name => sheets.get(name),
    insertSheet(name) {
      if (name === 'Compliance Feedback') assert.equal(locked, true, 'tab creation must be locked');
      const value = sheet(name); sheets.set(name, value); return value;
    }
  };
  const context = vm.createContext({console: {log() {}},
    SpreadsheetApp: {getActiveSpreadsheet: () => spreadsheet, openById(id) {
      assert.equal(id, '1Jd2EuDMTh59fCRFQcvcOeKvBD1xMgVbcowTOTjlokPY'); return spreadsheet;
    }, flush() {}},
    ContentService: {MimeType: {JSON: 'json'}, createTextOutput(text) {return {text, setMimeType() { return this; }};}},
    Utilities: {formatDate: () => '2026-09-09 16:00:00'},
    LockService: {getScriptLock: () => ({tryLock() {if (busy) return false; locked = true; return true;},
      waitLock() {locked = true;}, releaseLock() {locked = false;}})},
    PropertiesService: {getScriptProperties: () => ({getProperty: key => properties.get(key), setProperty: (key, value) => properties.set(key, value)})},
    MailApp: {sendEmail: data => emails.push(data)}
  });
  vm.runInContext(source, context);
  return {context, sheets, emails, get locked() {return locked;}, set busy(value) {busy = value;}, set failWrite(value) {failWrite = value;},
    post(data) {return context.doPost({postData: {contents: JSON.stringify(data)}});},
    feedback(data) {return JSON.parse(this.post(data).text);}};
}

function note(extra = {}) {
  return {source: 'compliance_feedback', submissionId: '37dd316e-8792-4367-9959-b111a81167a3',
    entryId: 'complaints-and-incidents', entryTitle: 'Complaints and incidents', entryUrl: 'https://example.com/#entry-complaints-and-incidents',
    officialSource: 'https://asic.gov.au/', kind: 'Possible error', message: 'Please clarify this explanation.',
    supportingSource: '', email: '', ip: '192.0.2.1', website: '', ...extra};
}

test('capability check is read-only and returns a versioned response', () => {
  const h = harness();
  assert.deepEqual(JSON.parse(h.context.doGet({parameter: {view: 'compliance-feedback'}}).text),
    {ready: true, protocol: 'tenzi-compliance-feedback-v1'});
  assert.equal(h.sheets.size, 0);
});

test('first submission creates the target tab, saves context and returns its receipt', () => {
  const h = harness(), input = note({supportingSource: 'https://example.com/source', email: 'reviewer@example.com'});
  const response = h.feedback(input);
  assert.deepEqual(response, {ok: true, submissionId: input.submissionId, protocol: 'tenzi-compliance-feedback-v1'});
  const rows = h.sheets.get('Compliance Feedback').rows;
  assert.deepEqual(rows[0], Array.from(h.context.FEEDBACK_HEADERS));
  assert.deepEqual(rows[1], ['2026-09-09 16:00:00', input.submissionId, input.entryId, input.entryTitle, input.entryUrl,
    input.officialSource, input.kind, input.message, input.supportingSource, input.email, 'New', '']);
  assert.equal(h.sheets.size, 1);
  assert.equal(h.emails.length, 0);
  assert.equal(h.locked, false);
});

test('a retry returns the original receipt without adding another row or resetting review status', () => {
  const h = harness(); h.feedback(note());
  h.sheets.get('Compliance Feedback').rows[1][10] = 'Reviewing';
  assert.equal(h.feedback(note()).ok, true);
  assert.equal(h.sheets.get('Compliance Feedback').rows.length, 2);
  assert.equal(h.sheets.get('Compliance Feedback').rows[1][10], 'Reviewing');
});

test('general feedback accepts empty optional fields and stores formulas as literal text', () => {
  const h = harness();
  assert.equal(h.feedback(note({entryId: 'general', entryTitle: '=HYPERLINK("https://example.com")', entryUrl: '', officialSource: '',
    message: '  =IMPORTXML("https://example.com", "//body")', email: '+reviewer@example.com'})).ok, true);
  const row = h.sheets.get('Compliance Feedback').rows[1];
  assert.match(row[3], /^'=/); assert.match(row[7], /^'=/); assert.match(row[9], /^'\+/);
});

test('invalid feedback and bot submissions never enter any worksheet', () => {
  for (const change of [{message: '  '}, {message: 'a'.repeat(5001)}, {message: {}}, {email: 'bad'},
    {entryId: '../invalid'}, {submissionId: 'bad'}, {kind: 'unrecognised'}, {supportingSource: 'javascript:alert(1)'},
    {supportingSource: 'https://bad url'}, {website: 'bot.example'}]) {
    const h = harness(); assert.equal(h.feedback(note(change)).ok, false, JSON.stringify(change)); assert.equal(h.sheets.size, 0);
  }
  const h = harness(); h.context.EXCLUDED_IPS = ['192.0.2.1'];
  assert.equal(h.feedback(note()).ok, false); assert.equal(h.sheets.size, 0);
});

test('rate limit, busy lock and write failure cannot return success', () => {
  const h = harness();
  for (let i = 0; i < 10; i++) assert.equal(h.feedback(note({submissionId: `37dd316e-8792-4367-9959-b111a81167${String(i).padStart(2, '0')}`})).ok, true);
  assert.equal(h.feedback(note()).error, 'rate_limited');
  assert.equal(h.sheets.get('Compliance Feedback').rows.length, 11);
  const busy = harness(); busy.busy = true; assert.equal(busy.feedback(note()).error, 'busy'); assert.equal(busy.sheets.size, 0);
  const failing = harness(); failing.failWrite = true; assert.equal(failing.feedback(note()).error, 'save_failed'); assert.equal(failing.locked, false);
});

test('setup is repeatable and unexpected existing headers are preserved', () => {
  const h = harness(); h.context.setupComplianceFeedback(); h.context.setupComplianceFeedback();
  const rows = h.sheets.get('Compliance Feedback').rows; assert.equal(rows.length, 1);
  rows[0][0] = 'Unrelated data';
  assert.equal(h.feedback(note()).error, 'save_failed');
  assert.equal(rows.length, 1); assert.equal(rows[0][0], 'Unrelated data'); assert.equal(h.locked, false);
});

test('existing tracking, subscriptions and contacts retain their routes', () => {
  const h = harness();
  assert.equal(h.post({source: 'subscribe', email: 'reader@example.com', page: 'Report', site: 'resources'}).text, 'ok');
  h.context.doGet({parameter: {email: '(cta: compliance_feedback_open)', page: 'Guide', site: 'resources'}});
  assert.deepEqual(h.sheets.get('Events').rows.map(row => row[0]), ['reader@example.com', '(cta: compliance_feedback_open)']);
  assert.equal(h.post({source: 'holding_page_contact', name: 'Example', email: 'contact@example.com', message: 'Hello'}).text, 'ok');
  assert.equal(h.sheets.get('Contacts').rows.length, 2); assert.equal(h.emails.length, 1);
  assert.equal(h.sheets.has('Compliance Feedback'), false);
});
