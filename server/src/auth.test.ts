import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";
import type { Express } from "express";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-not-used-in-production";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/edusupport_test";
process.env.CLIENT_URL = "http://localhost:5173";

type AuthApp = {
  listen(port: number, callback: () => void): Server;
};

let server: Server;
let baseUrl = "";

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json()) as {
    success: boolean;
    data?: { token?: string; user?: Record<string, unknown>; ok?: boolean };
    error?: { code: string; message: string };
  };
  return { status: response.status, body };
}

before(async () => {
  const { connectDatabase } = await import("./config/database.js");
  const { User } = await import("./models/User.js");
  const { createApp } = await import("./app.js");
  const { requireAuth, requireRole } = await import("./middleware/auth.js");

  await connectDatabase();
  await User.deleteMany({});

  const app = createApp((expressApp: Express) => {
    expressApp.get("/api/v1/manager-only", requireAuth, requireRole("manager"), (_req, res) => {
      res.json({ success: true, data: { ok: true } });
    });
  }) as unknown as AuthApp;

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
  const { User } = await import("./models/User.js");
  const { disconnectDatabase } = await import("./config/database.js");
  await User.deleteMany({});
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await disconnectDatabase();
});

describe("authentication", () => {
  const email = "student@example.com";
  const password = "secure-password1";
  let token = "";

  it("registers a student and omits the password hash", async () => {
    const { status, body } = await request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Test Student", email, password }),
    });
    assert.equal(status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data?.user?.role, "student");
    assert.equal(body.data?.user?.email, email);
    assert.equal("passwordHash" in (body.data?.user ?? {}), false);
    assert.equal(JSON.stringify(body).includes("passwordHash"), false);
  });

  it("rejects a duplicate email", async () => {
    const { status, body } = await request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Test Student", email, password }),
    });
    assert.equal(status, 409);
    assert.equal(body.error?.code, "EMAIL_TAKEN");
  });

  it("rejects invalid registration data", async () => {
    const { status, body } = await request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "A", email: "not-an-email", password: "short" }),
    });
    assert.equal(status, 400);
    assert.equal(body.error?.code, "VALIDATION_ERROR");
  });

  it("rejects public registration of a manager", async () => {
    const { status, body } = await request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Not A Manager",
        email: "manager-attempt@example.com",
        password,
        role: "manager",
      }),
    });
    assert.equal(status, 403);
    assert.equal(body.error?.code, "FORBIDDEN");
  });

  it("logs in and returns a token without a password hash", async () => {
    const { status, body } = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "Student@Example.com", password }),
    });
    assert.equal(status, 200);
    assert.equal(typeof body.data?.token, "string");
    assert.equal(body.data?.user?.email, email);
    assert.equal(JSON.stringify(body).includes("passwordHash"), false);
    token = body.data?.token ?? "";
  });

  it("rejects a wrong password", async () => {
    const { status, body } = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: "wrong-password1" }),
    });
    assert.equal(status, 401);
    assert.equal(body.error?.code, "INVALID_CREDENTIALS");
    assert.equal(body.error?.message, "Invalid email or password.");
  });

  it("uses the same error when the account does not exist", async () => {
    const missing = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "missing@example.com", password }),
    });
    const wrong = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: "wrong-password1" }),
    });
    assert.deepEqual(missing.body, wrong.body);
    assert.equal(missing.status, wrong.status);
  });

  it("rejects a missing token", async () => {
    const { status, body } = await request("/api/v1/auth/me");
    assert.equal(status, 401);
    assert.equal(body.error?.code, "MISSING_TOKEN");
  });

  it("rejects an invalid token", async () => {
    const { status, body } = await request("/api/v1/auth/me", {
      headers: { authorization: "Bearer not-a-token" },
    });
    assert.equal(status, 401);
    assert.equal(body.error?.code, "INVALID_TOKEN");
  });

  it("returns the current user for a valid token", async () => {
    const { status, body } = await request("/api/v1/auth/me", {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(status, 200);
    assert.equal(body.data?.user?.email, email);
    assert.equal(body.data?.user?.role, "student");
    assert.equal("passwordHash" in (body.data?.user ?? {}), false);
  });

  it("blocks a student from a manager-only route", async () => {
    const { status, body } = await request("/api/v1/manager-only", {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(status, 403);
    assert.equal(body.error?.code, "FORBIDDEN");
  });
});
