import type { Server } from "node:http";
import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

const app = createApp();
let server: Server | undefined;

async function start(): Promise<void> {
  try {
    await connectDatabase();
    console.log("MongoDB connected");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    console.error(message);
    process.exit(1);
  }

  server = app.listen(env.port, () => {
    console.log(`EduSupport API listening on port ${env.port}`);
  });
}

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}. Closing the server.`);
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await disconnectDatabase();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void start();
