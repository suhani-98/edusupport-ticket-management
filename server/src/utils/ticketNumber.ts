import { Counter } from "../models/Counter.js";

const FIRST_NUMBER = 1000;

/**
 * Ticket numbers are allocated with one atomic findOneAndUpdate increment.
 * Two creates cannot read the same sequence value. The first increment
 * yields EDU-1001 because the stored sequence starts at 0 and the public
 * number is 1000 plus that sequence. The MongoDB ObjectId stays the
 * internal key only.
 */
export async function nextTicketNumber(): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { _id: "ticket" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  if (!counter) {
    throw new Error("Ticket number counter was not created.");
  }
  return `EDU-${FIRST_NUMBER + counter.seq}`;
}
