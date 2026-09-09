# Compliance guide feedback

The guide lives in `../tenzi-compliance/index.html`. Its feedback receiver is part of this repository's canonical `apps-script.gs`, using the existing deployment already configured in `../tenzi-homepage/track.js`. There is no separate backend deployment or change to the tracker library.

## Destination and review

- Spreadsheet: `1Jd2EuDMTh59fCRFQcvcOeKvBD1xMgVbcowTOTjlokPY`.
- Tab: **Compliance Feedback**. It inherits the spreadsheet's sharing permissions.
- Columns A–L: Timestamp, Submission ID, Entry ID, Entry, Entry URL, Official source, Feedback type, Message, Supporting source, Email, Status, Review notes.
- Timestamp is generated server-side in `Australia/Melbourne`. Status starts as `New`; reviewers can change it to `Reviewing` or `Resolved` and add Review notes.
- Reply email is optional. The feedback route does not send emails or add newsletter subscribers.
- Keep column names/order intact: a header mismatch stops writes instead of appending into unrelated data. Sorting data rows while preserving the header is fine.

## Deployment

1. In the target spreadsheet, open **Extensions → Apps Script**. Update the existing project from `apps-script.gs`. Preserve any deployed private `DASHBOARD_TOKEN` and intentional `EXCLUDED_IPS` configuration; do not commit the real token.
2. Run `setupComplianceFeedback()` once from the editor. Authorise spreadsheet access if prompted. This creates/validates the tab without adding a feedback row. The first valid feedback POST can also create it automatically.
3. **Deploy → Manage deployments → edit the existing web app → New version → Deploy.** Keep the same URL and existing public access configuration (execute as the owner, allow visitors without signing in).
4. Before publishing the guide, check `<existing-exec-url>?view=compliance-feedback`. The JSON response must contain `ready: true` and `protocol: "tenzi-compliance-feedback-v1"`. Readiness identifies the code version; it does not prove spreadsheet permissions or a successful write.
5. From the guide's actual hosting origin, submit one clearly labelled test note. Confirm the success message and matching row in **Compliance Feedback**, including the optional email and source link. Confirm it did not create a Contacts/subscriber row.
6. Check Events for the page view and `compliance_feedback_submit` under site=`resources` and the guide's title. Verify a normal resources subscription/contact submission still follows its existing route when doing release verification.

These are manual deployment/verification steps; repository edits and local automated tests do not update or verify the live Apps Script deployment. No authenticated deployment tooling is configured in these repositories.

## Request and response

`GET ?view=compliance-feedback` returns the protocol/readiness object without reading or writing feedback. The browser checks it before sending private fields; a legacy deployment cannot accidentally receive the feedback as a subscription. A legacy receiver may log that GET as `(cta: compliance_feedback_availability_check)`.

The guide sends a CORS POST to the same `/exec` URL, with `Content-Type: text/plain;charset=UTF-8` and a JSON body. There are no custom authentication headers or browser credentials. [Apps Script Content Service](https://developers.google.com/apps-script/guides/content) serves the JSON response through a Google redirect; the browser follows that redirect. Do not replace this with `no-cors` or treat an opaque response as success. Verify browser access against the deployed public web app; if permissions, CORS, network or redirects prevent a readable response, the guide keeps the note and offers copy/download.

| Field | Requirement |
| --- | --- |
| `source` | `compliance_feedback` |
| `submissionId` | Random UUID v4; reused for unchanged retries during this page visit |
| `entryId`, `entryTitle` | Required; `general` identifies guide-wide feedback; maximum 80/200 characters |
| `entryUrl`, `officialSource` | Optional HTTP(S) URLs, maximum 2,048 characters each; file-preview URLs are omitted |
| `kind` | Possible error, Unclear explanation, Missing resource, or General feedback |
| `message` | Required nonblank text, maximum 5,000 characters |
| `supportingSource` | Optional HTTP(S) URL, maximum 2,048 characters (guide input caps at 2,000) |
| `email` | Optional reply email, maximum 254 characters |
| `website` | Honeypot; must be empty |
| `ip` | Optional cached visitor IP from the existing tracker; used for exclusions/rate limits, not stored in the feedback row |

Successful response: `{ "protocol": "tenzi-compliance-feedback-v1", "ok": true, "submissionId": "<matching UUID>" }`. It is returned only after the row is flushed, or a row with that ID already exists. A script lock protects creation/deduplication/appends. Text beginning with formula characters is escaped before writing to Sheets.

Failure response: the same protocol with `ok: false` and an `error` code (`invalid_feedback`, `not_accepted`, `busy`, `rate_limited`, or `save_failed`). No feedback contents are reflected in the response. The UI preserves the note and avoids claiming success for failures, wrong IDs, opaque responses or the legacy plain `ok` response. Submission controls are disabled while sending; unchanged retries reuse the ID even after closing/reopening the dialog. Drafts and IDs are held in memory and lost on refresh.

Feedback uses a best-effort cap of 10 writes per supplied IP per hour under a separate `compliance-feedback:` rate-limit key. This follows the existing contact endpoint's mechanism: the client-supplied IP is optional/spoofable and is not authentication. Feedback never uses the contact notification helper. Existing Events/Contacts routing and dashboard aggregation are unchanged.

## Tracking

The guide loads `https://tenzi.ai/track.js` and calls `tenziTrack.init({site:'resources'})` once. This reuses normal page views, visible dwell, visitor-IP lookup, referrer, user agent and newsletter attribution. Blocking the tracker does not prevent guide rendering or feedback submission.

CTA events are prefixed `compliance_`: `feedback_open`, `feedback_flag_error`, `feedback_send_click`, `feedback_submit`, `feedback_send_error`, `feedback_copy`, `feedback_download`, `entry_share`, `official_source_click`, `tenzi_link_click`, `browse_sources`, `explore_topics`, `activity_filter`, `category_filter`, `filters_reset`, `print`. `feedback_submit` fires only after the matching save receipt. Free-text search, feedback content, supporting links and reply email are excluded from these CTA payloads.

## Local verification

Run `node --test tests/apps-script-feedback.test.cjs` in this repository. The tests exercise target selection, tab/header creation, save receipts, duplicate retries, formula escaping, validation, rate limiting, failure/locking behaviour and unchanged Events/Contacts routing with isolated Apps Script service doubles.

Run `node tests/feedback-browser.cjs` in `../tenzi-compliance` with Playwright installed. `PLAYWRIGHT_MODULE` can point to an external package installation and `CHROMIUM_PATH` to a Chromium binary. The browser checks confirmed saves, old receivers, lost/wrong responses, retry IDs, per-entry drafts, analytics through the actual shared tracker, content isolation and desktop/mobile layouts. Every network request is intercepted; these tests do not write to the live spreadsheet or send notification emails.
