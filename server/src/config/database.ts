import mongoose from "mongoose";
import { env } from "./env.js";

mongoose.set("strictQuery", true);

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.mongodbUri);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    throw new Error(`MongoDB connection failed: ${message}`);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function databaseStatus(): "connected" | "connecting" | "disconnected" {
  if (mongoose.connection.readyState === 1) {
    return "connected";
  }
  if (mongoose.connection.readyState === 2) {
    return "connecting";
  }
  return "disconnected";
}
