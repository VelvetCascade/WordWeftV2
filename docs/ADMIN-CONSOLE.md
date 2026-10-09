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
  pending report with a written reason (10–1000 characters). The backend
  records the acting admin, timestamp and status atomically; a report already
  reviewed cannot silently be overwritten.
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
