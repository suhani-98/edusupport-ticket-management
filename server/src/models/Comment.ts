import { model, Schema } from "mongoose";
import { COMMENT_MAX_LENGTH, commentTypes } from "../types/domain.js";

const commentSchema = new Schema(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true, trim: true, maxlength: COMMENT_MAX_LENGTH },
    type: { type: String, required: true, enum: commentTypes },
  },
  { timestamps: true },
);

commentSchema.index({ ticketId: 1, createdAt: 1 });
commentSchema.index({ authorId: 1, createdAt: 1 });

export const Comment = model("Comment", commentSchema);
