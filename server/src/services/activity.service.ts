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

function activityDocument(input: ActivityInput) {
  return {
    ticketId: input.ticketId,
    actorId: input.actorId,
    action: input.action,
    oldValue: input.oldValue ?? undefined,
    newValue: input.newValue ?? undefined,
    metadata: input.metadata,
  };
}

export async function recordActivity(input: ActivityInput): Promise<void> {
  await Activity.create(activityDocument(input));
}

export async function recordActivities(inputs: ActivityInput[]): Promise<void> {
  const createdIds: string[] = [];
  try {
    for (const input of inputs) {
      const activity = await Activity.create(activityDocument(input));
      createdIds.push(activity.id);
    }
  } catch (error) {
    if (createdIds.length > 0) {
      await Activity.deleteMany({ _id: { $in: createdIds } });
    }
    throw error;
  }
}
