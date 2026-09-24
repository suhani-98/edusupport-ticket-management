# Validation and important edge cases

Against `docs/WORKFLOW.md`. Not executed yet.

| Case | Expected | Result |
|---|---|---|
| Resolve with an empty resolution | 400, "Resolution details are required", ticket unchanged | Planned |
| Resolve from OPEN, ASSIGNED, or PENDING | Rejected, status unchanged | Planned |
| SLA deadline passes while status is IN_PROGRESS | Status stays IN_PROGRESS, slaStatus BREACHED, escalationLevel 1, assigned to the manager | Planned |
| SLA deadline passes on RESOLVED or CLOSED | Status and escalated flag stay | Planned |
| PENDING | Status can move as defined; slaDeadline does not move | Planned |
| Reassign | Assignee changes; createdAt, slaDeadline, and escalated stay | Planned |
| Two writes with the same version | First succeeds; second returns 409 | Planned |
| Duplicate open ticket in the same category | Existing numbers returned; confirm still creates | Planned |
| Student GET of another student's ticket | 404 `TICKET_NOT_FOUND`, same as a missing ticket | Passed in ticket API tests (24 Sep 2026) |
| Staff reassign | 403 | Planned |
| Internal note on a student fetch | Omitted | Planned |
| Jump from OPEN to RESOLVED | Rejected | Planned |
| Student close from RESOLVED | Status CLOSED | Planned |
| Student reopen after 7 days | Rejected | Planned |
