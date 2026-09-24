import dotenv from "dotenv";

dotenv.config();

function readString(name: string, fallback?: string): string {
  const value = process.env[name]?.trim() || fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV?.trim() || "development";
const isProduction = nodeEnv === "production";

const portValue = Number(process.env.PORT ?? 4000);
const port = Number.isInteger(portValue) && portValue > 0 ? portValue : 4000;

export const env = {
  nodeEnv,
  isProduction,
  port,
  mongodbUri: readString(
    "MONGODB_URI",
    isProduction ? undefined : "mongodb://localhost:27017/edusupport",
  ),
  jwtSecret: readString("JWT_SECRET"),
  clientUrl: readString("CLIENT_URL", isProduction ? undefined : "http://localhost:5173"),
};
