import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-not-used-in-production";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/edusupport_category_api_test";
process.env.CLIENT_URL = "http://localhost:5173";

let baseUrl = "";
let server: Server;
let studentToken = "";
let managerToken = "";

async function request(path: string, token?: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  const body = (await response.json()) as {
    success: boolean;
    data?: { categories?: Array<{ name: string; isActive: boolean }> };
    error?: { code: string };
  };
  return { status: response.status, body };
}

before(async () => {
  const { connectDatabase } = await import("./config/database.js");
  const { Category } = await import("./models/Category.js");
  const { User } = await import("./models/User.js");
  const { hashPassword } = await import("./utils/password.js");
  const { signAccessToken } = await import("./utils/token.js");
  const { createApp } = await import("./app.js");

  await connectDatabase();
  await Promise.all([User.deleteMany({}), Category.deleteMany({})]);
  const passwordHash = await hashPassword("secure-password1");
  const student = await User.create({
    name: "Student One",
    email: "student-cat@example.com",
    passwordHash,
    role: "student",
  });
  const manager = await User.create({
    name: "Manager One",
    email: "manager-cat@example.com",
    passwordHash,
    role: "manager",
  });
  studentToken = signAccessToken({ userId: student.id, role: "student" });
  managerToken = signAccessToken({ userId: manager.id, role: "manager" });
  await Category.create({ name: "Attendance", defaultPriority: "MEDIUM", isActive: true });
  await Category.create({ name: "Closed Desk", defaultPriority: "LOW", isActive: false });

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

describe("category list", () => {
  it("returns active categories to a student and every category to a manager", async () => {
    const student = await request("/api/v1/categories", studentToken);
    assert.equal(student.status, 200);
    assert.deepEqual(
      student.body.data?.categories?.map((category) => category.name),
      ["Attendance"],
    );

    const manager = await request("/api/v1/categories", managerToken);
    assert.equal(manager.status, 200);
    assert.equal(manager.body.data?.categories?.length, 2);
  });

  it("rejects an anonymous request", async () => {
    const anonymous = await request("/api/v1/categories");
    assert.equal(anonymous.status, 401);
  });
});
