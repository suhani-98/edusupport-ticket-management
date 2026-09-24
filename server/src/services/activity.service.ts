import { Activity } from "../models/Activity.js";
import type { ActivityAction } from "../types/domain.js";

export type ActivityInput = {
  ticketId: string;
  actorId: string;
  action: ActivityAction;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordActivity(input: ActivityInput): Promise<void> {
  await Activity.create({
    ticketId: input.ticketId,
    actorId: input.actorId,
    action: input.action,
    oldValue: input.oldValue ?? undefined,
    newValue: input.newValue ?? undefined,
    metadata: input.metadata,
  });
}
