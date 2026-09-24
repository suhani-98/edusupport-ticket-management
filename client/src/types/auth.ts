export const roles = ["student", "staff", "manager"] as const;

export type Role = (typeof roles)[number];

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string | null;
  isActive: boolean;
};

export const roleLabels: Record<Role, string> = {
  student: "Student",
  staff: "Staff",
  manager: "Manager",
};

export function homePath(role: Role): string {
  return `/${role}`;
}

export function isRole(value: string): value is Role {
  return roles.some((role) => role === value);
}
