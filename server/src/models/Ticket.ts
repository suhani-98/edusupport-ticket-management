import { model, Schema } from "mongoose";
import {
  DESCRIPTION_MAX_LENGTH,
  RESOLUTION_MAX_LENGTH,
  SUBJECT_MAX_LENGTH,
  slaStatuses,
  ticketPriorities,
  ticketStatuses,
} from "../types/domain.js";

const ticketSchema = new Schema(
  {
    ticketNumber: { type: String, required: true, unique: true, trim: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    subject: { type: String, required: true, trim: true, maxlength: SUBJECT_MAX_LENGTH },
    description: { type: String, required: true, trim: true, maxlength: DESCRIPTION_MAX_LENGTH },
    priority: { type: String, required: true, enum: ticketPriorities },
    status: { type: String, required: true, enum: ticketStatuses },
    slaPolicyId: { type: Schema.Types.ObjectId, ref: "SLAPolicy", required: true },
    slaDeadline: { type: Date, required: true },
    slaStatus: { type: String, required: true, enum: slaStatuses },
    escalationLevel: { type: Number, required: true, default: 0, min: 0 },
    resolution: { type: String, trim: true, maxlength: RESOLUTION_MAX_LENGTH },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
  },
  { timestamps: true },
);

ticketSchema.index({ status: 1 });
ticketSchema.index({ studentId: 1, status: 1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ slaStatus: 1, slaDeadline: 1 });
ticketSchema.index({ categoryId: 1, status: 1 });
ticketSchema.index({ priority: 1, status: 1 });
ticketSchema.index({ createdAt: -1 });

export const Ticket = model("Ticket", ticketSchema);
