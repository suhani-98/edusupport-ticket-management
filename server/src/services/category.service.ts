import { Category } from "../models/Category.js";
import type { UserRole } from "../models/User.js";

export async function listCategories(role: UserRole) {
  const filter = role === "manager" ? {} : { isActive: true };
  const rows = await Category.find(filter).sort({ name: 1 }).lean();
  return rows.map((row) => ({
    id: row._id.toString(),
    name: row.name,
    description: row.description ?? null,
    defaultPriority: row.defaultPriority,
    isActive: row.isActive,
  }));
}
