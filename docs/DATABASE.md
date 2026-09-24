# Database design

MongoDB database `edusupport`, accessed through Mongoose. Seven collections. Comments and activities are not embedded in the ticket.

```text
users ──< tickets >── categories
            │
            ├── slaPolicyId ── slaPolicies
            ├──< comments
            ├──< activities
            └──< escalations
```

Field names below are the ones the API and models will use.

## users

```js
{
  name, email, passwordHash,
  role: "student" | "staff" | "manager",
  department,          // staff/manager label, e.g. "Attendance Office"
  isActive,
  createdAt, updatedAt
}
```

Unique index on `email`. Role is enforced in the service layer. The UI check is not the control.

A student has no department requirement. Staff and managers do.

## tickets

```js
{
  ticketNumber,          // EDU-1001
  studentId,             // users._id
  assignedTo,            // users._id or null
  categoryId,
  subject, description,
  priority,              // LOW | MEDIUM | HIGH | CRITICAL
  status,                // OPEN | ASSIGNED | IN_PROGRESS | PENDING | RESOLVED | CLOSED
  slaPolicyId,
  slaDeadline,
  slaStatus,             // WITHIN_SLA | APPROACHING_SLA | BREACHED
  escalationLevel,       // 0 = none, 1 = escalated to a manager
  resolution,            // required when status becomes RESOLVED
  resolvedAt, closedAt,
  version,               // optimistic concurrency; not a product field, required for 409
  createdAt, updatedAt
}
```

Example: `EDU-1024`, student Aarav Sharma, category Attendance, priority HIGH, status IN_PROGRESS, 8-hour SLA, slaStatus WITHIN_SLA, assigned to a staff user.

`ticketNumber` exists because `_id` is not something a student or a desk should quote. Numbers come from an atomic counter inside the ticket service (`findOneAndUpdate` + `$inc` on one counter document). That counter is an implementation detail, not an eighth product collection.

`version` is included so two writers cannot silently overwrite each other. It is part of the integrity rules from the workflow.

## comments

```js
{
  ticketId, authorId,
  message,
  type: "PUBLIC" | "INTERNAL",
  createdAt, updatedAt
}
```

PUBLIC is returned to the student. INTERNAL is omitted from every student query. Example: an internal note "Waiting for department approval." and a public reply "Your request has been forwarded to the department."

## activities

Audit events, not conversation.

```js
{
  ticketId, actorId,     // actorId null for the SLA job
  action,                // TICKET_CREATED | ASSIGNED | STATUS_CHANGED | PRIORITY_CHANGED
                         // | COMMENT_ADDED | SLA_BREACHED | ESCALATED | RESOLVED | CLOSED | REOPENED
  oldValue, newValue,    // strings or null
  metadata,
  createdAt
}
```

Example: `action: "STATUS_CHANGED"`, `oldValue: "PENDING"`, `newValue: "IN_PROGRESS"`.

No update and no delete routes for this collection.

## slaPolicies

```js
{
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  responseTimeHours,
  resolutionTimeHours,
  isActive,
  createdAt, updatedAt
}
```

Initial assumption, both columns set to the same number because the product currently has one promise. The deadline on the ticket uses `resolutionTimeHours`.

| Priority | responseTimeHours | resolutionTimeHours |
|---|---|---|
| CRITICAL | 4 | 4 |
| HIGH | 8 | 8 |
| MEDIUM | 24 | 24 |
| LOW | 48 | 48 |

These numbers are ours, not Edumerge's. Changing a policy does not rewrite deadlines already stored on tickets. A priority change reads the current active policy and sets a new `slaDeadline` from the ticket's original `createdAt`.

Unique index on `priority`.

## categories

```js
{
  name, description, isActive,
  defaultPriority,       // LOW | MEDIUM | HIGH | CRITICAL
  createdAt, updatedAt
}
```

Seed: Fees & Payments, Attendance, ID Card, Certificates & Documents, Examination, Hostel, Technical Support, Other. A manager can add or deactivate a category later without a code change. Unique index on `name`.

## escalations

```js
{
  ticketId,
  triggeredAt, triggeredBy,   // user id, or null when the SLA job fired
  reason,
  previousAssignee, newAssignee,
  level,                      // 1 for the first escalation
  status,                     // REQUESTED | OPEN | RESOLVED
  resolvedAt,
  createdAt
}
```

A breach writes `level: 1`, `status: OPEN`, sets `tickets.escalationLevel` to 1, and sets `tickets.assignedTo` to the active manager. Ticket status stays IN_PROGRESS (or whatever active status it already had).

A staff request writes `status: REQUESTED` and does not change `escalationLevel` or `assignedTo`.

When the ticket is resolved or closed, open escalation rows get `status: RESOLVED` and `resolvedAt`.

## Indexes

Tickets, single field: `ticketNumber` (unique), `studentId`, `assignedTo`, `status`, `priority`, `categoryId`, `slaStatus`, `createdAt`.

Compound:

| Index | Query it serves |
|---|---|
| `{ assignedTo: 1, status: 1 }` | Staff: my open tickets |
| `{ studentId: 1, status: 1 }` | Student: my tickets by status |
| `{ slaStatus: 1, slaDeadline: 1 }` | Breach scan and manager breached list |
| `{ studentId: 1, categoryId: 1, status: 1 }` | Duplicate warning |

Also: `comments { ticketId: 1, createdAt: 1 }`, `activities { ticketId: 1, createdAt: 1 }`, `escalations { ticketId: 1, createdAt: 1 }`.

## Integrity rules

Enforced in services, not only in the UI.

| Rule | Result |
|---|---|
| Status set to RESOLVED with an empty resolution | Rejected |
| `assignedTo` is a user who is missing, not staff, or `isActive: false` | Rejected |
| Student reads or writes a ticket whose `studentId` is not them | 403 |
| Status jump that is not in `docs/WORKFLOW.md` | Rejected. `CLOSED → IN_PROGRESS` is not allowed on the generic status update. Reopen is a separate action with its own checks. |
| Staff reassign to someone else | 403. Only a manager reassigns. Staff may accept an OPEN ticket onto themselves. |

Ticket mutation, matching activity insert, and any escalation insert run in one MongoDB transaction. The write must send the `version` it read. A mismatch aborts with 409.

## Backend layout

```text
backend/
  controllers/
  services/
  models/
    User.js  Ticket.js  Comment.js  Activity.js
    SLAPolicy.js  Category.js  Escalation.js
  routes/
  middleware/
  validators/
  utils/
  config/
```

Routes call controllers, controllers call services, services call models. Transition rules, SLA math, and authorization live in services.

## Trade-off

Comments and activities are their own collections so a long history can be paginated, ticket documents stay small, and internal notes can be filtered without rewriting the ticket. Embedding would make one ticket read simpler and would make the audit log harder to query as it grows.
