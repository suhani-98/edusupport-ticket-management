import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-not-used-in-production";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/edusupport_ticket_sla_test";
process.env.CLIENT_URL = "http://localhost:5173";

let baseUrl = "";
let server: Server;
let studentToken = "";
let staffToken = "";
let otherStaffToken = "";
let managerToken = "";
let staffId = "";
let categoryId = "";

async function request(path: string, token?: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json()) as {
    success: boolean;
    data?: {
      ticket?: Record<string, unknown>;
      summary?: Record<string, number>;
      escalation?: Record<string, unknown>;
      escalations?: Array<Record<string, unknown>>;
      tickets?: Array<Record<string, unknown>>;
      activities?: Array<Record<string, unknown>>;
    };
    error?: { code: string };
  };
  return { status: response.status, body };
}

before(async () => {
  const { connectDatabase } = await import("./config/database.js");
  const { Activity } = await import("./models/Activity.js");
  const { Category } = await import("./models/Category.js");
  const { Comment } = await import("./models/Comment.js");
  const { Counter } = await import("./models/Counter.js");
  const { Escalation } = await import("./models/Escalation.js");
  const { SLAPolicy } = await import("./models/SLAPolicy.js");
  const { Ticket } = await import("./models/Ticket.js");
  const { User } = await import("./models/User.js");
  const { hashPassword } = await import("./utils/password.js");
  const { signAccessToken } = await import("./utils/token.js");
  const { createApp } = await import("./app.js");

  await connectDatabase();
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    SLAPolicy.deleteMany({}),
    Ticket.deleteMany({}),
    Activity.deleteMany({}),
    Comment.deleteMany({}),
    Escalation.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  const passwordHash = await hashPassword("secure-password1");
  const student = await User.create({ name: "Student", email: "sla-student@example.com", passwordHash, role: "student" });
  const staff = await User.create({ name: "Staff", email: "sla-staff@example.com", passwordHash, role: "staff" });
  const otherStaff = await User.create({ name: "Other", email: "sla-staff2@example.com", passwordHash, role: "staff" });
  const manager = await User.create({ name: "Manager", email: "sla-manager@example.com", passwordHash, role: "manager" });
  staffId = staff.id;
  studentToken = signAccessToken({ userId: student.id, role: "student" });
  staffToken = signAccessToken({ userId: staff.id, role: "staff" });
  otherStaffToken = signAccessToken({ userId: otherStaff.id, role: "staff" });
  managerToken = signAccessToken({ userId: manager.id, role: "manager" });
  const category = await Category.create({ name: "Attendance", defaultPriority: "HIGH" });
  categoryId = category.id;
  await SLAPolicy.create({ priority: "HIGH", responseTimeHours: 8, resolutionTimeHours: 8 });

  const app = createApp();
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not bind to a port");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  const { disconnectDatabase } = await import("./config/database.js");
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await disconnectDatabase();
});

describe("SLA and escalation", () => {
  it("refreshes SLA without changing ticket status and scopes the summary", async () => {
    const created = await request("/api/v1/tickets", studentToken, {
      method: "POST",
      body: JSON.stringify({ categoryId, subject: "SLA check", description: "Deadline test." }),
    });
    const id = String(created.body.data?.ticket?.id);
    const deadline = String(created.body.data?.ticket?.slaDeadline);

    const studentRefresh = await request(`/api/v1/tickets/${id}/sla/refresh`, studentToken, { method: "PATCH" });
    assert.equal(studentRefresh.status, 403);

    const studentSummary = await request("/api/v1/tickets/sla-summary", studentToken);
    assert.equal(studentSummary.status, 403);

    const unassigned = await request(`/api/v1/tickets/${id}/sla/refresh`, staffToken, { method: "PATCH" });
    assert.equal(unassigned.status, 404);

    const managerRefresh = await request(`/api/v1/tickets/${id}/sla/refresh`, managerToken, { method: "PATCH" });
    assert.equal(managerRefresh.status, 200);
    assert.equal(managerRefresh.body.data?.ticket?.slaStatus, "WITHIN_SLA");
    assert.equal(managerRefresh.body.data?.ticket?.status, "OPEN");

    const { Ticket } = await import("./models/Ticket.js");
    await Ticket.updateOne({ _id: id }, { slaDeadline: new Date(Date.now() - 60_000) });
    await request(`/api/v1/tickets/${id}/assignment`, managerToken, {
      method: "PATCH",
      body: JSON.stringify({ assignedTo: staffId }),
    });

    const staffRefresh = await request(`/api/v1/tickets/${id}/sla/refresh`, staffToken, { method: "PATCH" });
    assert.equal(staffRefresh.status, 200);
    assert.equal(staffRefresh.body.data?.ticket?.slaStatus, "BREACHED");
    assert.equal(staffRefresh.body.data?.ticket?.status, "ASSIGNED");
    assert.notEqual(staffRefresh.body.data?.ticket?.slaDeadline, deadline);

    const again = await request(`/api/v1/tickets/${id}/sla/refresh`, managerToken, { method: "PATCH" });
    assert.equal(again.body.data?.ticket?.slaStatus, "BREACHED");
    const history = await request(`/api/v1/tickets/${id}/activities`, managerToken);
    const breaches = history.body.data?.activities?.filter((item) => item.action === "SLA_BREACHED") ?? [];
    assert.equal(breaches.length, 1);

    const overdue = await request("/api/v1/tickets?overdue=true", managerToken);
    assert.equal(overdue.body.data?.tickets?.some((ticket) => ticket.id === id), true);
    const notOverdue = await request("/api/v1/tickets?overdue=false", staffToken);
    assert.equal(notOverdue.body.data?.tickets?.some((ticket) => ticket.id === id), false);

    const staffSummary = await request("/api/v1/tickets/sla-summary", staffToken);
    assert.equal(staffSummary.body.data?.summary?.breached, 1);
    assert.equal(staffSummary.body.data?.summary?.overdueOpen, 1);
    const managerSummary = await request("/api/v1/tickets/sla-summary", managerToken);
    assert.equal(managerSummary.body.data?.summary?.totalOpen, 1);
    assert.ok((managerSummary.body.data?.summary?.breached ?? 0) >= 1);
  });

  it("escalates manually without changing status or the SLA deadline", async () => {
    const created = await request("/api/v1/tickets", studentToken, {
      method: "POST",
      body: JSON.stringify({ categoryId, subject: "Escalate me", description: "Needs a manager." }),
    });
    const id = String(created.body.data?.ticket?.id);
    const deadline = String(created.body.data?.ticket?.slaDeadline);
    await request(`/api/v1/tickets/${id}/assignment`, managerToken, {
      method: "PATCH",
      body: JSON.stringify({ assignedTo: staffId }),
    });

    const empty = await request(`/api/v1/tickets/${id}/escalate`, staffToken, {
      method: "POST",
      body: JSON.stringify({ reason: "  ", triggeredBy: staffId }),
    });
    assert.equal(empty.status, 400);

    const studentDenied = await request(`/api/v1/tickets/${id}/escalate`, studentToken, {
      method: "POST",
      body: JSON.stringify({ reason: "Please hurry" }),
    });
    assert.equal(studentDenied.status, 403);

    const outsider = await request(`/api/v1/tickets/${id}/escalate`, otherStaffToken, {
      method: "POST",
      body: JSON.stringify({ reason: "Not mine" }),
    });
    assert.equal(outsider.status, 404);

    const first = await request(`/api/v1/tickets/${id}/escalate`, staffToken, {
      method: "POST",
      body: JSON.stringify({ reason: "Waiting on another office." }),
    });
    assert.equal(first.status, 201);
    assert.equal(first.body.data?.escalation?.level, "LEVEL_1");
    assert.equal(first.body.data?.ticket?.status, "ASSIGNED");
    assert.equal(String(first.body.data?.ticket?.slaDeadline), deadline);
    const firstId = String(first.body.data?.escalation?.id);

    const second = await request(`/api/v1/tickets/${id}/escalate`, managerToken, {
      method: "POST",
      body: JSON.stringify({ reason: "Still blocked." }),
    });
    assert.equal(second.body.data?.escalation?.level, "LEVEL_2");

    const third = await request(`/api/v1/tickets/${id}/escalate`, managerToken, {
      method: "POST",
      body: JSON.stringify({ reason: "Again" }),
    });
    assert.equal(third.status, 409);
    assert.equal(third.body.error?.code, "ESCALATION_ALREADY_OPEN");

    const listed = await request(`/api/v1/tickets/${id}/escalations`, studentToken);
    assert.equal(listed.body.data?.escalations?.length, 2);
    assert.equal(JSON.stringify(listed.body).includes("passwordHash"), false);

    const hidden = await request(`/api/v1/tickets/${id}/escalations`, otherStaffToken);
    assert.equal(hidden.status, 404);

    const history = await request(`/api/v1/tickets/${id}/activities`, managerToken);
    const escalated = history.body.data?.activities?.filter((item) => item.action === "ESCALATED") ?? [];
    assert.equal(escalated.length, 2);
    assert.equal((escalated[0]?.metadata as { level?: string } | null)?.level, "LEVEL_1");

    const resolved = await request(`/api/v1/tickets/${id}/escalations/${firstId}/resolve`, staffToken, {
      method: "POST",
    });
    assert.equal(resolved.status, 200);
    assert.equal(resolved.body.data?.escalation?.status, "RESOLVED");
    assert.ok(resolved.body.data?.escalation?.resolvedAt);
    assert.equal(resolved.body.data?.ticket?.status, "ASSIGNED");
    assert.equal(String(resolved.body.data?.ticket?.slaDeadline), deadline);

    const again = await request(`/api/v1/tickets/${id}/escalations/${firstId}/resolve`, managerToken, {
      method: "POST",
    });
    assert.equal(again.status, 409);
    assert.equal(again.body.error?.code, "ESCALATION_NOT_OPEN");
  });
});
