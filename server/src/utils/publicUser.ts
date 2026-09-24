import type { UserRole } from "../models/User.js";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string | null;
  isActive: boolean;
};

export function toPublicUser(user: {
  _id: { toString(): string };
  name: string;
  email: string;
  role: UserRole;
  department?: string | null;
  isActive: boolean;
}): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department ?? null,
    isActive: user.isActive,
  };
}
