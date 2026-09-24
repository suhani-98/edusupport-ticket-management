import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-not-used-in-production";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/edusupport_ticket_dashboard_test";
process.env.CLIENT_URL = "http://localhost:5173";

let baseUrl = "";
let server: Server;
let studentToken = "";
let otherStudentToken = "";
let staffToken = "";
let managerToken = "";
let staffId = "";
let categoryId = "";
let ownId = "";
let otherId = "";

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
    data?: Record<string, unknown>;
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
  const student = await User.create({ name: "Student", email: "dash-student@example.com", passwordHash, role: "student" });
  const other = await User.create({ name: "Other", email: "dash-other@example.com", passwordHash, role: "student" });
  const staff = await User.create({ name: "Staff", email: "dash-staff@example.com", passwordHash, role: "staff" });
  const manager = await User.create({ name: "Manager", email: "dash-manager@example.com", passwordHash, role: "manager" });
  staffId = staff.id;
  studentToken = signAccessToken({ userId: student.id, role: "student" });
  otherStudentToken = signAccessToken({ userId: other.id, role: "student" });
  staffToken = signAccessToken({ userId: staff.id, role: "staff" });
  managerToken = signAccessToken({ userId: manager.id, role: "manager" });
  const category = await Category.create({ name: "Attendance", defaultPriority: "HIGH" });
  categoryId = category.id;
  await SLAPolicy.create({ priority: "HIGH", responseTimeHours: 8, resolutionTimeHours: 8 });
  await SLAPolicy.create({ priority: "LOW", responseTimeHours: 48, resolutionTimeHours: 48 });

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

describe("dashboards", () => {
  it("scopes counts to the caller and rejects the other roles", async () => {
    const own = await request("/api/v1/tickets", studentToken, {
      method: "POST",
      body: JSON.stringify({ categoryId, subject: "Mine", description: "My ticket." }),
    });
    ownId = String(own.body.data?.ticket && (own.body.data.ticket as { id: string }).id);
    const other = await request("/api/v1/tickets", otherStudentToken, {
      method: "POST",
      body: JSON.stringify({ categoryId, subject: "Theirs", description: "Other ticket." }),
    });
    otherId = String(other.body.data?.ticket && (other.body.data.ticket as { id: string }).id);

    await request(`/api/v1/tickets/${ownId}/assignment`, managerToken, {
      method: "PATCH",
      body: JSON.stringify({ assignedTo: staffId }),
    });
    await request(`/api/v1/tickets/${ownId}/status`, staffToken, {
      method: "PATCH",
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    });
    await request(`/api/v1/tickets/${ownId}/priority`, managerToken, {
      method: "PATCH",
      body: JSON.stringify({ priority: "LOW" }),
    });
    const { Ticket } = await import("./models/Ticket.js");
    await Ticket.updateOne(
      { _id: ownId },
      { slaDeadline: new Date(Date.now() - 60_000), slaStatus: "BREACHED" },
    );
    await request(`/api/v1/tickets/${ownId}/escalate`, staffToken, {
      method: "POST",
      body: JSON.stringify({ reason: "Needs a manager." }),
    });

    assert.equal((await request("/api/v1/dashboard/staff", studentToken)).status, 403);
    assert.equal((await request("/api/v1/dashboard/manager", studentToken)).status, 403);
    assert.equal((await request("/api/v1/dashboard/student", staffToken)).status, 403);
    assert.equal((await request("/api/v1/dashboard/manager", staffToken)).status, 403);
    assert.equal((await request("/api/v1/dashboard/student", managerToken)).status, 403);
    assert.equal((await request("/api/v1/dashboard/staff", managerToken)).status, 403);

    const studentDash = await request("/api/v1/dashboard/student", studentToken);
    assert.equal(studentDash.status, 200);
    const studentCounts = studentDash.body.data?.ticketCounts as Record<string, number>;
    assert.equal(studentCounts.total, 1);
    assert.equal(studentCounts.inProgress, 1);
    const studentPriority = studentDash.body.data?.priorityCounts as Record<string, number>;
    assert.equal(studentPriority.low, 1);
    assert.equal(studentPriority.high, 0);
    const studentSla = studentDash.body.data?.slaCounts as Record<string, number>;
    assert.equal(studentSla.breached, 1);
    assert.equal(studentSla.withinSla, 0);
    const studentRecent = studentDash.body.data?.recentTickets as Array<Record<string, unknown>>;
    assert.equal(studentRecent.length, 1);
    assert.equal(studentRecent[0]?.id, ownId);
    assert.equal(JSON.stringify(studentDash.body).includes("passwordHash"), false);
    assert.equal(JSON.stringify(studentDash.body).includes(otherId), false);

    const otherDash = await request("/api/v1/dashboard/student", otherStudentToken);
    const otherCounts = otherDash.body.data?.ticketCounts as Record<string, number>;
    assert.equal(otherCounts.total, 1);
    assert.equal(otherCounts.open, 1);
    const otherRecent = otherDash.body.data?.recentTickets as Array<Record<string, unknown>>;
    assert.equal(otherRecent[0]?.id, otherId);

    const staffDash = await request("/api/v1/dashboard/staff", staffToken);
    const staffCounts = staffDash.body.data?.ticketCounts as Record<string, number>;
    assert.equal(staffCounts.inProgress, 1);
    assert.equal(staffCounts.assigned, 0);
    const staffSla = staffDash.body.data?.slaCounts as Record<string, number>;
    assert.equal(staffSla.breached, 1);
    assert.equal(staffSla.overdueOpen, 1);
    const staffEscalations = staffDash.body.data?.escalationCounts as Record<string, number>;
    assert.equal(staffEscalations.open, 1);
    assert.equal(staffEscalations.level1, 1);
    assert.equal(staffEscalations.level2, 0);
    const staffRecent = staffDash.body.data?.recentTickets as Array<Record<string, unknown>>;
    assert.equal(staffRecent.length, 1);
    assert.equal(staffRecent[0]?.id, ownId);

    const managerDash = await request("/api/v1/dashboard/manager", managerToken);
    const managerCounts = managerDash.body.data?.ticketCounts as Record<string, number>;
    assert.equal(managerCounts.total, 2);
    assert.equal(managerCounts.open, 1);
    assert.equal(managerCounts.inProgress, 1);
    const managerPriority = managerDash.body.data?.priorityCounts as Record<string, number>;
    assert.equal(managerPriority.low, 1);
    assert.equal(managerPriority.high, 1);
    const managerSla = managerDash.body.data?.slaCounts as Record<string, number>;
    assert.equal(managerSla.breached, 1);
    assert.equal(managerSla.overdueOpen, 1);
    const managerEscalations = managerDash.body.data?.escalationCounts as Record<string, number>;
    assert.equal(managerEscalations.open, 1);
    assert.equal(managerEscalations.level1, 1);
    const categories = managerDash.body.data?.categoryCounts as Array<Record<string, unknown>>;
    assert.equal(categories.length, 1);
    assert.equal(categories[0]?.categoryName, "Attendance");
    assert.equal(categories[0]?.count, 2);
    const workload = managerDash.body.data?.staffWorkload as Array<Record<string, unknown>>;
    assert.equal(workload.length, 1);
    assert.equal(workload[0]?.staffId, staffId);
    assert.equal(workload[0]?.assigned, 1);
    assert.equal(workload[0]?.inProgress, 1);
    assert.equal(workload[0]?.breached, 1);
    const managerRecent = managerDash.body.data?.recentTickets as Array<Record<string, unknown>>;
    assert.ok(managerRecent.length <= 10);
    assert.equal(managerRecent.length, 2);
    assert.equal(JSON.stringify(managerDash.body).includes("passwordHash"), false);
  });
});
