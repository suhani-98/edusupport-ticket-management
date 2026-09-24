import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import { User, type UserRole } from "../models/User.js";
import { hashPassword } from "../utils/password.js";

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
    throw new Error("Refusing to seed development users in production.");
  }

  await connectDatabase();
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
