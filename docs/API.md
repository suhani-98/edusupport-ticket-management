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

Student only. The client sends only `categoryId`, `subject`, and `description`.

```json
{
  "categoryId": "665f1c2e9b1a4c0012345678",
  "subject": "Attendance not updated",
  "description": "My attendance for Monday is missing."
}
```

The server sets the student from the token, `ticketNumber`, priority from the category default, the active SLA policy, `slaDeadline` from `createdAt + resolutionTimeHours`, `slaStatus` (a new ticket is `WITHIN_SLA`), status `OPEN`, and `escalationLevel` 0. Sending `studentId`, `assignedTo`, `status`, `ticketNumber`, `priority`, `slaPolicyId`, `slaDeadline`, `slaStatus`, `escalationLevel`, `resolution`, `resolvedAt`, or `closedAt` returns `400`.

Missing category: `404` `CATEGORY_NOT_FOUND`. Inactive category: `422` `CATEGORY_INACTIVE`. A category with no valid default priority is rejected. Staff or manager: `403`.

```json
{
  "success": true,
  "data": {
    "ticket": {
      "id": "...",
      "ticketNumber": "EDU-1001",
      "subject": "Attendance not updated",
      "description": "My attendance for Monday is missing.",
      "category": { "id": "...", "name": "Attendance" },
      "priority": "HIGH",
      "status": "OPEN",
      "slaStatus": "WITHIN_SLA",
      "slaDeadline": "2026-09-25T06:00:00.000Z",
      "assignedTo": null,
      "student": { "id": "...", "name": "Dev Student", "email": "student@edusupport.local" },
      "resolution": null,
      "createdAt": "2026-09-24T22:00:00.000Z",
      "updatedAt": "2026-09-24T22:00:00.000Z"
    }
  }
}
```

### GET `/tickets`

Query: `page` (default 1), `limit` (default 20, max 100), `status`, `priority`, `categoryId`, `assignedTo`, `slaStatus`, `overdue` (`true` or `false`), `search`, `sortBy` (`createdAt`, `updatedAt`, `ticketNumber`), `sortOrder` (`asc` or `desc`).

`overdue=true` means `slaDeadline` is at or before now and the ticket is not `CLOSED`. `overdue=false` means the deadline is still in the future. Role scope is unchanged.

Example: `GET /api/v1/tickets?page=1&limit=20&status=OPEN&priority=HIGH&slaStatus=BREACHED&search=attendance&sortBy=createdAt&sortOrder=desc`

| Role | Scope |
|---|---|
| Student | Only `studentId` equal to the caller. `assignedTo` in the query is ignored. |
| Staff | Only tickets assigned to the caller. A different `assignedTo` query does not widen that. |
| Manager | All tickets. `assignedTo` is honored. |

`search` matches `subject` and `ticketNumber` with an escaped regular expression. List items omit the description. Response:

```json
{
  "success": true,
  "data": {
    "tickets": [],
    "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
  }
}
```

### GET `/tickets/:id`

Detail includes description, category, priority, status, SLA, assignee, student name and email, resolution, and timestamps. `passwordHash` is never included. A student or staff member who cannot see the ticket gets `404` `TICKET_NOT_FOUND`, the same response as a missing ticket. An invalid id is `400`. A manager can read any ticket. The body matches the create response above.

## Assignment

`PATCH /tickets/:id/assignment`

Manager only. Body: `{ "assignedTo": "staffUserId" }`.

The target must be an active user whose role is `staff`. A student target is `422` `INVALID_ASSIGNEE`. A manager target is the same code. Inactive staff is `422` `STAFF_INACTIVE`. Students and staff who call this route get `403`.

An `OPEN` ticket becomes `ASSIGNED` and records `TICKET_ASSIGNED`. Reassignment changes `assignedTo` only. `IN_PROGRESS`, `PENDING`, and any other current status stay as they are, and the activity is `TICKET_REASSIGNED`. `oldValue` and `newValue` are user ids. SLA deadline, SLA status, and escalation level do not change. `RESOLVED` and `CLOSED` tickets return `422` `TICKET_NOT_ASSIGNABLE`.

## Status

`PATCH /tickets/:id/status`

Body: `{ "status": "IN_PROGRESS" }`. Staff may change a ticket assigned to them. A manager may change any ticket. A student gets `403`. A staff member who cannot see the ticket gets `404` `TICKET_NOT_FOUND`.

Allowed:

| From | To |
|---|---|
| OPEN | ASSIGNED |
| ASSIGNED | IN_PROGRESS |
| IN_PROGRESS | PENDING |
| PENDING | IN_PROGRESS |
| IN_PROGRESS | RESOLVED |
| RESOLVED | CLOSED |

Any other pair is `422` `INVALID_TRANSITION`. `OPEN → ASSIGNED` also requires an assignee already set; otherwise `422` `ASSIGNMENT_REQUIRED`. Use `/assignment` for the normal first assignment.

`IN_PROGRESS → RESOLVED` without a stored resolution is `400`. If a resolution is already stored, the generic route still returns `422` `USE_RESOLVE`. `RESOLVED → CLOSED` on this route is `422` `USE_CLOSE`. Resolve, close, and reopen use their own actions. Each accepted generic change records `STATUS_CHANGED`. Pending does not pause the SLA and does not require a comment.

## Priority

`PATCH /tickets/:id/priority`

Body: `{ "priority": "HIGH" }`. A manager may change any open ticket. Staff may change priority only on a ticket assigned to them. Students get `403`. `RESOLVED` and `CLOSED` tickets return `422` `PRIORITY_LOCKED`.

The deadline is `createdAt + resolutionTimeHours` of the active policy for the new priority. `slaStatus` is recalculated from that deadline and the current time. Operational status and `escalationLevel` stay unchanged. A past deadline can mark `BREACHED` without assigning a manager. Sending `slaDeadline` or `slaStatus` is `400`. The activity is `PRIORITY_CHANGED`.

## Activities

`GET /tickets/:id/activities?page=1&limit=20`

Same visibility as ticket detail. Results are oldest first. Each item has `action`, `oldValue`, `newValue`, `actor` (`id`, `name`), and `createdAt`. A hidden ticket is `404` `TICKET_NOT_FOUND`.

Creating a ticket records `TICKET_CREATED`. A comment records `COMMENT_ADDED` with `newValue` `PUBLIC` or `INTERNAL` and does not copy the message. Students do not receive `COMMENT_ADDED` rows whose value is `INTERNAL`. Local MongoDB is a standalone server, so the ticket write and the activity write are sequential, not a multi-document transaction. If the activity insert fails, the service puts the ticket back to its previous values.

## Comments

`POST /tickets/:id/comments`

```json
{ "message": "Please upload your attendance record.", "type": "PUBLIC" }
```

`authorId` is taken from the token. Sending `authorId` is `400`. Message is required, trimmed, and at most 2000 characters. `type` is `PUBLIC` or `INTERNAL`.

A student may add `PUBLIC` comments on their own ticket. `INTERNAL` from a student is `403`. Assigned staff and managers may add either type. Anyone who cannot see the ticket gets `404`. A comment does not change status or the SLA.

`GET /tickets/:id/comments?page=1&limit=20`

Students receive `PUBLIC` comments only, including when the query asks for `INTERNAL`. Staff see both types on assigned tickets. Managers see both types on any ticket. Each comment returns `id`, `message`, `type`, `author` (`id`, `name`), `createdAt`, and `updatedAt`.

## Resolve, close, and reopen

### POST `/tickets/:id/resolve`

Staff on an assigned ticket, or a manager. Students get `403`. Body: `{ "resolution": "Attendance was corrected after verification." }`. Sending `status` or `resolvedAt` is `400`. The ticket must be `IN_PROGRESS`; other statuses are `422` `INVALID_TRANSITION`. Empty resolution is `400`.

The server sets `resolution`, `resolvedAt`, and status `RESOLVED`, then records `STATUS_CHANGED` and `RESOLVED`.

### POST `/tickets/:id/close`

The owning student or a manager. Staff get `403`. Only a `RESOLVED` ticket can be closed. The server sets `closedAt` and status `CLOSED`, then records `STATUS_CHANGED` and `CLOSED`.

### POST `/tickets/:id/reopen`

The owning student or a manager. Staff get `403`. Body: `{ "reason": "The issue is still not resolved." }`. Reason is required, trimmed, and at most 1000 characters. Only a `CLOSED` ticket can be reopened. There is no time limit in this step.

Status becomes `IN_PROGRESS`. `resolution`, `resolvedAt`, and `closedAt` are cleared so the next resolution must be written again. The previous resolution text is kept on the `REOPENED` activity as `oldValue`. The SLA deadline does not move. Earlier activities stay. `PATCH /status` cannot make this jump. Pending still does not pause the SLA. Reopening does not move `slaDeadline`.

## SLA refresh and summary

`PATCH /tickets/:id/sla/refresh` recalculates `slaStatus` from the stored deadline with the existing 25% approaching rule. A manager may refresh any ticket. Assigned staff may refresh their ticket. Students get `403`. A hidden ticket is `404`. The new status is saved only when it changes. Moving to `BREACHED` records one `SLA_BREACHED` activity. A second refresh does not record another. Operational status does not change. Clients cannot send `slaStatus` or `slaDeadline`.

`GET /tickets/sla-summary` is manager-wide or limited to the caller's assigned tickets. Students get `403`. It counts stored values and does not persist a new SLA status.

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalOpen": 0,
      "withinSla": 0,
      "approachingSla": 0,
      "breached": 0,
      "overdueOpen": 0
    }
  }
}
```

`totalOpen` excludes `CLOSED`. `overdueOpen` is non-closed tickets whose deadline has passed. There is no background SLA job and no notification sender.

## Escalation

`POST /tickets/:id/escalate` with `{ "reason": "Waiting on another office." }`. Assigned staff or a manager. Students get `403`. Empty reason is `400`. Sending `triggeredBy` or assignee fields is `400`.

The first open escalation is `LEVEL_1`. A second open one is `LEVEL_2`. A further open escalation is `409` `ESCALATION_ALREADY_OPEN`. The ticket assignee, status, and SLA deadline stay unchanged. `newAssignee` is null. An `ESCALATED` activity stores the level and reason in metadata, not a comment body.

`GET /tickets/:id/escalations` uses ticket visibility. The response includes level, status, reason, who triggered it (`id`, `name`), and timestamps. It does not include password hashes.

`POST /tickets/:id/escalations/:escalationId/resolve` is for assigned staff or a manager. It sets `RESOLVED` and `resolvedAt`, records `ESCALATION_RESOLVED`, and does not change ticket status or the SLA deadline. Resolving it again is `409` `ESCALATION_NOT_OPEN`.

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
