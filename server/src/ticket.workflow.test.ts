import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-not-used-in-production";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/edusupport_ticket_workflow_test";
process.env.CLIENT_URL = "http://localhost:5173";

let baseUrl = "";
let server: Server;
let studentToken = "";
let staffToken = "";
let otherStaffToken = "";
let managerToken = "";
let staffId = "";
let otherStaffId = "";
let studentId = "";
let managerId = "";
let inactiveStaffId = "";
let categoryId = "";
let highPolicyId = "";

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
      activities?: Array<Record<string, unknown>>;
      pagination?: { page: number; limit: number; total: number; totalPages: number };
    };
    error?: { code: string; message: string };
  };
  return { status: response.status, body };
}

async function createTicket(subject: string) {
  const created = await request("/api/v1/tickets", studentToken, {
    method: "POST",
    body: JSON.stringify({
      categoryId,
      subject,
      description: "Workflow test ticket.",
    }),
  });
  assert.equal(created.status, 201);
  return created.body.data?.ticket as Record<string, unknown>;
}

before(async () => {
  const { connectDatabase } = await import("./config/database.js");
  const { Activity } = await import("./models/Activity.js");
  const { Category } = await import("./models/Category.js");
  const { Counter } = await import("./models/Counter.js");
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
    Counter.deleteMany({}),
  ]);

  const passwordHash = await hashPassword("secure-password1");
  const student = await User.create({ name: "Student", email: "wf-student@example.com", passwordHash, role: "student" });
  const staff = await User.create({ name: "Staff", email: "wf-staff@example.com", passwordHash, role: "staff" });
  const otherStaff = await User.create({
    name: "Other Staff",
    email: "wf-staff2@example.com",
    passwordHash,
    role: "staff",
  });
  const inactive = await User.create({
    name: "Inactive",
    email: "wf-inactive@example.com",
    passwordHash,
    role: "staff",
    isActive: false,
  });
  const manager = await User.create({ name: "Manager", email: "wf-manager@example.com", passwordHash, role: "manager" });

  studentId = student.id;
  staffId = staff.id;
  otherStaffId = otherStaff.id;
  inactiveStaffId = inactive.id;
  managerId = manager.id;
  studentToken = signAccessToken({ userId: student.id, role: "student" });
  staffToken = signAccessToken({ userId: staff.id, role: "staff" });
  otherStaffToken = signAccessToken({ userId: otherStaff.id, role: "staff" });
  managerToken = signAccessToken({ userId: manager.id, role: "manager" });

  const category = await Category.create({ name: "Attendance", defaultPriority: "HIGH" });
  categoryId = category.id;
  const high = await SLAPolicy.create({ priority: "HIGH", responseTimeHours: 8, resolutionTimeHours: 8 });
  highPolicyId = high.id;
  await SLAPolicy.create({ priority: "LOW", responseTimeHours: 48, resolutionTimeHours: 48 });
  await SLAPolicy.create({ priority: "MEDIUM", responseTimeHours: 24, resolutionTimeHours: 24 });

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

describe("ticket workflow", () => {
  it("assigns, reassigns, and rejects invalid assignees", async () => {
    const ticket = await createTicket("Assign me");
    const id = String(ticket.id);

    const studentDenied = await request(`/api/v1/tickets/${id}/assignment`, studentToken, {
      method: "PATCH",
      body: JSON.stringify({ assignedTo: staffId }),
    });
    assert.equal(studentDenied.status, 403);

    const staffDenied = await request(`/api/v1/tickets/${id}/assignment`, staffToken, {
      method: "PATCH",
      body: JSON.stringify({ assignedTo: otherStaffId }),
    });
    assert.equal(staffDenied.status, 403);

    const toStudent = await request(`/api/v1/tickets/${id}/assignment`, managerToken, {
      method: "PATCH",
      body: JSON.stringify({ assignedTo: studentId }),
    });
    assert.equal(toStudent.status, 422);
    assert.equal(toStudent.body.error?.code, "INVALID_ASSIGNEE");

    const toManager = await request(`/api/v1/tickets/${id}/assignment`, managerToken, {
      method: "PATCH",
      body: JSON.stringify({ assignedTo: managerId }),
    });
    assert.equal(toManager.status, 422);
    assert.equal(toManager.body.error?.code, "INVALID_ASSIGNEE");

    const toInactive = await request(`/api/v1/tickets/${id}/assignment`, managerToken, {
      method: "PATCH",
      body: JSON.stringify({ assignedTo: inactiveStaffId }),
    });
    assert.equal(toInactive.status, 422);
    assert.equal(toInactive.body.error?.code, "STAFF_INACTIVE");

    const assigned = await request(`/api/v1/tickets/${id}/assignment`, managerToken, {
      method: "PATCH",
      body: JSON.stringify({ assignedTo: staffId }),
    });
    assert.equal(assigned.status, 200);
    assert.equal(assigned.body.data?.ticket?.status, "ASSIGNED");
    assert.equal((assigned.body.data?.ticket?.assignedTo as { id: string }).id, staffId);

    const reassigned = await request(`/api/v1/tickets/${id}/assignment`, managerToken, {
      method: "PATCH",
      body: JSON.stringify({ assignedTo: otherStaffId }),
    });
    assert.equal(reassigned.status, 200);
    assert.equal(reassigned.body.data?.ticket?.status, "ASSIGNED");
    assert.equal((reassigned.body.data?.ticket?.assignedTo as { id: string }).id, otherStaffId);

    const history = await request(`/api/v1/tickets/${id}/activities`, managerToken);
    const actions = history.body.data?.activities?.map((item) => item.action);
    assert.deepEqual(actions, ["TICKET_CREATED", "TICKET_ASSIGNED", "TICKET_REASSIGNED"]);
  });

  it("enforces status transitions and records them", async () => {
    const ticket = await createTicket("Status me");
    const id = String(ticket.id);

    const studentStatus = await request(`/api/v1/tickets/${id}/status`, studentToken, {
      method: "PATCH",
      body: JSON.stringify({ status: "ASSIGNED" }),
    });
    assert.equal(studentStatus.status, 403);

    const jump = await request(`/api/v1/tickets/${id}/status`, managerToken, {
      method: "PATCH",
      body: JSON.stringify({ status: "RESOLVED" }),
    });
    assert.equal(jump.status, 422);
    assert.equal(jump.body.error?.code, "INVALID_TRANSITION");

    await request(`/api/v1/tickets/${id}/assignment`, managerToken, {
      method: "PATCH",
      body: JSON.stringify({ assignedTo: staffId }),
    });

    const unrelated = await request(`/api/v1/tickets/${id}/status`, otherStaffToken, {
      method: "PATCH",
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    });
    assert.equal(unrelated.status, 404);

    const started = await request(`/api/v1/tickets/${id}/status`, staffToken, {
      method: "PATCH",
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    });
    assert.equal(started.status, 200);
    assert.equal(started.body.data?.ticket?.status, "IN_PROGRESS");

    const missingResolution = await request(`/api/v1/tickets/${id}/status`, managerToken, {
      method: "PATCH",
      body: JSON.stringify({ status: "RESOLVED" }),
    });
    assert.equal(missingResolution.status, 400);
    assert.equal(missingResolution.body.error?.code, "VALIDATION_ERROR");

    const kept = await request(`/api/v1/tickets/${id}/assignment`, managerToken, {
      method: "PATCH",
      body: JSON.stringify({ assignedTo: otherStaffId }),
    });
    assert.equal(kept.status, 200);
    assert.equal(kept.body.data?.ticket?.status, "IN_PROGRESS");

    const history = await request(`/api/v1/tickets/${id}/activities`, otherStaffToken);
    const statusChange = history.body.data?.activities?.find((item) => item.action === "STATUS_CHANGED");
    assert.equal(statusChange?.oldValue, "ASSIGNED");
    assert.equal(statusChange?.newValue, "IN_PROGRESS");
  });

  it("recalculates SLA on priority change and hides the history from outsiders", async () => {
    const ticket = await createTicket("Priority me");
    const id = String(ticket.id);
    const createdAt = new Date(String(ticket.createdAt)).getTime();

    const studentPriority = await request(`/api/v1/tickets/${id}/priority`, studentToken, {
      method: "PATCH",
      body: JSON.stringify({ priority: "LOW" }),
    });
    assert.equal(studentPriority.status, 403);

    const override = await request(`/api/v1/tickets/${id}/priority`, managerToken, {
      method: "PATCH",
      body: JSON.stringify({ priority: "LOW", slaDeadline: "2000-01-01T00:00:00.000Z", slaStatus: "BREACHED" }),
    });
    assert.equal(override.status, 400);

    const changed = await request(`/api/v1/tickets/${id}/priority`, managerToken, {
      method: "PATCH",
      body: JSON.stringify({ priority: "LOW" }),
    });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.data?.ticket?.priority, "LOW");
    assert.equal(changed.body.data?.ticket?.status, "OPEN");
    const deadline = new Date(String(changed.body.data?.ticket?.slaDeadline)).getTime();
    assert.ok(Math.abs(deadline - (createdAt + 48 * 60 * 60 * 1000)) < 2000);
    assert.equal(changed.body.data?.ticket?.slaStatus, "WITHIN_SLA");

    const outsider = await request(`/api/v1/tickets/${id}/activities`, staffToken);
    assert.equal(outsider.status, 404);

    const own = await request(`/api/v1/tickets/${id}/activities?page=1&limit=1`, studentToken);
    assert.equal(own.status, 200);
    assert.equal(own.body.data?.activities?.length, 1);
    assert.equal(own.body.data?.activities?.[0]?.action, "TICKET_CREATED");
    assert.equal(own.body.data?.pagination?.total, 2);
    assert.equal(own.body.data?.pagination?.totalPages, 2);

    await request(`/api/v1/tickets/${id}/assignment`, managerToken, {
      method: "PATCH",
      body: JSON.stringify({ assignedTo: staffId }),
    });
    const staffView = await request(`/api/v1/tickets/${id}/activities`, staffToken);
    assert.equal(staffView.status, 200);
    const staffPriority = await request(`/api/v1/tickets/${id}/priority`, staffToken, {
      method: "PATCH",
      body: JSON.stringify({ priority: "MEDIUM" }),
    });
    assert.equal(staffPriority.status, 200);
    assert.equal(staffPriority.body.data?.ticket?.priority, "MEDIUM");

    const managerView = await request(`/api/v1/tickets/${id}/activities`, managerToken);
    const actions = managerView.body.data?.activities?.map((item) => item.action);
    assert.ok(actions?.includes("PRIORITY_CHANGED"));
    const times = (managerView.body.data?.activities ?? []).map((item) => new Date(String(item.createdAt)).getTime());
    assert.deepEqual(times, [...times].sort((left, right) => left - right));
    assert.equal(highPolicyId.length > 0, true);
  });
});
