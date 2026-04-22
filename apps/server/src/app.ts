import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.js";
import healthRoutes from "./routes/health.js";
import menuRoutes from "./routes/menu.js";
import walletRoutes from "./routes/wallet.js";
import paymentsRoutes from "./routes/payments.js";
import webhooksRoutes from "./routes/webhooks.js";
import ordersRoutes from "./routes/orders.js";
import analyticsRoutes from "./routes/analytics.js";
import { env } from "./lib/env.js";
import { failure } from "./lib/api-response.js";
import { logger } from "./lib/logger.js";
import { requireCsrf } from "./middleware/csrf.js";

export const app = express();

app.use((pinoHttp as unknown as (options: { logger: typeof logger }) => express.RequestHandler)({ logger }));
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true
  })
);
app.use("/api/webhooks/razorpay", express.raw({ type: "*/*" }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(requireCsrf);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api", apiLimiter);
app.use("/api/health", healthRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/webhooks", webhooksRoutes);

app.use((_req, res) => {
  return failure(res, { code: "NOT_FOUND", message: "Route not found." }, 404);
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, "Unhandled error");
  return failure(res, { code: "INTERNAL_SERVER_ERROR", message: "Unexpected server error." }, 500);
});
