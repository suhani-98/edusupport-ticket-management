# Approach, assumptions, architecture, and trade-offs

Superseded for product rules. Use `docs/PRD.md` and `docs/WORKFLOW.md`. This file will be rewritten in the architecture step as the approach note. Do not implement the business-hour SLA or the old status names from the body below.

EduSupport — student support and ticket management for a single college.

Assignment 4 of the Edumerge Pre-Drive Product Engineering Assignments. This note explains the decisions. It will be updated as the prototype is built so it matches the code that is submitted.

## Problem

Students ask for help with fees, attendance, ID cards, documents, certificates, and other admin work. Those requests arrive as visits, calls, and chat messages, so ownership is unclear, urgent items wait behind casual ones, and managers cannot see what is ageing.

The product turns each request into one ticket with an owner, a priority, a deadline, a status, and a history.

## Users

| Role | What they can do |
|---|---|
| Student | Create a ticket, read their own tickets, reply on the public thread, confirm a resolution, or reopen with a reason. |
| Staff | Work the queue, claim or receive a ticket, reply, add internal notes, mark pending on student, resolve, or escalate with a reason. |
| Manager | See ageing, breaches, workload, and stale pending items. Reassign any ticket. Receive escalations. |

One college, one campus. Staff belong to a category queue (fees, attendance, and so on). Each category has a lead.

## Workflow

A ticket is always in exactly one status.

| Status | Meaning |
|---|---|
| New | Created, no owner yet. First-response clock is running. |
| Assigned | An owner is set. First-response clock still runs until the first public staff reply. |
| In Progress | Staff have replied. Resolution clock is running. |
| Pending on Student | Staff asked the student for something. Both clocks are paused. |
| Escalated | Resolution deadline was missed, or someone escalated with a reason. Owner is the manager. Resolution clock keeps running. |
| Resolved | Staff recorded a resolution note. Waiting for the student to confirm, or for auto-close. |
| Closed | Student confirmed, or 5 days passed after resolution with no reply. |
| Reopened | Student rejected the resolution. Same owner. A new resolution clock starts. First response is already done. |

Allowed moves:

- New → Assigned when someone claims it or a manager assigns it.
- Assigned → In Progress on the first public staff reply.
- In Progress → Pending on Student only if the staff member also posts the question the student must answer.
- Pending on Student → In Progress when the student replies. The clock resumes with the time that was left.
- In Progress or Escalated → Resolved only with a resolution note.
- Resolved → Closed when the student confirms, or automatically after 5 days of silence.
- Resolved → Reopened when the student disagrees, with a reason. Then Reopened is worked like In Progress.
- In Progress → Escalated on a manual escalate (reason required) or when the resolution deadline is missed.
- New, still unassigned, past the first-response deadline → Assigned to the category lead and flagged response-overdue.

Pending on student never escalates because of the SLA. If that pause lasts more than 3 business days, the manager board shows it as stale. The ticket stays open. A student's request is not closed just because they went quiet before anyone resolved it.

## SLA

Office hours are Monday to Friday, 09:00–17:00, Asia/Kolkata. Eight hours is one business day. Time outside that window does not count.

| Priority | First response | Resolution |
|---|---|---|
| Urgent | 2 business hours | 8 business hours (1 business day) |
| High | 4 business hours | 2 business days |
| Medium | 1 business day | 3 business days |
| Low | 2 business days | 5 business days |

At risk means less than 20% of that budget is left and the clock is running.

Rules:

- The first-response clock starts at creation and stops at the first public staff reply.
- The resolution clock starts at creation and stops at Resolved. It does not wait for the first reply, so a ticket that nobody opens still ages toward resolution.
- Pending on student pauses both clocks. The pause length is added back when the student replies. The student does not receive extra time beyond the pause.
- Reassignment does not reset either clock.
- Changing priority recomputes both deadlines from time already consumed, excluding paused time. Raising priority can breach immediately. Lowering priority can clear a breach. Either change is an activity event.
- A reopen starts a fresh resolution budget from the reopen time. The first-response SLA stays met.

## Escalation and ownership

One owner at a time. The owner is empty only while the ticket is New.

- Staff may claim an unassigned ticket in their category.
- A manager may assign or reassign anyone, without resetting the SLA.
- Manual escalation requires a reason, sets status to Escalated, and sets the owner to the manager.
- If the resolution deadline passes while the clock is running, the same escalation happens automatically.
- If the first-response deadline passes and the ticket is still New, it is assigned to the category lead and flagged response-overdue.

## Activity history

Every meaningful change is stored: created, claimed, assigned, public reply, internal note, status change, priority change, SLA paused, SLA resumed, escalated, resolved, reopened, closed.

Students see the public thread and status changes. Internal notes stay with staff and managers.

## Management visibility

The manager home shows:

- Counts by status, priority, and category
- Ageing of open tickets: under 1 day, 1–3 days, 3–7 days, over 7 days (calendar age since creation, so a paused ticket is still visible)
- At risk, breached, unassigned, and stale pending
- Open tickets per staff member
- Reassign from that screen

Calendar ageing and business-hour SLA are both shown. Ageing answers "how long has this student been waiting in real life?" The SLA answers "are we inside the office-hour promise?"

## Assumptions

- One college, about the size in the brief's other prompts (thousands of students). The prototype seeds a small slice so the demo is readable.
- Students pick a category and describe the problem in text. Priority defaults from the category (fees and ID cards default High, certificates Medium, others Medium) and the student or staff can change it. Staff have the final say, and the change is logged.
- No email or SMS in this prototype. The product would notify on assign, pending, resolve, and escalate. The demo uses the in-app thread only.
- No file uploads. ID-card photos and fee receipts would be attachments later. The workflow does not depend on them.
- Silence for 5 days after a resolution means the student accepts it. Silence while the ticket is pending on the student does not close it.
- Demo passwords are printed on the login screen. This is a prototype, not a production identity system.
- "Other" is a real category with a lead, so odd requests still have an owner path.

## Architecture

One Next.js application (App Router, TypeScript, Tailwind). SQLite on disk. Server-side mutations. A small session cookie after demo login.

```text
Browser
  login, student pages, staff queue, manager board, ticket page
        |
Next.js server
  session, ticket rules, SLA clock, escalation
        |
SQLite
  users, categories, tickets, comments, events
```

Main records:

- **users** — name, email, role (student, staff, manager), category they work
- **categories** — name, default priority, lead
- **tickets** — student, category, subject, description, priority, status, owner, SLA timestamps, pause total, resolution note
- **comments** — author, body, public or internal
- **events** — activity history

SLA deadlines are stored on the ticket and recomputed by one module when status, priority, or pause changes. The UI reads those timestamps. It does not reimplement the rules.

## Trade-offs

- **SQLite in one app, rather than a separate API and Postgres.** A reviewer can run the prototype with `npm install` and `npm run dev`. The rules live in one module and can move to another database later.
- **Business-hour SLA, rather than a 24-hour clock.** A Friday 16:00 urgent ticket is not "breached" on Saturday morning. The math is more code, and it matches how a college office actually works.
- **Pause on pending, rather than letting the SLA run.** Staff are not punished for waiting on a student. Stale-pending is a separate flag so pauses cannot hide a ticket forever.
- **Auto-close only after resolution.** Closing unanswered requests would make the manager board look healthy while students were still stuck.
- **No notification service.** Building email would not show the workflow any better in a walkthrough, and it would add setup the reviewer does not have.
- **Seeded history, rather than an empty database.** Breach, ageing, and escalation need tickets that are already old. The seed creates those states.

## What is intentionally not in the prototype

Knowledge-base deflection before submit, CSAT, multi-campus routing, SSO, and attachments. Each is named in Assumptions so the cut is a choice, not a gap in the workflow.
