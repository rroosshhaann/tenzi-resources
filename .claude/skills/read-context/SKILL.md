---
description: Load full project context — git status across resources + homepage, recent commits, tracker coverage sanity check, Apps Script deploy reminder, and pointers to canonical docs
---

# Read Context — Get Up to Speed

Load everything needed to understand the current state of the Tenzi resources site and its sibling marketing site. Run at the start of a session, after a long break, or when context feels stale.

This project spans two repos that ship together:

- **`/home/rosie/code/tenzi-resources`** — `resources.tenzi.ai`, the free-data site (this repo)
- **`/home/rosie/code/tenzi-homepage`** — `tenzi.ai`, the marketing root + home of `track.js`

A change in one usually has implications in the other.

## Step 1: Git status across both repos

```bash
echo "=== resources (tenzi-resources) ==="
cd /home/rosie/code/tenzi-resources && git status -s
echo "---"
git log --oneline -5
echo
echo "=== homepage (tenzi-homepage) ==="
cd /home/rosie/code/tenzi-homepage && git status -s
echo "---"
git log --oneline -5
```

## Step 2: Tracker coverage sanity check

Every HTML page in the resources repo MUST load `https://tenzi.ai/track.js` and call `tenziTrack.init({ site: 'resources' })`. Drift here means broken analytics.

```bash
cd /home/rosie/code/tenzi-resources
total=$(find . -name "*.html" -not -path "./.git/*" -not -path "./.claude/*" | wc -l)
with_tracker=$(grep -rl "https://tenzi.ai/track.js" --include="*.html" . 2>/dev/null | wc -l)
with_init=$(grep -rl "tenziTrack.init" --include="*.html" . 2>/dev/null | wc -l)
echo "HTML pages: $total"
echo "Loading track.js: $with_tracker"
echo "Calling tenziTrack.init: $with_init"
echo
echo "Pages MISSING the shared tracker (should be empty):"
find . -name "*.html" -not -path "./.git/*" -not -path "./.claude/*" -print0 | xargs -0 grep -L "https://tenzi.ai/track.js" 2>/dev/null || echo "  (none)"
```

## Step 3: Apps Script deploy lag

`apps-script.gs` is the source of truth. The deployed copy in the linked Google Sheet must be updated manually after edits. The skill can't read the live deployment, but it can flag when local changes have been committed since the last "Apps Script deployed" marker (a commit with the word `deployed` in the message — convention, not enforced).

```bash
cd /home/rosie/code/tenzi-resources
echo "Last 3 commits touching apps-script.gs:"
git log -3 --oneline -- apps-script.gs
echo
last_apps_change=$(git log -1 --format='%cr — %s' -- apps-script.gs)
echo "Most recent apps-script.gs change: $last_apps_change"
echo
echo "REMINDER: paste apps-script.gs into the linked Google Sheet's Script"
echo "Editor and 'Deploy > Manage deployments > New version' if there have"
echo "been any changes since the last deploy. Source of truth is this repo;"
echo "the deployed copy may lag."
```

## Step 4: Page inventory

```bash
cd /home/rosie/code/tenzi-resources
echo "Reports:"
ls reports/*.html 2>/dev/null | sed 's|^|  |'
echo
echo "Runbooks:"
ls runbooks/*.html 2>/dev/null | sed 's|^|  |'
echo
echo "Premium samples:"
ls premium-samples/*.html 2>/dev/null | sed 's|^|  |'
```

## Step 5: Print structured summary

After gathering the above, print a summary in this format:

```
=== Context Loaded ===

REPO STATE
- Resources: [clean | N uncommitted files] · last: [commit subject]
- Homepage: [clean | N uncommitted files] · last: [commit subject]

TRACKER COVERAGE
- N HTML pages, all loading track.js (or list missing pages)

APPS SCRIPT
- apps-script.gs last touched: [N days ago] — [commit subject]
- Deploy reminder: paste into Apps Script editor + bump version if changed

PAGE INVENTORY
- Reports: N · Runbooks: N · Premium samples: N

KEY DOCS (read on demand, not all at once)
- ./CLAUDE.md — project conventions, tracking + design overview (auto-loaded)
- ./DESIGN_STANDARD.md — Terminal Grid (Light): tokens, type scale, components
- ./DASHBOARD.md — private analytics dashboard reference
- ../tenzi-homepage/track.js — shared client-side tracker (single source of truth)

DASHBOARD URL PATTERN
  <web-app URL>?view=dashboard&token=<TOKEN>&days=30&site=all
  (Token is a script constant, never appears in this repo or track.js)

SUGGESTED NEXT
[Based on what's uncommitted / missing / due, suggest the obvious next move.
 If both repos are clean and there's no obvious work, just say so.]
```

The suggested-next-step should prioritise:

1. **Uncommitted changes in either repo** — flag what's pending and ask if the user wants to review/commit
2. **Pages missing the shared tracker** — fix immediately (broken analytics)
3. **Apps Script changes since last deploy marker** — remind to redeploy
4. **Cross-repo drift** — if one repo's recent commits reference something the other doesn't yet have, flag it

If everything's clean and synced, just confirm and stop — don't invent work.
