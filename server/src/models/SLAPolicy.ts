import { model, Schema } from "mongoose";
import { ticketPriorities } from "../types/domain.js";

const slaPolicySchema = new Schema(
  {
    priority: { type: String, required: true, enum: ticketPriorities },
    responseTimeHours: { type: Number, required: true, min: 1 },
    resolutionTimeHours: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

slaPolicySchema.index(
  { priority: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);

export const SLAPolicy = model("SLAPolicy", slaPolicySchema);
