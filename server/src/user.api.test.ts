import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-not-used-in-production";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/edusupport_user_api_test";
process.env.CLIENT_URL = "http://localhost:5173";

let baseUrl = "";
let server: Server;
let managerToken = "";
let staffToken = "";

async function request(path: string, token?: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  const body = (await response.json()) as {
    success: boolean;
    data?: { users?: Array<Record<string, unknown>> };
    error?: { code: string };
  };
  return { status: response.status, body };
}

before(async () => {
  const { connectDatabase } = await import("./config/database.js");
  const { User } = await import("./models/User.js");
  const { hashPassword } = await import("./utils/password.js");
  const { signAccessToken } = await import("./utils/token.js");
  const { createApp } = await import("./app.js");

  await connectDatabase();
  await User.deleteMany({});
  const passwordHash = await hashPassword("secure-password1");
  const manager = await User.create({
    name: "Manager One",
    email: "manager-users@example.com",
    passwordHash,
    role: "manager",
  });
  const staff = await User.create({
    name: "Staff One",
    email: "staff-users@example.com",
    passwordHash,
    role: "staff",
    department: "Desk",
  });
  await User.create({
    name: "Inactive Staff",
    email: "inactive-users@example.com",
    passwordHash,
    role: "staff",
    isActive: false,
  });
  await User.create({
    name: "Student One",
    email: "student-users@example.com",
    passwordHash,
    role: "student",
  });
  managerToken = signAccessToken({ userId: manager.id, role: "manager" });
  staffToken = signAccessToken({ userId: staff.id, role: "staff" });

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

describe("staff directory", () => {
  it("returns active staff without a password hash", async () => {
    const { status, body } = await request("/api/v1/users/staff", managerToken);
    assert.equal(status, 200);
    assert.equal(body.data?.users?.length, 1);
    assert.equal(body.data?.users?.[0]?.name, "Staff One");
    assert.equal(body.data?.users?.[0]?.email, "staff-users@example.com");
    assert.equal("passwordHash" in (body.data?.users?.[0] ?? {}), false);
  });

  it("rejects staff and anonymous callers", async () => {
    assert.equal((await request("/api/v1/users/staff", staffToken)).status, 403);
    assert.equal((await request("/api/v1/users/staff")).status, 401);
  });
});
