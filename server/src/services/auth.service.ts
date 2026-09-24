import { User, type UserRole } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { toPublicUser, type PublicUser } from "../utils/publicUser.js";
import { signAccessToken } from "../utils/token.js";

const INVALID_LOGIN = new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");

export async function registerStudent(input: {
  name: string;
  email: string;
  password: string;
}): Promise<PublicUser> {
  const existing = await User.findOne({ email: input.email }).select("_id");
  if (existing) {
    throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists.");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: "student" satisfies UserRole,
    isActive: true,
  });

  return toPublicUser(user);
}

export async function login(input: { email: string; password: string }): Promise<{
  token: string;
  user: PublicUser;
}> {
  const user = await User.findOne({ email: input.email }).select("+passwordHash");
  if (!user || !user.isActive) {
    throw INVALID_LOGIN;
  }

  const matches = await verifyPassword(input.password, user.passwordHash);
  if (!matches) {
    throw INVALID_LOGIN;
  }

  const publicUser = toPublicUser(user);
  const token = signAccessToken({ userId: publicUser.id, role: publicUser.role });
  return { token, user: publicUser };
}
