# WordWeft production administration

The private administration workspace lives at `/admin`. Access is based on the
existing backend `ROLE_ADMIN` authority; no email address is privileged by
this feature. The application menu displays the entry point only for admins,
and **every** `/api/admin/**` endpoint is protected by Spring Security.
`AdminConsoleController` also has a method-security check.

## Screens

- **Overview:** total and verified accounts, new signups this week, unique
  authors with published stories, story totals, published chapters, read
  counts, pending reports, Founding Writer applications and a seven-day
  signup/story creation chart.
- **Members:** paginated directory, literal name/email search, role filter,
  signup date, verification status and published story count. This view never
  returns password hashes, OTPs, reset tokens, private preferences or profile
  documents.
- **Stories:** searchable catalog across published stories and drafts.
  Includes author, chapter counts, publication status, views and reads. Full
  manuscript text and descriptions are not fetched for this list.
- **Reports:** filtered review queue. An admin can resolve or dismiss a
  non-community pending report with a written reason (10–1000 characters).
  The backend records the acting admin, timestamp and status atomically.
  Community posts and comments must be handled through the existing Community
  moderation desk (Community > shield icon), which preserves its separate
  content-removal safeguards and moderation audit trail.
- **Writer applications:** link to the existing Founding Writer application
  desk, retaining its existing review and manuscript access controls.
- **Operations:** read-only information and links for security, reporting
  workflow, applications and deployment.

## API

| Endpoint | Function |
| --- | --- |
| `GET /api/admin/console/overview` | Live platform snapshot |
| `GET /api/admin/console/users?page=0&size=20&q=&role=ALL` | Member directory |
| `GET /api/admin/console/stories?page=0&size=20&q=&status=ALL` | Story directory |
| `GET /api/admin/console/reports?page=0&size=20&status=PENDING` | Reports |
| `PATCH /api/admin/console/reports/{id}` | Resolve/dismiss report; JSON `{"status":"RESOLVED","reason":"..."}` |

Responses are marked `Cache-Control: no-store`. List page size is capped at
50, searches are escaped and bounded, and report decisions require a role
check and validated body.

## Metric definitions

- **Members:** stored user documents, including accounts not yet verified.
- **Authors:** distinct user IDs on published stories.
- **Stories:** stored book documents. Published and draft totals are separate.
- **Published chapters:** chapters with published status inside published books.
- **Reads:** sum of the stored `Book.readCount` field. Not unique readers.
- **New members/stories:** the last seven calendar dates, using `joinDate`
  and `createdAt`. Existing/legacy records without dates are excluded from
  these time-window counts.

These are operational database totals, not Google Analytics visitors, sessions,
or revenue. The chart isn't a count of page views. Daily source fields are
indexed for bounded admin reporting queries.

## Deployment and testing

This feature uses the existing MongoDB backend and JWT configuration. No
secrets, new environment variables, email-based administrator bootstrap, or
external analytics credentials are required.

Run `npm run typecheck`, `npm run build`, `(cd backend && mvn test)`, and
`npm run test:e2e` against the **disposable local fixture database**.
The added browser tests check anonymous/member denial, admin access, safe
response projections and navigation. Never run destructive tests against
production MongoDB.

## Deliberate exclusions

Account suspension, role assignment, mass messaging, forced unpublishing and
deletion are **not** enabled by this change. They need explicit moderation
policy, recovery safeguards, audit history and protections against locking out
the last administrator. The current member/story directories are read-only.
The report workflow records a decision only; it does not automatically remove
reported content.

Review and merge the PR after backend security tests and production deployment
checks have succeeded.


## User and story enforcement

The member directory supports **Suspend / Reinstate**, and story rows support
**Remove / Restore**. Report cards for BOOK or USER targets offer the same
actions and can mark a matching pending report resolved on success. The action
dialog requires a 10–1000 character reason and accepts a 0–2000 character
plain-text custom message for the author/member.

- A suspended user cannot sign in through email/password or Google, and
  existing JWT sessions are rejected when user details are reloaded.
  Other administrators (including yourself) cannot be suspended here.
- A removed story is hidden from public discovery and reading routes, but
  its manuscript, original publication status and ownership are retained.
  Scheduled publication and writer-initiated republishing are blocked until
  staff restoration. Restoring a story does not publish a private draft.
- All actions store the acting administrator and reason on the existing
  user/book document and append to the **existing** `community_moderation_events`
  audit collection. A failed audit write is returned as a warning.
- Transactional emails use the existing Apps Script email delivery system.
  Custom messages are HTML-escaped. The UI says **queued**, not delivered:
  actual delivery depends on the configured sender.
- Reports about COMMUNITY_POST and COMMUNITY_COMMENT continue to use the
  Community moderation desk, preserving existing content removal and audit
  rules. The admin console cannot bypass that flow.
- No account or book is permanently deleted. No mass messaging or
  administrator role reassignment is enabled.

## Google Sheets traffic analytics — read-only

**Source of truth stays in Google Sheets.** The existing frontend batches
events into `POST /api/analytics/events`, which forwards to an Apps Script
that appends events, page views and sessions to Sheets. That write pipeline
is **unchanged** by the administration console. The independent Founding Writer
submission-attempt Sheet is also unchanged; the application counts on the
Overview page still come from the existing Founding Writer Mongo documents.

A new admin-only `GET /api/admin/console/analytics?days=30` uses
`AdminSheetAnalyticsService` to call a **read-only** Apps Script web endpoint.
It returns aggregated traffic without participant identity, email addresses,
session IDs or raw events. Its UI provides:
- 7/30/90 day page views, unique tracked sessions, total interaction events.
- Daily page-view and interaction totals.
- Most visited paths, devices, browsers, and event/action distributions.

This feature **does not** add MongoDB analytics collections, store analytics
events in MongoDB, copy Sheet rows, or write to Google Sheets. The endpoint
returns `status: unavailable` until the reader is configured; zeros are not
presented as real traffic in that state.

### Read-only Apps Script setup

1. Open the **existing** analytics spreadsheet's Apps Script project. No
   spreadsheet tab or cell needs modification.
2. Add the function in `scripts/analytics-admin-reader.gs` to the script.
   If it already defines `doGet(e)`, add a branch to that function only;
   do not replace `doPost(e)` or the existing analytics/email handlers:

   ```javascript
   if (e.parameter.action === 'admin_analytics') {
     return wordweftAdminAnalytics(e);
   }
   ```

3. Set two **Apps Script Properties** (not spreadsheet cells):
   `WORDWEFT_ANALYTICS_SHEET_ID` (the existing analytics spreadsheet ID) and
   `WORDWEFT_ADMIN_READ_TOKEN` (a long, random secret different from any
   write credential). Deploy the updated web app and keep its URL private.
4. Configure the backend environment with
   `WORDWEFT_ANALYTICS_READ_URL` (the read-capable script's HTTPS URL) and
   `WORDWEFT_ANALYTICS_READ_TOKEN` (the matching secret). If property
   placeholders aren't configured in the environment-specific Spring
   application file, add these lines:

   ```properties
   wordweft.analytics.sheet-read-url=${WORDWEFT_ANALYTICS_READ_URL:}
   wordweft.analytics.sheet-read-token=${WORDWEFT_ANALYTICS_READ_TOKEN:}
   ```

5. Sign in with `ROLE_ADMIN` and open `/admin` → **Analytics**.
   The backend does a server-to-server GET, and only the summarized JSON
   reaches the browser.

The Apps Script reader identifies event, page-view and session tabs by header
names and reads a bounded newest slice of each tab. Verify real tab headers
and period totals before treating metrics as authoritative; the exact source
spreadsheet is not present in the connected Drive account used for this PR.
The source may contain unrecorded/failed event flushes. **No traffic figures
are fabricated**, and the admin UI explains when the read endpoint is not
configured or cannot be reached.

Do not put the script URL/token in Vite environment variables, frontend
code, Git or third-party logs. Configure backend-only secrets. This is a
server-side shared-secret approach; use a restricted Google API read-only
identity if stronger controls are required by your security policy.

## Verification before rollout

- `cd backend && mvn test`
- `npm run typecheck && npm run build`
- `npm run test:e2e` against a disposable local test backend only
- Inspect any user/book moderation activity on **test accounts only**, and
  verify suspended JWT, public takedown, email formatting and restoration.
- Verify that historical traffic is read from the **existing** Sheet and
  is not written to MongoDB, and check a 403 is returned to non-admins.

No production or staging data was modified in the PR development workflow.
