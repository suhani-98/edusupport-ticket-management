import { model, Schema } from "mongoose";
import { activityActions } from "../types/domain.js";

const activitySchema = new Schema(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true, enum: activityActions },
    oldValue: { type: String },
    newValue: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activitySchema.index({ ticketId: 1, createdAt: 1 });
activitySchema.index({ actorId: 1, createdAt: 1 });

export const Activity = model("Activity", activitySchema);
