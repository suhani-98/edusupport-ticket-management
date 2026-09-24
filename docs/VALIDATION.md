# Validation and important edge cases

Against `docs/WORKFLOW.md`. Not executed yet.

| Case | Expected | Result |
|---|---|---|
| Resolve with an empty resolution | 400, "Resolution details are required", ticket unchanged | Planned |
| Resolve from OPEN, ASSIGNED, or PENDING | Rejected, status unchanged | Planned |
| SLA deadline passes while status is IN_PROGRESS | Status stays IN_PROGRESS, slaStatus BREACHED, escalationLevel 1, assigned to the manager | Planned |
| SLA deadline passes on RESOLVED or CLOSED | Status and escalated flag stay | Planned |
| PENDING | Status can move as defined; slaDeadline does not move | Planned |
| Reassign | Assignee changes; status, createdAt, slaDeadline, and escalation level stay | Passed in workflow tests (24 Sep 2026) |
| Two writes with the same version | First succeeds; second returns 409 | Planned |
| Duplicate open ticket in the same category | Existing numbers returned; confirm still creates | Planned |
| Student GET of another student's ticket | 404 `TICKET_NOT_FOUND`, same as a missing ticket | Passed in ticket API tests (24 Sep 2026) |
| Staff reassign | 403 | Passed in workflow tests (24 Sep 2026) |
| Internal note on a student fetch | Omitted from comments and from activity history | Passed in lifecycle tests (24 Sep 2026) |
| Jump from OPEN to RESOLVED | Rejected | Passed in workflow tests (24 Sep 2026) |
| Student close from RESOLVED | Status CLOSED, closedAt set | Passed in lifecycle tests (24 Sep 2026) |
| Student reopen of a CLOSED ticket | Status IN_PROGRESS; resolution and timestamps cleared; prior resolution kept on the REOPENED activity; SLA deadline unchanged | Passed in lifecycle tests (24 Sep 2026). No 7-day limit in this step. |
