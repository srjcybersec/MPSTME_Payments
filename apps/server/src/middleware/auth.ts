import { NextFunction, Request, Response } from "express";
import { failure } from "../lib/api-response.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: "STUDENT" | "VENDOR";
        sessionId: string;
      };
    }
  }
}

export function requireAuth(roles?: Array<"STUDENT" | "VENDOR">) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bearer = req.headers.authorization;
      if (!bearer?.startsWith("Bearer ")) {
        return failure(res, { code: "UNAUTHORIZED", message: "Missing auth token." }, 401);
      }

      const token = bearer.slice("Bearer ".length);
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });

      if (!user || user.isFrozen) {
        return failure(res, { code: "ACCOUNT_BLOCKED", message: "Account is unavailable." }, 403);
      }

      if (roles && !roles.includes(payload.role)) {
        return failure(res, { code: "FORBIDDEN", message: "Insufficient role." }, 403);
      }

      req.user = { id: payload.userId, role: payload.role, sessionId: payload.sessionId };
      return next();
    } catch {
      return failure(res, { code: "UNAUTHORIZED", message: "Invalid auth token." }, 401);
    }
  };
}
