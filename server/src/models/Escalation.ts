import { model, Schema } from "mongoose";
import { ESCALATION_REASON_MAX_LENGTH, escalationLevels, escalationStatuses } from "../types/domain.js";

const escalationSchema = new Schema(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true },
    triggeredBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true, trim: true, maxlength: ESCALATION_REASON_MAX_LENGTH },
    previousAssignee: { type: Schema.Types.ObjectId, ref: "User" },
    newAssignee: { type: Schema.Types.ObjectId, ref: "User" },
    level: { type: String, required: true, enum: escalationLevels },
    status: { type: String, required: true, enum: escalationStatuses, default: "OPEN" },
    resolvedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

escalationSchema.index({ ticketId: 1, createdAt: 1 });
escalationSchema.index({ ticketId: 1, status: 1 });
escalationSchema.index(
  { ticketId: 1, level: 1 },
  { unique: true, partialFilterExpression: { status: "OPEN" } },
);

export const Escalation = model("Escalation", escalationSchema);
