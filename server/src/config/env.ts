import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT ?? 4000);

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number.isFinite(port) && port > 0 ? port : 4000,
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
};
