import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-not-used-in-production";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/edusupport_ticket_lifecycle_test";
process.env.CLIENT_URL = "http://localhost:5173";

let baseUrl = "";
let server: Server;
let studentToken = "";
let otherStudentToken = "";
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
      comment?: Record<string, unknown>;
      comments?: Array<Record<string, unknown>>;
      activities?: Array<Record<string, unknown>>;
    };
    error?: { code: string; message: string };
  };
  return { status: response.status, body };
}

async function createOpenTicket() {
  const created = await request("/api/v1/tickets", studentToken, {
    method: "POST",
    body: JSON.stringify({ categoryId, subject: "Lifecycle", description: "Needs a comment." }),
  });
  assert.equal(created.status, 201);
  return String(created.body.data?.ticket?.id);
}

async function startProgress(id: string) {
  const assigned = await request(`/api/v1/tickets/${id}/assignment`, managerToken, {
    method: "PATCH",
    body: JSON.stringify({ assignedTo: staffId }),
  });
  assert.equal(assigned.status, 200);
  const started = await request(`/api/v1/tickets/${id}/status`, staffToken, {
    method: "PATCH",
    body: JSON.stringify({ status: "IN_PROGRESS" }),
  });
  assert.equal(started.status, 200);
}

before(async () => {
  const { connectDatabase } = await import("./config/database.js");
  const { Activity } = await import("./models/Activity.js");
  const { Category } = await import("./models/Category.js");
  const { Comment } = await import("./models/Comment.js");
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
    Comment.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  const passwordHash = await hashPassword("secure-password1");
  const student = await User.create({ name: "Student", email: "life-student@example.com", passwordHash, role: "student" });
  const other = await User.create({ name: "Other", email: "life-other@example.com", passwordHash, role: "student" });
  const staff = await User.create({ name: "Staff", email: "life-staff@example.com", passwordHash, role: "staff" });
  const otherStaff = await User.create({ name: "Other Staff", email: "life-staff2@example.com", passwordHash, role: "staff" });
  const manager = await User.create({ name: "Manager", email: "life-manager@example.com", passwordHash, role: "manager" });
  staffId = staff.id;
  studentToken = signAccessToken({ userId: student.id, role: "student" });
  otherStudentToken = signAccessToken({ userId: other.id, role: "student" });
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

describe("ticket comments and lifecycle", () => {
  it("controls who can comment and which comments they can read", async () => {
    const id = await createOpenTicket();
    await startProgress(id);

    const empty = await request(`/api/v1/tickets/${id}/comments`, studentToken, {
      method: "POST",
      body: JSON.stringify({ message: "   ", type: "PUBLIC" }),
    });
    assert.equal(empty.status, 400);

    const internalStudent = await request(`/api/v1/tickets/${id}/comments`, studentToken, {
      method: "POST",
      body: JSON.stringify({ message: "Secret", type: "INTERNAL" }),
    });
    assert.equal(internalStudent.status, 403);

    const spoofedAuthor = await request(`/api/v1/tickets/${id}/comments`, studentToken, {
      method: "POST",
      body: JSON.stringify({ message: "Here is the record.", type: "PUBLIC", authorId: staffId }),
    });
    assert.equal(spoofedAuthor.status, 400);

    const outsider = await request(`/api/v1/tickets/${id}/comments`, otherStudentToken, {
      method: "POST",
      body: JSON.stringify({ message: "Not mine", type: "PUBLIC" }),
    });
    assert.equal(outsider.status, 404);

    const unassigned = await request(`/api/v1/tickets/${id}/comments`, otherStaffToken, {
      method: "POST",
      body: JSON.stringify({ message: "Not assigned", type: "PUBLIC" }),
    });
    assert.equal(unassigned.status, 404);

    const studentComment = await request(`/api/v1/tickets/${id}/comments`, studentToken, {
      method: "POST",
      body: JSON.stringify({ message: "Here is the record.", type: "PUBLIC" }),
    });
    assert.equal(studentComment.status, 201);
    assert.equal((studentComment.body.data?.comment?.author as { id: string }).id !== staffId, true);

    const staffPublic = await request(`/api/v1/tickets/${id}/comments`, staffToken, {
      method: "POST",
      body: JSON.stringify({ message: "Please upload the record.", type: "PUBLIC" }),
    });
    assert.equal(staffPublic.status, 201);

    const staffInternal = await request(`/api/v1/tickets/${id}/comments`, staffToken, {
      method: "POST",
      body: JSON.stringify({ message: "Waiting for department confirmation.", type: "INTERNAL" }),
    });
    assert.equal(staffInternal.status, 201);

    const managerInternal = await request(`/api/v1/tickets/${id}/comments`, managerToken, {
      method: "POST",
      body: JSON.stringify({ message: "Noted internally.", type: "INTERNAL" }),
    });
    assert.equal(managerInternal.status, 201);

    const studentList = await request(`/api/v1/tickets/${id}/comments?type=INTERNAL`, studentToken);
    assert.equal(studentList.status, 200);
    assert.equal(studentList.body.data?.comments?.every((comment) => comment.type === "PUBLIC"), true);
    assert.equal(JSON.stringify(studentList.body).includes("Waiting for department"), false);
    assert.equal(JSON.stringify(studentList.body).includes("passwordHash"), false);

    const staffList = await request(`/api/v1/tickets/${id}/comments`, staffToken);
    assert.equal(staffList.body.data?.comments?.some((comment) => comment.type === "INTERNAL"), true);

    const managerList = await request(`/api/v1/tickets/${id}/comments`, managerToken);
    assert.equal(managerList.body.data?.comments?.filter((comment) => comment.type === "INTERNAL").length, 2);

    const studentHistory = await request(`/api/v1/tickets/${id}/activities`, studentToken);
    const studentActions = studentHistory.body.data?.activities ?? [];
    assert.equal(studentActions.some((item) => item.action === "COMMENT_ADDED" && item.newValue === "PUBLIC"), true);
    assert.equal(studentActions.some((item) => item.newValue === "INTERNAL"), false);
    assert.equal(JSON.stringify(studentHistory.body).includes("Waiting for department"), false);

    const staffHistory = await request(`/api/v1/tickets/${id}/activities`, staffToken);
    assert.equal(
      staffHistory.body.data?.activities?.some((item) => item.action === "COMMENT_ADDED" && item.newValue === "INTERNAL"),
      true,
    );
  });

  it("resolves, closes, and reopens through the action endpoints", async () => {
    const id = await createOpenTicket();
    const tooEarly = await request(`/api/v1/tickets/${id}/close`, studentToken, { method: "POST" });
    assert.equal(tooEarly.status, 422);

    await startProgress(id);

    const studentResolve = await request(`/api/v1/tickets/${id}/resolve`, studentToken, {
      method: "POST",
      body: JSON.stringify({ resolution: "No" }),
    });
    assert.equal(studentResolve.status, 403);

    const otherStaffResolve = await request(`/api/v1/tickets/${id}/resolve`, otherStaffToken, {
      method: "POST",
      body: JSON.stringify({ resolution: "No" }),
    });
    assert.equal(otherStaffResolve.status, 404);

    const emptyResolution = await request(`/api/v1/tickets/${id}/resolve`, staffToken, {
      method: "POST",
      body: JSON.stringify({ resolution: "  ", resolvedAt: "2000-01-01T00:00:00.000Z", status: "CLOSED" }),
    });
    assert.equal(emptyResolution.status, 400);

    const pending = await request(`/api/v1/tickets/${id}/status`, staffToken, {
      method: "PATCH",
      body: JSON.stringify({ status: "PENDING" }),
    });
    assert.equal(pending.status, 200);
    const pendingResolve = await request(`/api/v1/tickets/${id}/resolve`, staffToken, {
      method: "POST",
      body: JSON.stringify({ resolution: "Too soon" }),
    });
    assert.equal(pendingResolve.status, 422);
    await request(`/api/v1/tickets/${id}/status`, staffToken, {
      method: "PATCH",
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    });

    const resolved = await request(`/api/v1/tickets/${id}/resolve`, staffToken, {
      method: "POST",
      body: JSON.stringify({ resolution: "Attendance was corrected after verification." }),
    });
    assert.equal(resolved.status, 200);
    assert.equal(resolved.body.data?.ticket?.status, "RESOLVED");
    assert.equal(resolved.body.data?.ticket?.resolution, "Attendance was corrected after verification.");
    assert.ok(resolved.body.data?.ticket?.resolvedAt);

    const staffClose = await request(`/api/v1/tickets/${id}/close`, staffToken, { method: "POST" });
    assert.equal(staffClose.status, 403);

    const closed = await request(`/api/v1/tickets/${id}/close`, studentToken, { method: "POST" });
    assert.equal(closed.status, 200);
    assert.equal(closed.body.data?.ticket?.status, "CLOSED");
    assert.ok(closed.body.data?.ticket?.closedAt);

    const managerTicket = await createOpenTicket();
    await startProgress(managerTicket);
    const managerResolved = await request(`/api/v1/tickets/${managerTicket}/resolve`, managerToken, {
      method: "POST",
      body: JSON.stringify({ resolution: "Manager verified the record." }),
    });
    assert.equal(managerResolved.status, 200);
    const managerClosed = await request(`/api/v1/tickets/${managerTicket}/close`, managerToken, { method: "POST" });
    assert.equal(managerClosed.status, 200);
    assert.equal(managerClosed.body.data?.ticket?.status, "CLOSED");

    const emptyReason = await request(`/api/v1/tickets/${id}/reopen`, studentToken, {
      method: "POST",
      body: JSON.stringify({ reason: " " }),
    });
    assert.equal(emptyReason.status, 400);

    const staffReopen = await request(`/api/v1/tickets/${id}/reopen`, staffToken, {
      method: "POST",
      body: JSON.stringify({ reason: "Still broken" }),
    });
    assert.equal(staffReopen.status, 403);

    const otherReopen = await request(`/api/v1/tickets/${id}/reopen`, otherStudentToken, {
      method: "POST",
      body: JSON.stringify({ reason: "Not mine" }),
    });
    assert.equal(otherReopen.status, 404);

    const before = await request(`/api/v1/tickets/${id}/activities`, managerToken);
    const beforeCount = before.body.data?.activities?.length ?? 0;

    const reopened = await request(`/api/v1/tickets/${id}/reopen`, studentToken, {
      method: "POST",
      body: JSON.stringify({ reason: "The issue is still not resolved." }),
    });
    assert.equal(reopened.status, 200);
    assert.equal(reopened.body.data?.ticket?.status, "IN_PROGRESS");
    assert.equal(reopened.body.data?.ticket?.resolution, null);
    assert.equal(reopened.body.data?.ticket?.resolvedAt, null);
    assert.equal(reopened.body.data?.ticket?.closedAt, null);

    const managerReopen = await request(`/api/v1/tickets/${managerTicket}/reopen`, managerToken, {
      method: "POST",
      body: JSON.stringify({ reason: "Reopened by the manager." }),
    });
    assert.equal(managerReopen.status, 200);
    assert.equal(managerReopen.body.data?.ticket?.status, "IN_PROGRESS");

    const history = await request(`/api/v1/tickets/${id}/activities`, managerToken);
    const actions = history.body.data?.activities?.map((item) => item.action) ?? [];
    assert.ok(actions.includes("RESOLVED"));
    assert.ok(actions.includes("CLOSED"));
    assert.ok(actions.includes("REOPENED"));
    assert.ok(actions.filter((action) => action === "STATUS_CHANGED").length >= 2);
    assert.ok((history.body.data?.activities?.length ?? 0) > beforeCount);
    const reopenedEvent = history.body.data?.activities?.find((item) => item.action === "REOPENED");
    assert.equal(reopenedEvent?.oldValue, "Attendance was corrected after verification.");
  });
});
