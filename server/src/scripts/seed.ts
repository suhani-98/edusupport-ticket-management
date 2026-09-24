import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import { Category } from "../models/Category.js";
import { SLAPolicy } from "../models/SLAPolicy.js";
import { User, type UserRole } from "../models/User.js";
import type { TicketPriority } from "../types/domain.js";
import { hashPassword } from "../utils/password.js";

const categories: Array<{ name: string; defaultPriority: TicketPriority }> = [
  { name: "Fees & Payments", defaultPriority: "MEDIUM" },
  { name: "Attendance", defaultPriority: "MEDIUM" },
  { name: "ID Card", defaultPriority: "MEDIUM" },
  { name: "Certificates & Documents", defaultPriority: "MEDIUM" },
  { name: "Examination", defaultPriority: "MEDIUM" },
  { name: "Hostel", defaultPriority: "MEDIUM" },
  { name: "Technical Support", defaultPriority: "MEDIUM" },
  { name: "Other", defaultPriority: "MEDIUM" },
];

const slaHours: Record<TicketPriority, number> = {
  LOW: 48,
  MEDIUM: 24,
  HIGH: 8,
  CRITICAL: 4,
};

const developmentUsers: Array<{
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: string;
}> = [
  {
    name: "Dev Student",
    email: "student@edusupport.local",
    password: "Student123",
    role: "student",
  },
  {
    name: "Dev Staff",
    email: "staff@edusupport.local",
    password: "Staff1234",
    role: "staff",
    department: "Attendance",
  },
  {
    name: "Dev Manager",
    email: "manager@edusupport.local",
    password: "Manager123",
    role: "manager",
    department: "Student Support",
  },
];

async function seed(): Promise<void> {
  if (env.isProduction) {
    throw new Error("Refusing to seed development data in production.");
  }

  await connectDatabase();
  for (const category of categories) {
    await Category.updateOne(
      { name: category.name },
      { ...category, isActive: true },
      { upsert: true },
    );
    console.log(`Seeded category: ${category.name}`);
  }
  for (const priority of Object.keys(slaHours) as TicketPriority[]) {
    const hours = slaHours[priority];
    await SLAPolicy.updateOne(
      { priority, isActive: true },
      { priority, responseTimeHours: hours, resolutionTimeHours: hours, isActive: true },
      { upsert: true },
    );
    console.log(`Seeded SLA policy: ${priority} ${hours}h`);
  }
  for (const account of developmentUsers) {
    const passwordHash = await hashPassword(account.password);
    await User.updateOne(
      { email: account.email },
      {
        name: account.name,
        email: account.email,
        passwordHash,
        role: account.role,
        department: account.department,
        isActive: true,
      },
      { upsert: true },
    );
    console.log(`Seeded ${account.role}: ${account.email}`);
  }
  await disconnectDatabase();
}

seed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Seed failed";
  console.error(message);
  process.exit(1);
});
