import { User } from "../models/User.js";

export async function listActiveStaff() {
  const users = await User.find({ role: "staff", isActive: true }).sort({ name: 1 }).select("name email").lean();
  return users.map((user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
  }));
}
