import bcrypt from "bcryptjs";
import { Response, Router } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { failure, success } from "../lib/api-response.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { issueCsrfToken } from "../middleware/csrf.js";
import { redis } from "../lib/redis.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().regex(/@nmims\.edu$/i, "Only NMIMS college emails are allowed."),
  phoneNumber: z.string().min(10).max(15),
  studentId: z.string().min(4),
  password: z.string().min(8)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const verifyEmailSchema = z.object({
  email: z.string().email(),
  token: z.string().min(6)
});

const sendOtpSchema = z.object({
  phoneNumber: z.string().min(10).max(15)
});

const verifyOtpSchema = z.object({
  phoneNumber: z.string().min(10).max(15),
  otp: z.string().length(6)
});

router.get("/csrf-token", issueCsrfToken);

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

router.post("/register", validateBody(registerSchema), async (req, res) => {
  const { email, name, password, phoneNumber, studentId } = req.body;
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      phoneNumber,
      studentId,
      passwordHash,
      role: UserRole.STUDENT
    }
  });

  await prisma.wallet.create({
    data: {
      userId: user.id,
      balancePaise: 0
    }
  });

  const emailToken = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.set(`verify-email:${user.email.toLowerCase()}`, emailToken, "EX", 15 * 60);

  return success(
    res,
    {
      userId: user.id,
      email: user.email,
      message: "Registration successful. Verify email to continue.",
      ...(process.env.NODE_ENV !== "production" ? { verificationToken: emailToken } : {})
    },
    201
  );
});

router.post("/login", validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    return failure(res, { code: "INVALID_CREDENTIALS", message: "Invalid email or password." }, 401);
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    return failure(res, { code: "INVALID_CREDENTIALS", message: "Invalid email or password." }, 401);
  }

  const sessionId = crypto.randomUUID();
  const deviceIdHeader = req.headers["x-device-id"];
  const deviceId = typeof deviceIdHeader === "string" ? deviceIdHeader : null;
  const accessToken = signAccessToken({ userId: user.id, role: user.role, sessionId });
  const refreshToken = signRefreshToken({ userId: user.id, role: user.role, sessionId });

  if (deviceId && !user.deviceId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { deviceId }
    });
  }

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      refreshToken,
      ipAddress: req.ip ?? null,
      userAgent:
        typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  setRefreshCookie(res, refreshToken);
  return success(res, {
    accessToken,
    user: {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name
    }
  });
});

router.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies.refreshToken as string | undefined;
  if (!refreshToken) {
    return failure(res, { code: "UNAUTHORIZED", message: "Missing refresh token." }, 401);
  }

  const payload = verifyRefreshToken(refreshToken);
  const session = await prisma.session.findUnique({ where: { refreshToken } });
  if (!session || session.expiresAt < new Date()) {
    return failure(res, { code: "UNAUTHORIZED", message: "Session expired." }, 401);
  }

  const accessToken = signAccessToken({
    userId: payload.userId,
    role: payload.role,
    sessionId: payload.sessionId
  });
  const nextRefreshToken = signRefreshToken({
    userId: payload.userId,
    role: payload.role,
    sessionId: payload.sessionId
  });

  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshToken: nextRefreshToken,
      lastSeenAt: new Date()
    }
  });

  setRefreshCookie(res, nextRefreshToken);
  return success(res, { accessToken });
});

router.post("/verify-email", validateBody(verifyEmailSchema), async (req, res) => {
  const { email, token } = req.body;
  const stored = await redis.get(`verify-email:${email.toLowerCase()}`);
  if (!stored || stored !== token) {
    return failure(res, { code: "INVALID_TOKEN", message: "Email verification token is invalid." }, 400);
  }

  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { isEmailVerified: true }
  });
  await redis.del(`verify-email:${email.toLowerCase()}`);
  return success(res, { message: "Email verified successfully." });
});

router.post("/send-otp", validateBody(sendOtpSchema), async (req, res) => {
  const { phoneNumber } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.set(`otp:${phoneNumber}`, otp, "EX", 5 * 60);
  // In production, enqueue SMS via Twilio/BullMQ; returning OTP only in non-production.
  return success(res, {
    message: "OTP sent successfully.",
    ...(process.env.NODE_ENV !== "production" ? { otp } : {})
  });
});

router.post("/verify-otp", validateBody(verifyOtpSchema), async (req, res) => {
  const { otp, phoneNumber } = req.body;
  const stored = await redis.get(`otp:${phoneNumber}`);
  if (!stored || stored !== otp) {
    return failure(res, { code: "INVALID_OTP", message: "Incorrect or expired OTP." }, 400);
  }
  await redis.del(`otp:${phoneNumber}`);
  await prisma.user.updateMany({
    where: { phoneNumber },
    data: { isPhoneVerified: true }
  });
  return success(res, { message: "Phone number verified." });
});

router.post("/logout", requireAuth(), async (req, res) => {
  if (!req.user?.sessionId) {
    return failure(res, { code: "UNAUTHORIZED", message: "No active session." }, 401);
  }
  await prisma.session.deleteMany({
    where: {
      id: req.user.sessionId
    }
  });
  res.clearCookie("refreshToken");
  return success(res, { message: "Logged out." });
});

router.get("/sessions", requireAuth(), async (req, res) => {
  const sessions = await prisma.session.findMany({
    where: { userId: req.user!.id },
    select: { id: true, lastSeenAt: true, ipAddress: true, userAgent: true, expiresAt: true }
  });
  return success(res, sessions);
});

router.delete("/sessions/:sessionId", requireAuth(), async (req, res) => {
  const sessionId = String(req.params.sessionId);
  await prisma.session.deleteMany({
    where: { id: sessionId, userId: req.user!.id }
  });
  return success(res, { message: "Session removed." });
});

router.delete("/sessions", requireAuth(), async (req, res) => {
  await prisma.session.deleteMany({
    where: { userId: req.user!.id }
  });
  res.clearCookie("refreshToken");
  return success(res, { message: "All sessions removed." });
});

export default router;
