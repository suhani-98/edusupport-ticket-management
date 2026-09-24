import { model, Schema, type InferSchemaType } from "mongoose";

export const userRoles = ["student", "staff", "manager"] as const;
export type UserRole = (typeof userRoles)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: userRoles },
    department: { type: String, trim: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

userSchema.index({ role: 1 });

export type UserDocument = InferSchemaType<typeof userSchema>;

export const User = model("User", userSchema);
