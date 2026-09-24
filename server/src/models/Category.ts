import { model, Schema } from "mongoose";
import {
  CATEGORY_DESCRIPTION_MAX_LENGTH,
  CATEGORY_NAME_MAX_LENGTH,
  ticketPriorities,
} from "../types/domain.js";

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: CATEGORY_NAME_MAX_LENGTH,
    },
    description: { type: String, trim: true, maxlength: CATEGORY_DESCRIPTION_MAX_LENGTH },
    defaultPriority: { type: String, required: true, enum: ticketPriorities },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

categorySchema.index({ isActive: 1, name: 1 });

export const Category = model("Category", categorySchema);
