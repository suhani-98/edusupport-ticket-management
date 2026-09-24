import cors from "cors";
import express, { type Express } from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { authRouter } from "./routes/auth.routes.js";
import { healthRouter } from "./routes/health.routes.js";

export function createApp(configure?: (app: Express) => void) {
  const app = express();

  app.use(express.json());
  app.use(
    cors({
      origin: env.clientUrl,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  app.use("/api/v1", healthRouter);
  app.use("/api/v1/auth", authRouter);
  configure?.(app);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
