# API architecture and design

Step 4, frozen. Base path `/api/v1`. Edumerge did not prescribe this structure. Versioning is our choice so later changes do not break the first client.

Example: `POST /api/v1/auth/login`.

Every private route passes through authentication, then role authorization, then resource authorization, then the controller, the service, and the database. Hiding a button in React is not the control.

## Response envelope

Success:

```json
{ "success": true, "message": "optional", "data": {} }
```

Error:

```json
{ "success": false, "error": { "code": "TICKET_NOT_FOUND", "message": "Ticket not found." } }
```

| HTTP | When |
|---|---|
| 400 | Body fails schema validation |
| 401 | Missing or invalid token |
| 403 | Role or resource ownership refused |
| 404 | Id does not exist |
| 409 | Stale `version`, or duplicate-ticket warning |
| 422 | Valid body, illegal business operation |
| 500 | Unexpected server failure |

Mutations that change a ticket include `version` from the last read. A mismatch is `409` `VERSION_CONFLICT`. That field is part of this blueprint because concurrent updates were already a product rule.

## Security

Password hashing, JWT, role checks, input validation, rate limiting on `/auth/login` and `/auth/register`, secure HTTP headers, secrets only in environment variables, nothing secret committed, CORS limited to the frontend origin.

## Auth

| Method | Path | Who | Body | Success | Errors |
|---|---|---|---|---|---|
| POST | `/auth/register` | Public | `name`, `email`, `password` | `201`, `success`, message "Account created successfully" | 400 invalid body; 409 email already used |
| POST | `/auth/login` | Public | `email`, `password` | `token` and `user` (`id`, `name`, `role`) | 401 bad credentials; 403 if `isActive` is false |

Register creates a **student** only. Staff and manager accounts come from seed data. A public register that can set `role` is rejected.

Login user example:

```json
{
  "success": true,
  "token": "...",
  "user": { "id": "...", "name": "Suhani Gupta", "role": "student" }
}
```

`GET /auth/me` is included so the client can restore a session from the token. It was not in the first map. It returns the same user object. `401` if the token is missing.

## Tickets

### POST `/tickets`

Student only. Body: `categoryId`, `subject`, `description`. Optional `confirmDuplicate`.

The server sets ticket number, priority (category `defaultPriority`), SLA policy, deadline, `slaStatus` `WITHIN_SLA`, status `OPEN`, `studentId` from the token, `assignedTo` null, `escalationLevel` 0, and the created activity. A client field `status` or `slaDeadline` is ignored and does not affect the write. If those fields are sent, the validator rejects the request with `400` so the control is obvious.

Duplicate rule from the workflow: same student, same category, status not `RESOLVED` or `CLOSED`. Response `409` `DUPLICATE_WARNING` and the existing ticket numbers. Repeat with `confirmDuplicate: true` to create.

### GET `/tickets`

Query: `page` (default 1), `limit` (default 20), `status`, `priority`, `category`, `assignedTo`, `slaStatus`, `search`.

The same route serves every dashboard. The service narrows the query after it knows the caller.

| Role | Scope |
|---|---|
| Student | `studentId` is the caller. `assignedTo` in the query is ignored. |
| Staff | Tickets assigned to the caller, plus `OPEN` tickets they are allowed to accept. |
| Manager | All tickets. `assignedTo` is honored. |

`data` is `{ items, page, limit, total }`.

### GET `/tickets/:ticketId`

Ticket, student, assigned staff, category, SLA deadline and status, comments, and activity. Students do not receive `INTERNAL` comments. Student and not the owner: `403`. Unknown id: `404`.

## Assignment

`PATCH /tickets/:ticketId/assignment`

Body: `assignedTo`, `version`.

Manager, or staff accepting an `OPEN` ticket onto themselves. The service checks the target user exists, `isActive` is true, and the role is `staff` or `manager`. Then it updates `assignedTo`, writes activity `ASSIGNED` or a reassignment (`oldValue` previous name, `newValue` new name), and returns the ticket.

Staff sending someone else's id: `403`. Inactive target: `422` `STAFF_INACTIVE`.

Reassignment does not change `slaDeadline` or `escalationLevel`.

## Status

`PATCH /tickets/:ticketId/status`

Body: `status`, `version`, plus `message` when the target is `PENDING`.

Allowed:

| From | To |
|---|---|
| OPEN | ASSIGNED |
| ASSIGNED | IN_PROGRESS |
| IN_PROGRESS | PENDING |
| PENDING | IN_PROGRESS |
| IN_PROGRESS | RESOLVED |
| RESOLVED | CLOSED |

`CLOSED → IN_PROGRESS` on this route is `422` `INVALID_TRANSITION`. Resolve and close still go through their own actions below, so this patch cannot set `RESOLVED` without a resolution note. If `status` is `RESOLVED` or `CLOSED`, respond `422` and point the client at `/resolve` or `/close`.

`OPEN → ASSIGNED` still requires an assignee, so clients use `/assignment` for that pair. This route accepts it only when `assignedTo` is already set.

`IN_PROGRESS → PENDING` requires `message`, stored as a `PUBLIC` comment.

## Priority

`PATCH /tickets/:ticketId/priority`

Body: `priority`, `version`. Assignee or manager. Ticket not `RESOLVED` or `CLOSED`. Deadline is recalculated from `createdAt` plus the new policy's `resolutionTimeHours`. Activity `PRIORITY_CHANGED` with old and new values. If the new deadline is already past, `slaStatus` becomes `BREACHED` and escalation level becomes 1 in the same transaction.

Other staff: `403`.

## Comments

`POST /tickets/:ticketId/comments`

Body: `message`, `type` (`PUBLIC` or `INTERNAL`), `version`.

Students may post `PUBLIC` only, on their own ticket, and not when `CLOSED`. `INTERNAL` from a student is `403`. If the ticket is `PENDING`, a student `PUBLIC` comment also moves status to `IN_PROGRESS`.

Staff and managers may post either type on a ticket they can read.

`GET /tickets/:ticketId/comments?page&limit` uses the same visibility rules. Default limit 20.

## Resolve, close, reopen, escalate

### POST `/tickets/:ticketId/resolve`

Body: `resolution`, `version`. Assignee or manager. Current status must be `IN_PROGRESS`. Empty resolution: `400`, message "Resolution details are required." Then status `RESOLVED`, `resolvedAt` set, open escalations marked resolved, activity `RESOLVED`.

### POST `/tickets/:ticketId/close`

Body: `version`. Owning student, or manager. Status must be `RESOLVED`. Sets `CLOSED`, `closedAt`, activity `CLOSED`. Staff: `403`.

### POST `/tickets/:ticketId/reopen`

Body: `reason`, `version`. Owning student. Status must be `CLOSED`, reason non-empty, `closedAt` within 7 days.

Intended path:

```text
CLOSED → REOPENED → IN_PROGRESS
```

`REOPENED` is an activity action. Whether it is also stored as a ticket status is left for implementation. The frozen end state is `IN_PROGRESS`. The deadline is not extended. `PATCH /status` cannot perform this jump.

### POST `/tickets/:ticketId/escalate`

Body: `reason`, `version`.

Staff: escalation row `status: REQUESTED`. Does not change `escalationLevel`.

Manager: escalation row `status: OPEN`, `escalationLevel` at least 1, activity `ESCALATED`. Ticket status unchanged.

Empty reason: `400`. The SLA job is not an HTTP route. It creates the escalation, sets level 1, sets `slaStatus` to `BREACHED`, assigns the active manager, and writes `SLA_BREACHED` and `ESCALATED`. "Notify manager" is that escalation row plus the activity. There is no email sender.

## Activity

`GET /tickets/:ticketId/activities?page&limit`

Chronological. Each item: `action`, `oldValue`, `newValue`, `actor` display name, `createdAt`. Same read permission as the ticket. Students do not receive rows whose metadata marks an internal note.

## Dashboards

| Method | Path | Who | Data |
|---|---|---|---|
| GET | `/dashboard/student` | Student | total, open, in progress, pending, resolved, closed, for their tickets only |
| GET | `/dashboard/staff` | Staff | assigned, pending, SLA approaching, SLA breached, resolved today |
| GET | `/dashboard/manager` | Manager | total, open, in progress, pending, resolved, SLA breached, escalated, average resolution time, staff workload |

Wrong role: `403`.

## Categories and SLA policies

| Method | Path | Who |
|---|---|---|
| GET | `/categories` | Any signed-in user. Active rows only for students. Managers receive inactive rows too. |
| POST | `/categories` | Manager. `name`, `description`, `defaultPriority`. |
| PATCH | `/categories/:id` | Manager. Name, description, `isActive`, `defaultPriority`. |
| GET | `/sla-policies` | Manager. |
| PATCH | `/sla-policies/:id` | Manager. `responseTimeHours`, `resolutionTimeHours`, `isActive`. Does not rewrite deadlines already stored on tickets. |

Students need `GET /categories` when creating a ticket. They do not manage policies.

## Catalogue

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/auth/me

POST   /api/v1/tickets
GET    /api/v1/tickets
GET    /api/v1/tickets/:ticketId

PATCH  /api/v1/tickets/:ticketId/assignment
PATCH  /api/v1/tickets/:ticketId/status
PATCH  /api/v1/tickets/:ticketId/priority

GET    /api/v1/tickets/:ticketId/comments
POST   /api/v1/tickets/:ticketId/comments

POST   /api/v1/tickets/:ticketId/resolve
POST   /api/v1/tickets/:ticketId/close
POST   /api/v1/tickets/:ticketId/reopen
POST   /api/v1/tickets/:ticketId/escalate

GET    /api/v1/tickets/:ticketId/activities

GET    /api/v1/dashboard/student
GET    /api/v1/dashboard/staff
GET    /api/v1/dashboard/manager

GET    /api/v1/categories
POST   /api/v1/categories
PATCH  /api/v1/categories/:id

GET    /api/v1/sla-policies
PATCH  /api/v1/sla-policies/:id
```

## Trade-offs

Separate action routes (`resolve`, `close`, `reopen`, `escalate`) instead of one generic `PATCH /tickets/:id`. A single patch would let a client send `status` and `slaDeadline` together. The extra routes make each business rule a visible contract.

One list endpoint for every role, with the scope applied on the server, instead of `/tickets/mine` and `/tickets/all`. The query string stays stable and the authorization cannot be bypassed by choosing a different path.
