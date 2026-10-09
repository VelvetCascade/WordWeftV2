# WordWeft production admin console

Open the private administration workspace at `/admin`. Only authenticated accounts
holding `ROLE_ADMIN` can access its backend routes. The frontend navigation
hides the link from other accounts; Spring Security independently protects
`/api/admin/**` and the administrative controllers.

## Available sections

- **Overview:** operational counts from existing MongoDB documents: users,
  verified users, signups over the last seven days, published authors, story
  totals, published chapters, recorded reads, pending reports and Founding
  Writer application counts. Includes a seven-day signup/story creation chart.
- **Members:** paginated and searchable account directory, role, verification,
  join date, publishing activity and suspension state; **Suspend** or **Reinstate**
  non-admin users. Passwords, reset tokens, OTPs and private account fields
  are not returned.
- **Stories:** searchable directory showing title, author, status, chapter
  counts, views and reads. Administrators can **Remove** a story from public
  view or **Restore** it. Full chapter manuscript text is not loaded.
- **Reports:** inspect reports, resolve or dismiss them with a reason, or take
  matching user/book moderation actions. Community post and comment reports
  continue through the existing Community moderation workflow.
- **Activity log:** admin moderation actions and reasons recorded in the
  **existing MongoDB moderation audit collection**.
- **Founding Writers:** link to the existing application review system.
- **Operations:** information and links for security and deployment.

## Administrative API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/admin/console/overview` | Live MongoDB platform metrics |
| `GET /api/admin/console/users?page=0&size=20&q=&role=ALL` | Member directory |
| `GET /api/admin/console/stories?page=0&size=20&q=&status=ALL` | Story directory |
| `GET /api/admin/console/reports?page=0&size=20&status=PENDING` | Report queue |
| `PATCH /api/admin/console/reports/{id}` | Resolve/dismiss a report |
| `POST /api/admin/console/users/{id}/moderation` | Suspend/reinstate an account |
| `POST /api/admin/console/stories/{id}/moderation` | Remove/restore a story |
| `GET /api/admin/console/audit?page=0` | Existing MongoDB audit history |

A moderation decision has the JSON shape
`{"action":"SUSPEND","reason":"Specific reason at least 10 characters","note":"Internal staff note","reportId":null}`.
Possible actions are `SUSPEND`, `REINSTATE`, `REMOVE`, and `RESTORE`,
depending on target type. `reason` is required (10–1000 characters);
`note` is optional (up to 2000 characters), stored only as part of the
existing moderation audit history. A matching report ID is optional.

API responses are `Cache-Control: no-store`; directory page size is capped
at 50. Search text is escaped and bounded.

## Moderation rules

- Suspension disables account authentication, including password, Google
  sign-in and existing JWT sessions once user details are reloaded. Neither
  the acting administrator nor another administrator can be suspended here.
- Story takedown is **reversible**. It hides the story from discovery and
  normal reader routes, blocks republishing, and retains manuscript content,
  ownership and original publication state. Restoring a draft does not publish
  it automatically.
- Staff actions update the existing `users`, `books`, and relevant `reports`
  documents, with audit events in the **existing**
  `community_moderation_events` collection. No extra collections are added.
- Action responses indicate whether the audit write succeeded; a failed audit
  write must be investigated by an administrator.
- Community post and comment takedowns continue through the existing
  Community moderation desk.
- No hard delete, role escalation, mass messaging or automated unpublishing
  of an entire author's catalog is enabled.

**No moderation emails are sent by this admin console.** The reason and the
optional staff note are for internal review; they are not delivered to the
member or author. This deliberately avoids adding any Apps Script or other
external-service dependency to the new admin features.

## Operational metric definitions

- **Members:** existing user documents (including unverified accounts).
- **Authors:** unique authors with at least one published, non-removed story.
- **Published stories/chapters:** excludes administratively removed stories.
- **Story reads:** aggregate of existing stored book read counters; not
  unique readers or spreadsheet page views.
- **Seven-day activity:** counts by the existing `joinDate` and `createdAt`
  fields; legacy rows without dates are not included in these time windows.

These are MongoDB operational counts, **not** website page views, traffic
sessions, conversion attribution, or email analytics.

## No Apps Script integration in this feature

The admin console contains **no** Google Sheets reader, Apps Script
aggregation handler, analytics polling endpoint, spreadsheet credentials,
or analytics migration/replication. Its metrics and moderation workflows use
the existing MongoDB models and collections.

The unrelated **pre-existing WordWeft features** for email delivery, Founding
Writer submission logging, and website tracking are intentionally unchanged;
their existing configuration and behavior are outside this PR.

## Verification before merging

1. Run `cd backend && mvn test`.
2. Run `npm run typecheck && npm run build`.
3. Run `npm run test:e2e` with the disposable local fixture database.
4. On a test environment, verify non-admin access is denied, member
   suspension/reinstatement, story takedown/restoration, reports, and audit
   history. Do not exercise moderation tests against real user accounts.

Keep PR #160 as a draft until the security tests and build checks pass.
No staging or production records were intentionally changed during the
implementation or this cleanup.
