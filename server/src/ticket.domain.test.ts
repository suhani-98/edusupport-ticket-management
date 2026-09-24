import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { Types } from "mongoose";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-not-used-in-production";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/edusupport_domain_test";
process.env.CLIENT_URL = "http://localhost:5173";

describe("ticket domain", () => {
  before(async () => {
    const { connectDatabase } = await import("./config/database.js");
    const { Category } = await import("./models/Category.js");
    const { Counter } = await import("./models/Counter.js");
    const { SLAPolicy } = await import("./models/SLAPolicy.js");
    const { Ticket } = await import("./models/Ticket.js");
    await connectDatabase();
    await Promise.all([
      Category.syncIndexes(),
      SLAPolicy.syncIndexes(),
      Ticket.syncIndexes(),
      Counter.deleteMany({}),
      Category.deleteMany({}),
      SLAPolicy.deleteMany({}),
      Ticket.deleteMany({}),
    ]);
  });

  after(async () => {
    const { disconnectDatabase } = await import("./config/database.js");
    await disconnectDatabase();
  });

  it("accepts a valid ticket", async () => {
    const { Category } = await import("./models/Category.js");
    const { SLAPolicy } = await import("./models/SLAPolicy.js");
    const { Ticket } = await import("./models/Ticket.js");
    const category = await Category.create({ name: "Attendance", defaultPriority: "MEDIUM" });
    const policy = await SLAPolicy.create({
      priority: "MEDIUM",
      responseTimeHours: 24,
      resolutionTimeHours: 24,
    });
    const ticket = await Ticket.create({
      ticketNumber: "EDU-1001",
      studentId: new Types.ObjectId(),
      categoryId: category.id,
      subject: "Attendance not updated",
      description: "Monday attendance is missing.",
      priority: "MEDIUM",
      status: "OPEN",
      slaPolicyId: policy.id,
      slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      slaStatus: "WITHIN_SLA",
    });
    assert.equal(ticket.ticketNumber, "EDU-1001");
    assert.equal(ticket.escalationLevel, 0);
    assert.equal(ticket.status, "OPEN");
    assert.equal(ticket.slaStatus, "WITHIN_SLA");
  });

  it("rejects a ticket that is missing required fields", async () => {
    const { Ticket } = await import("./models/Ticket.js");
    await assert.rejects(
      () => Ticket.create({}),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(`${error.name} ${error.message}`, /required/i);
        return true;
      },
    );
  });

  it("rejects an invalid priority", async () => {
    const { Ticket } = await import("./models/Ticket.js");
    await assert.rejects(
      () =>
        Ticket.create({
          ticketNumber: "EDU-1002",
          studentId: new Types.ObjectId(),
          categoryId: new Types.ObjectId(),
          subject: "Subject",
          description: "Description",
          priority: "URGENT",
          status: "OPEN",
          slaPolicyId: new Types.ObjectId(),
          slaDeadline: new Date(),
          slaStatus: "WITHIN_SLA",
        }),
      /priority/i,
    );
  });

  it("rejects an invalid status", async () => {
    const { Ticket } = await import("./models/Ticket.js");
    await assert.rejects(
      () =>
        Ticket.create({
          ticketNumber: "EDU-1003",
          studentId: new Types.ObjectId(),
          categoryId: new Types.ObjectId(),
          subject: "Subject",
          description: "Description",
          priority: "LOW",
          status: "ESCALATED",
          slaPolicyId: new Types.ObjectId(),
          slaDeadline: new Date(),
          slaStatus: "WITHIN_SLA",
        }),
      /status/i,
    );
  });

  it("rejects an invalid SLA status", async () => {
    const { Ticket } = await import("./models/Ticket.js");
    await assert.rejects(
      () =>
        Ticket.create({
          ticketNumber: "EDU-1004",
          studentId: new Types.ObjectId(),
          categoryId: new Types.ObjectId(),
          subject: "Subject",
          description: "Description",
          priority: "LOW",
          status: "OPEN",
          slaPolicyId: new Types.ObjectId(),
          slaDeadline: new Date(),
          slaStatus: "LATE",
        }),
      /slaStatus/i,
    );
  });

  it("allows the documented status transitions and rejects a jump", async () => {
    const { assertStatusTransition, canTransition } = await import("./domain/ticketRules.js");
    assert.equal(canTransition("OPEN", "ASSIGNED"), true);
    assert.equal(canTransition("IN_PROGRESS", "RESOLVED"), true);
    assert.equal(canTransition("RESOLVED", "CLOSED"), true);
    assert.equal(canTransition("CLOSED", "IN_PROGRESS"), false);
    assert.throws(() => assertStatusTransition("OPEN", "RESOLVED"), /Cannot change status from OPEN to RESOLVED/);
  });

  it("requires resolution details before a ticket is resolved", async () => {
    const { assertResolutionPresent } = await import("./domain/ticketRules.js");
    assert.throws(() => assertResolutionPresent("  "), /Resolution details are required/);
    assert.doesNotThrow(() => assertResolutionPresent("Attendance was corrected."));
  });

  it("keeps SLA state independent of ticket status", async () => {
    const { slaStatusAt } = await import("./domain/ticketRules.js");
    const createdAt = new Date("2026-09-24T08:00:00.000Z");
    const deadline = new Date("2026-09-24T16:00:00.000Z");
    assert.equal(slaStatusAt(createdAt, deadline, new Date("2026-09-24T17:00:00.000Z")), "BREACHED");
  });

  it("rejects an invalid SLA policy priority and a second active policy", async () => {
    const { SLAPolicy } = await import("./models/SLAPolicy.js");
    await assert.rejects(
      () => SLAPolicy.create({ priority: "URGENT", responseTimeHours: 1, resolutionTimeHours: 1 }),
      /priority/i,
    );
    await SLAPolicy.create({ priority: "LOW", responseTimeHours: 48, resolutionTimeHours: 48 });
    await assert.rejects(
      () => SLAPolicy.create({ priority: "LOW", responseTimeHours: 48, resolutionTimeHours: 48 }),
      /duplicate key/i,
    );
  });

  it("rejects a category without a name and a duplicate name", async () => {
    const { Category } = await import("./models/Category.js");
    await assert.rejects(() => Category.create({ defaultPriority: "LOW" }), /name/i);
    await assert.rejects(
      () => Category.create({ name: "Attendance", defaultPriority: "HIGH" }),
      /duplicate key/i,
    );
  });

  it("allocates unique sequential ticket numbers", async () => {
    const { nextTicketNumber } = await import("./utils/ticketNumber.js");
    const { Ticket } = await import("./models/Ticket.js");
    const numbers = await Promise.all([nextTicketNumber(), nextTicketNumber(), nextTicketNumber()]);
    assert.deepEqual(numbers.sort(), ["EDU-1001", "EDU-1002", "EDU-1003"]);
    await Ticket.create({
      ticketNumber: "EDU-2000",
      studentId: new Types.ObjectId(),
      categoryId: new Types.ObjectId(),
      subject: "One",
      description: "One",
      priority: "LOW",
      status: "OPEN",
      slaPolicyId: new Types.ObjectId(),
      slaDeadline: new Date(),
      slaStatus: "WITHIN_SLA",
    });
    await assert.rejects(
      () =>
        Ticket.create({
          ticketNumber: "EDU-2000",
          studentId: new Types.ObjectId(),
          categoryId: new Types.ObjectId(),
          subject: "Two",
          description: "Two",
          priority: "LOW",
          status: "OPEN",
          slaPolicyId: new Types.ObjectId(),
          slaDeadline: new Date(),
          slaStatus: "WITHIN_SLA",
        }),
      /duplicate key/i,
    );
  });
});
