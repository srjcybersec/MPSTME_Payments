import { Response } from "express";

type ErrorPayload = {
  code: string;
  message: string;
};

export function success<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({
    success: true,
    data
  });
}

export function failure(res: Response, error: ErrorPayload, status = 400) {
  return res.status(status).json({
    success: false,
    error
  });
}
