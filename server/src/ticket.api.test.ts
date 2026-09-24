import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-not-used-in-production";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/edusupport_ticket_api_test";
process.env.CLIENT_URL = "http://localhost:5173";

let baseUrl = "";
let server: Server;
let studentToken = "";
let otherStudentToken = "";
let staffToken = "";
let managerToken = "";
let staffId = "";
let categoryId = "";
let inactiveCategoryId = "";
let createdId = "";
let createdNumber = "";

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
      tickets?: Array<Record<string, unknown>>;
      pagination?: { page: number; limit: number; total: number; totalPages: number };
    };
    error?: { code: string; message: string };
  };
  return { status: response.status, body };
}

before(async () => {
  const { connectDatabase } = await import("./config/database.js");
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
    Counter.deleteMany({}),
  ]);

  const passwordHash = await hashPassword("secure-password1");
  const student = await User.create({
    name: "Student One",
    email: "student1@example.com",
    passwordHash,
    role: "student",
  });
  const other = await User.create({
    name: "Student Two",
    email: "student2@example.com",
    passwordHash,
    role: "student",
  });
  const staff = await User.create({
    name: "Staff One",
    email: "staff1@example.com",
    passwordHash,
    role: "staff",
    department: "Attendance",
  });
  const manager = await User.create({
    name: "Manager One",
    email: "manager1@example.com",
    passwordHash,
    role: "manager",
  });
  staffId = staff.id;
  studentToken = signAccessToken({ userId: student.id, role: "student" });
  otherStudentToken = signAccessToken({ userId: other.id, role: "student" });
  staffToken = signAccessToken({ userId: staff.id, role: "staff" });
  managerToken = signAccessToken({ userId: manager.id, role: "manager" });

  const category = await Category.create({ name: "Attendance", defaultPriority: "HIGH" });
  const inactive = await Category.create({
    name: "Closed Desk",
    defaultPriority: "LOW",
    isActive: false,
  });
  categoryId = category.id;
  inactiveCategoryId = inactive.id;
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

describe("ticket APIs", () => {
  it("lets a student create a ticket with server-owned fields", async () => {
    const beforeCreate = Date.now();
    const { status, body } = await request("/api/v1/tickets", studentToken, {
      method: "POST",
      body: JSON.stringify({
        categoryId,
        subject: "Attendance not updated",
        description: "My attendance for Monday is missing.",
        status: "RESOLVED",
        studentId: staffId,
        slaDeadline: "2000-01-01T00:00:00.000Z",
      }),
    });
    assert.equal(status, 400);
    assert.equal(body.error?.code, "VALIDATION_ERROR");

    const created = await request("/api/v1/tickets", studentToken, {
      method: "POST",
      body: JSON.stringify({
        categoryId,
        subject: "Attendance not updated",
        description: "My attendance for Monday is missing.",
      }),
    });
    assert.equal(created.status, 201);
    const ticket = created.body.data?.ticket;
    assert.equal(ticket?.status, "OPEN");
    assert.equal(ticket?.priority, "HIGH");
    assert.equal(ticket?.slaStatus, "WITHIN_SLA");
    assert.match(String(ticket?.ticketNumber), /^EDU-\d+$/);
    const deadline = new Date(String(ticket?.slaDeadline)).getTime();
    assert.ok(deadline >= beforeCreate + 8 * 60 * 60 * 1000 - 5000);
    assert.equal((ticket?.student as { id: string }).id !== staffId, true);
    createdId = String(ticket?.id);
    createdNumber = String(ticket?.ticketNumber);
  });

  it("rejects ticket creation from staff", async () => {
    const { status, body } = await request("/api/v1/tickets", staffToken, {
      method: "POST",
      body: JSON.stringify({
        categoryId,
        subject: "Staff attempt",
        description: "Should fail.",
      }),
    });
    assert.equal(status, 403);
    assert.equal(body.error?.code, "FORBIDDEN");
  });

  it("rejects a missing, inactive, or invalid category", async () => {
    const missing = await request("/api/v1/tickets", studentToken, {
      method: "POST",
      body: JSON.stringify({
        categoryId: "507f1f77bcf86cd799439011",
        subject: "Missing",
        description: "Missing category.",
      }),
    });
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error?.code, "CATEGORY_NOT_FOUND");

    const inactive = await request("/api/v1/tickets", studentToken, {
      method: "POST",
      body: JSON.stringify({
        categoryId: inactiveCategoryId,
        subject: "Inactive",
        description: "Inactive category.",
      }),
    });
    assert.equal(inactive.status, 422);
    assert.equal(inactive.body.error?.code, "CATEGORY_INACTIVE");

    const invalid = await request("/api/v1/tickets", studentToken, {
      method: "POST",
      body: JSON.stringify({
        categoryId: "not-an-id",
        subject: "Bad",
        description: "Bad id.",
      }),
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error?.code, "VALIDATION_ERROR");
  });

  it("lists tickets according to role and filters", async () => {
    const { Ticket } = await import("./models/Ticket.js");
    const { User } = await import("./models/User.js");
    const other = await User.findOne({ email: "student2@example.com" });
    const staff = await User.findOne({ email: "staff1@example.com" });
    const existing = await Ticket.findById(createdId);
    assert.ok(other && staff && existing);
    await Ticket.create({
      ticketNumber: "EDU-9001",
      studentId: other.id,
      assignedTo: staff.id,
      categoryId,
      subject: "Hostel gate pass",
      description: "Need a gate pass.",
      priority: "LOW",
      status: "ASSIGNED",
      slaPolicyId: existing.slaPolicyId,
      slaDeadline: existing.slaDeadline,
      slaStatus: "BREACHED",
    });

    const studentList = await request("/api/v1/tickets?assignedTo=" + staffId, studentToken);
    assert.equal(studentList.status, 200);
    assert.equal(studentList.body.data?.tickets?.length, 1);
    assert.equal(studentList.body.data?.tickets?.[0]?.ticketNumber, createdNumber);

    const staffList = await request("/api/v1/tickets", staffToken);
    assert.equal(staffList.body.data?.tickets?.length, 1);
    assert.equal(staffList.body.data?.tickets?.[0]?.ticketNumber, "EDU-9001");

    const staffBypass = await request("/api/v1/tickets?assignedTo=" + other?.id, staffToken);
    assert.equal(staffBypass.body.data?.tickets?.every((ticket) => ticket.ticketNumber === "EDU-9001"), true);

    const managerList = await request("/api/v1/tickets", managerToken);
    assert.equal(managerList.body.data?.pagination?.total, 2);

    const paged = await request("/api/v1/tickets?page=1&limit=1", managerToken);
    assert.equal(paged.body.data?.tickets?.length, 1);
    assert.equal(paged.body.data?.pagination?.totalPages, 2);

    const byStatus = await request("/api/v1/tickets?status=OPEN", managerToken);
    assert.equal(byStatus.body.data?.tickets?.length, 1);
    assert.equal(byStatus.body.data?.tickets?.[0]?.status, "OPEN");

    const byPriority = await request("/api/v1/tickets?priority=LOW", managerToken);
    assert.equal(byPriority.body.data?.tickets?.[0]?.priority, "LOW");

    const bySla = await request("/api/v1/tickets?slaStatus=BREACHED", managerToken);
    assert.equal(bySla.body.data?.tickets?.[0]?.slaStatus, "BREACHED");

    const search = await request("/api/v1/tickets?search=EDU-9001", managerToken);
    assert.equal(search.body.data?.tickets?.length, 1);
    assert.equal(search.body.data?.tickets?.[0]?.subject, "Hostel gate pass");
  });

  it("returns a ticket only to someone allowed to see it", async () => {
    const own = await request(`/api/v1/tickets/${createdId}`, studentToken);
    assert.equal(own.status, 200);
    assert.equal(own.body.data?.ticket?.ticketNumber, createdNumber);
    assert.equal(JSON.stringify(own.body).includes("passwordHash"), false);

    const other = await request(`/api/v1/tickets/${createdId}`, otherStudentToken);
    assert.equal(other.status, 404);
    assert.equal(other.body.error?.code, "TICKET_NOT_FOUND");

    const staffDenied = await request(`/api/v1/tickets/${createdId}`, staffToken);
    assert.equal(staffDenied.status, 404);

    const assigned = await request("/api/v1/tickets?search=EDU-9001", staffToken);
    const assignedId = String(assigned.body.data?.tickets?.[0]?.id);
    const staffAllowed = await request(`/api/v1/tickets/${assignedId}`, staffToken);
    assert.equal(staffAllowed.status, 200);

    const manager = await request(`/api/v1/tickets/${createdId}`, managerToken);
    assert.equal(manager.status, 200);

    const badId = await request("/api/v1/tickets/not-an-id", managerToken);
    assert.equal(badId.status, 400);

    const missing = await request("/api/v1/tickets/507f1f77bcf86cd799439011", managerToken);
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error?.code, "TICKET_NOT_FOUND");
  });
});
