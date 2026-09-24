# EduSupport — Product requirements

Submission sections: problem understanding, product vision, target users, functional requirements, product assumptions.

Step 1 is locked to the decisions below. Exact journeys, transitions, and the permission matrix are in `docs/WORKFLOW.md`.

## 1. Product name

EduSupport — Student Support & Ticket Management Platform.

## 2. Problem understanding

Colleges receive student requests related to fees, attendance, ID cards, certificates, documents, and other administrative matters. Without a centralized system, requests are difficult to assign, prioritize, track, and resolve.

EduSupport is a centralized platform where students raise requests and staff manage them through a structured lifecycle with priority, SLA, ownership, ageing, escalation, and resolution tracking.

This is Assignment 4.

## 3. Product vision

One college help desk that behaves like a real support product: a controlled status workflow, a visible SLA, ageing for managers, an immutable activity history, and role-based access. The prototype demonstrates product and engineering judgment. It does not try to cover every campus system.

## 4. Target users

### Student

- Create a support ticket
- Select a category
- Describe the issue
- Track ticket status
- View staff responses
- Add additional information
- View the resolution
- Reopen a ticket when the workflow allows it

### Support staff

- View assigned tickets
- Accept or assign tickets in their category
- Change status only along the allowed transitions
- Set or update priority
- Respond to students
- Add internal notes
- Resolve tickets
- Track SLA and ageing

### Manager / Admin

- View all tickets
- Assign and reassign staff
- Monitor SLA breaches
- View ageing tickets
- Monitor staff workload
- Escalate tickets
- View reports and analytics

A category lead is a staff user marked as the lead for one category. There is no fourth login role.

## 5. Ticket lifecycle

Status changes follow a state machine. Arbitrary jumps are rejected.

```text
OPEN → ASSIGNED → IN_PROGRESS → PENDING → IN_PROGRESS → RESOLVED → CLOSED
```

SLA breach does not change that status. The ticket keeps its operational status and gains `slaStatus = BREACHED` and `escalated = true`. A ticket can stay `IN_PROGRESS` after the deadline is missed. Journeys, transitions, permissions, and that split are in `docs/WORKFLOW.md`.

## 6. Categories

Initial categories, stored as data and configurable from the backend:

- Fees & Payments
- Attendance
- ID Card
- Certificates & Documents
- Examination
- Hostel
- Technical Support
- Other

Screens and APIs read categories from the database. They do not hard-code this list.

## 7. Priority

| Priority | Meaning |
|---|---|
| Low | General information |
| Medium | Normal administrative request |
| High | Important issue requiring faster action |
| Critical | Issue requiring immediate attention |

Priority sets the SLA duration.

## 8. SLA

These durations are our product assumptions. Edumerge did not prescribe them.

| Priority | SLA |
|---|---|
| Critical | 4 hours |
| High | 8 hours |
| Medium | 24 hours |
| Low | 48 hours |

```text
SLA deadline = created at + SLA duration
```

The ticket shows:

- Within SLA
- Approaching SLA
- SLA breached

Approaching means 25% or less of the original duration remains, and the deadline is still in the future. That threshold is also our assumption.

The clock is wall-clock time from creation. Pending time counts toward the SLA. The deadline does not move while the ticket is `PENDING`. That policy is recorded in `docs/WORKFLOW.md`.

## 9. Ageing

Age is how long the ticket has stayed unresolved: now minus created at, until it is resolved. Managers can filter unresolved tickets by:

- Under 24 hours
- 24–48 hours
- 48 hours and over
- SLA breached

## 10. Activity history

Every important action appends a record. Records are not edited or deleted. Example:

```text
10:30 — Ticket created
10:35 — Assigned to Rahul
11:10 — Priority changed: Medium → High
12:20 — Staff added a response
13:00 — Status changed: In Progress → Pending
14:30 — Student added information
15:00 — Status changed: Pending → In Progress
16:00 — Ticket resolved
```

## 11. Functional requirements

### Must have

- Authentication
- Role-based authorization
- Ticket creation
- Assignment
- Status workflow as a state machine
- Priority
- SLA tracking and the three indicators
- Ageing and the manager filters
- Escalation when the SLA is breached, and manual escalation by a manager
- Activity timeline
- Resolution tracking
- Search and filter
- Dashboards for staff (own queue) and manager (college desk)
- Server-side validation
- Error handling with loading, empty, and error states

### Differentiators

- Duplicate-ticket detection on create
- Workload-aware assignment suggestion
- SLA breach alerts in the product
- Manager escalation
- Immutable audit trail
- Concurrent-update protection
- Playwright end-to-end tests

## 12. Product assumptions

- One college, one campus, Asia/Kolkata for display. SLA math uses elapsed hours, not office hours.
- SLA durations and the 25% approaching threshold are our choices, labeled as assumptions wherever we submit them.
- Categories ship as seed data and stay editable in the database.
- Students see only their tickets. Staff see their category. Managers see every ticket.
- Internal notes are visible to staff and managers, never to students.
- No mobile app, real email or SMS, payment integration, chatbot, microservices, heavy analytics, or extra third-party integrations in this prototype.
- In-app alerts cover assignment, public replies, resolution, and SLA breach. Outbound email can be named later as a future improvement.
- Build stack, when implementation starts: React, Node.js, Express, MongoDB, REST, Tailwind CSS, Playwright, Docker.

## 13. Future improvements

Mention only. Not built now: email and SMS delivery, attachments, a knowledge base, CSAT, and more than one campus.
