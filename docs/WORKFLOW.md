# User journeys, ticket workflow, and permissions

Step 2, locked to the product decisions below. These are our choices. The brief asks for statuses, priorities, assignment, SLAs, ageing, ownership, resolution tracking, activity history, management visibility, escalation, and a pending-action workflow, and it leaves users and permissions to the candidate.

## 1. Roles

| Role | Main responsibility |
|---|---|
| Student | Raise and track their own requests |
| Support staff | Process and resolve assigned requests |
| Manager / Admin | Manage workload, escalations, SLAs, and overall visibility |

## 2. Student journey

Attendance example:

```text
Login → Student dashboard → Create ticket → Category "Attendance"
→ Subject + description → Submit → Ticket id generated → OPEN
→ Student tracks progress → Staff responds → Student can add information
→ RESOLVED → Student reviews the resolution → CLOSE → Dashboard
```

The dashboard shows total, open, in-progress, and resolved counts, recent tickets, and the SLA indicator on each row. A student can open only their own tickets.

## 3. Staff journey

```text
Login → Staff dashboard → Assigned and open tickets → Open ticket
→ History → Accept → IN_PROGRESS → Public reply or internal note
→ Resolution note → RESOLVED
```

Pending-action path:

```text
IN_PROGRESS → PENDING → student provides information → IN_PROGRESS
```

Staff see their own queue counts, not the college-wide analytics.

## 4. Manager journey

```text
Login → Manager dashboard → All tickets
→ Open tickets, SLA status, ageing, staff workload, escalations
→ Assign, reassign, escalate, change priority, or review a resolution
```

Dashboard metrics: total, open, in progress, pending, resolved, SLA breached, escalated, average resolution time.

## 5. State machine

Operational status and SLA state are separate.

```text
OPEN → ASSIGNED → IN_PROGRESS ──┬── PENDING → IN_PROGRESS
                                └── RESOLVED → CLOSED
```

A student may reopen a CLOSED ticket: CLOSED → IN_PROGRESS, with a reason, within 7 days of close. Seven days is our assumption. Staff cannot close. The student closes from RESOLVED only. A manager may also close from RESOLVED.

| From | To | Who | Condition |
|---|---|---|---|
| OPEN | ASSIGNED | Staff in that category, or manager | Assignee is set. Staff may assign only to themselves. |
| ASSIGNED | IN_PROGRESS | Assignee or manager | — |
| IN_PROGRESS | PENDING | Assignee or manager | Public question included |
| PENDING | IN_PROGRESS | Student who owns the ticket | They posted information |
| PENDING | IN_PROGRESS | Assignee or manager | Staff resume without a reply |
| IN_PROGRESS | RESOLVED | Assignee or manager | Resolution note present |
| RESOLVED | CLOSED | Owning student, or manager | — |
| CLOSED | IN_PROGRESS | Owning student | Reason present, and within 7 days of close |

Any other jump is rejected. The ticket is not modified. The error lists the allowed next statuses.

Resolve from OPEN, ASSIGNED, or PENDING is rejected. An empty resolution note is rejected with "Resolution details are required".

## 6. SLA state and escalation

```text
Ticket status: IN_PROGRESS
SLA status:    BREACHED
Escalated:     yes
```

SLA status is `WITHIN_SLA`, `APPROACHING_SLA`, or `BREACHED`. Approaching means 25% or less of the original duration is left and the deadline is still ahead. That threshold is our assumption. `escalationLevel` is 0 until the ticket is escalated.

Deadline = created at + duration for the priority (Critical 4h, High 8h, Medium 24h, Low 48h).

When the deadline passes on OPEN, ASSIGNED, IN_PROGRESS, or PENDING:

- `slaStatus` becomes `BREACHED`
- `escalationLevel` becomes 1
- operational status stays as it is
- `assignedTo` becomes the active manager; the previous assignee is stored on the escalation
- an escalation record is written with `triggeredBy` `system`, `level` 1, `status` `OPEN`
- an activity event `SLA_BREACHED` is written, then `ESCALATED`
- the manager dashboard counts the ticket under SLA breached and escalated

RESOLVED and CLOSED are not escalated by the clock. The indicator freezes at the value it had when the ticket was resolved.

**Pending policy.** Pending time counts toward the SLA. The deadline does not move. A pause would hide office delay inside a status that means "waiting on the student", and the published formula is created-at plus duration. The manager still sees age, which keeps growing.

**Manual escalation.** A manager sets `escalationLevel` to at least 1 with a reason, from any status that is not RESOLVED or CLOSED. Status does not change. The escalation row stores the previous and new assignee. Staff may request escalation with a reason. That row uses `triggeredBy` `staff` and `status` `REQUESTED`. It does not change `escalationLevel` until a manager confirms or the clock breaches.

**Priority change.** Staff may change priority only on a ticket assigned to them. A manager may change any active ticket. Deadline is recalculated from the original created-at plus the new resolution hours. If that instant is already past, `slaStatus` becomes `BREACHED` and `escalationLevel` becomes 1 in the same write. Status is unchanged.

Reassignment by a manager changes `assignedTo` only. It does not change created-at, the deadline, or `escalationLevel`. A breach is the case that also moves ownership to the manager.

## 7. Permission matrix

| Action | Student | Staff | Manager |
|---|---|---|---|
| Create ticket | Yes | No | No |
| View own tickets | Yes | — | — |
| View assigned / category queue | No | Yes | Yes |
| View all tickets | No | No | Yes |
| Add public response | Yes, on own ticket, unless CLOSED | Yes, on tickets they can open | Yes |
| Add internal note | No | Yes | Yes |
| Change status | Only the transitions in section 5 that name the student | Only the allowed transitions | Yes, same transitions, plus close |
| Change priority | No | Only if they are the assignee | Yes |
| Assign (accept) an OPEN ticket | No | Only to themselves, in their category | Yes |
| Reassign | No | No | Yes |
| Escalate | No | Request only | Yes, sets escalationLevel |
| Resolve | No | Assignee, from IN_PROGRESS, with a note | Yes, from IN_PROGRESS, with a note |
| Close | From RESOLVED only | No | From RESOLVED |
| Reopen | From CLOSED, within 7 days, with a reason | No | No |
| Analytics | No | Own queue counts only | College dashboard |
| Activity history | Own tickets, public events only | Tickets they can open, including internal notes | All |

A student request for someone else's ticket returns **403 Forbidden** from the API. Hiding the row in the UI is not the control.

Workload suggestion: when a manager assigns, staff in the category are listed with their count of tickets not RESOLVED or CLOSED. The lowest count is marked suggested. A person still confirms. Staff cannot use this to assign to someone else.

Duplicate warning: same student, same category, status not RESOLVED or CLOSED. The API returns the existing ticket numbers. The client warns: "You may already have an open ticket for this issue." Confirming still creates the ticket.

## 8. Activity timeline

Every meaningful action appends an event. Events are not edited or deleted. Example:

```text
Ticket EDU-1024
09:32  Ticket created by the student
09:33  Priority set to Medium
09:33  SLA deadline calculated
10:05  Assigned to support staff
10:07  Status → IN_PROGRESS
11:20  Staff added a response
12:10  Status → PENDING
14:15  Student provided additional information
14:16  Status → IN_PROGRESS
15:40  Status → RESOLVED
15:41  Resolution added
16:05  Student closed the ticket
```

A breach adds "SLA breached" and "Escalated" without a status line.

## 9. Edge cases

| Case | Result |
|---|---|
| Resolve with an empty resolution | Rejected. "Resolution details are required." Ticket unchanged. |
| Deadline reached while the ticket is still active | Status unchanged, `slaStatus = BREACHED`, `escalationLevel = 1`, assigned to the manager, activity and escalation row written. |
| Ticket is PENDING | Status path in section 5. SLA clock keeps running. |
| Student fetches another student's ticket | 403 from the server. |
| Second similar request | Warning, then create if they confirm. Nothing is deleted or blocked. |
| Illegal status jump | Rejected. Ticket unchanged. |
| Two saves of the same version | First write wins. Second receives 409 and must reload. |

## 10. In-app notices

No email or SMS, and no notifications collection. The client reads activities and escalations for those events.
