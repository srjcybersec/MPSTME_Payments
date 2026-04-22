import crypto from "node:crypto";
import { NextFunction, Request, Response } from "express";
import { failure, success } from "../lib/api-response.js";
import { env } from "../lib/env.js";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function issueCsrfToken(req: Request, res: Response) {
  const sessionSeed = req.cookies.refreshToken ?? "guest";
  const token = crypto.createHmac("sha256", env.CSRF_SECRET).update(String(sessionSeed)).digest("hex");

  res.cookie("csrfToken", token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return success(res, { csrfToken: token });
}

export function requireCsrf(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method)) {
    return next();
  }

  // Webhook calls come from Razorpay and do not include CSRF headers.
  if (req.path.startsWith("/api/webhooks")) {
    return next();
  }

  // Auth bootstrap endpoints must work before a CSRF token exists.
  if (req.path === "/api/auth/login" || req.path === "/api/auth/register" || req.path === "/api/auth/refresh") {
    return next();
  }

  const cookieToken = req.cookies.csrfToken as string | undefined;
  const headerToken = req.headers["x-csrf-token"];
  const normalizedHeader = typeof headerToken === "string" ? headerToken : undefined;

  if (!cookieToken || !normalizedHeader || cookieToken !== normalizedHeader) {
    return failure(res, { code: "CSRF_VALIDATION_FAILED", message: "Invalid CSRF token." }, 403);
  }

  return next();
}
