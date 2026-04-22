import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";
import { failure } from "../lib/api-response.js";

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return failure(
        res,
        {
          code: "VALIDATION_ERROR",
          message: parsed.error.errors.map((issue) => issue.message).join(", ")
        },
        422
      );
    }

    req.body = parsed.data;
    return next();
  };
}
