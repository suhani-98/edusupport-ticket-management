# Validation and important edge cases

Against `docs/WORKFLOW.md`. Rows below record what was actually run. Browser click-through had not yet been performed during the earlier rows. A later manual browser smoke test is recorded in the final row. Playwright and Vitest are not configured.

| Case | Expected | Result |
|---|---|---|
| Resolve with an empty resolution | 400, "Resolution details are required", ticket unchanged | Planned |
| Resolve from OPEN, ASSIGNED, or PENDING | Rejected, status unchanged | Planned |
| SLA deadline passes while status is IN_PROGRESS | Status stays unchanged. `PATCH /sla/refresh` sets `BREACHED` and records one `SLA_BREACHED` activity. It does not assign a manager. | Passed in SLA tests (24 Sep 2026). No background job. |
| SLA deadline passes on RESOLVED or CLOSED | Status and escalated flag stay | Planned |
| PENDING | Status can move as defined; slaDeadline does not move | Planned |
| Reassign | Assignee changes; status, createdAt, slaDeadline, and escalation level stay | Passed in workflow tests (24 Sep 2026) |
| Two writes with the same version | First succeeds; second returns 409 | Planned |
| Duplicate open ticket in the same category | Existing numbers returned; confirm still creates | Planned |
| Student GET of another student's ticket | 404 `TICKET_NOT_FOUND`, same as a missing ticket | Passed in ticket API tests (24 Sep 2026) |
| Student dashboard | Own tickets only; staff and manager dashboards return 403 | Passed in dashboard tests (24 Sep 2026) |
| Staff dashboard | Assigned tickets only; other role dashboards return 403 | Passed in dashboard tests (24 Sep 2026) |
| Manager dashboard | All tickets, category counts, and active staff workload | Passed in dashboard tests (24 Sep 2026) |
| Frontend sign-in shell | Login, student registration, protected routes, and role workspaces | Client build and lint passed (24 Sep 2026). |
| Student ticket UI | Dashboard, list filters, create, detail, public comments, activity, close, and reopen | Client build and lint passed (24 Sep 2026). A local API check created EDU-1007, filtered it, added a public comment, closed it after staff resolved it, and rejected an empty reopen. Browser click-through had not yet been performed at this stage. Staff and manager screens were not built in that step. |
| Staff ticket UI | Assigned dashboard, list, status, priority, public and internal comments, resolve, SLA refresh, escalation | Client build and lint passed (24 Sep 2026). Existing server tests still cover staff permissions. Browser click-through had not yet been performed at this stage. The manager UI was not built in that step. |
| Manager ticket UI | Organization dashboard, all-ticket filters, assignment, lifecycle, comments, SLA, escalation | Client build and lint passed (25 Sep 2026). Server tests include the manager staff directory. Browser click-through had not yet been performed at this stage. Charts, notifications, and automatic SLA jobs are not built. |
| Product polish | Consistent shell, badges, dialogs, metric cards, and session-expired wording | Client lint, client build, and server lint passed (25 Sep 2026). Server tests stayed at 39 passed. Browser click-through had not yet been performed at this stage. |
| Final audit | Server tests, server build, server lint, seed, client build, and client lint | 25 Sep 2026: 39 tests passed, 0 failed. Server build, server lint, client build, and client lint passed. Seed completed. Browser click-through had not yet been performed at this stage. |
| Manual browser smoke test | Student, staff, and manager flows in the running application | Subsequently completed on 25 Sep 2026. Backend and frontend started. Passed: student, manager, and staff flows; ticket creation; assignment; public comments; internal-note visibility; status lifecycle; SLA refresh; escalation; resolution; close and reopen; role isolation. Unauthorized ticket access returned 404. No persistent browser console errors. A closed resolution dialog with a required field triggered native browser validation; that was fixed by skipping native validation while the dialog is closed. The corrected dialog was not rerun after the fix. This was a manual smoke test. Playwright and Vitest are not configured. |
| Staff reassign | 403 | Passed in workflow tests (24 Sep 2026) |
| Internal note on a student fetch | Omitted from comments and from activity history | Passed in lifecycle tests (24 Sep 2026) |
| Jump from OPEN to RESOLVED | Rejected | Passed in workflow tests (24 Sep 2026) |
| Student close from RESOLVED | Status CLOSED, closedAt set | Passed in lifecycle tests (24 Sep 2026) |
| Student reopen of a CLOSED ticket | Status IN_PROGRESS; resolution and timestamps cleared; prior resolution kept on the REOPENED activity; SLA deadline unchanged | Passed in lifecycle tests (24 Sep 2026). No 7-day limit in this step. |
