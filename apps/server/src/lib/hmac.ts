import crypto from "node:crypto";
import { env } from "./env.js";

export function createOfflineRecordSignature(input: string, sessionId: string) {
  return crypto.createHmac("sha256", `${env.JWT_ACCESS_SECRET}:${sessionId}`).update(input).digest("hex");
}

export function createOfflineClientRecordSignature(input: string, bearerToken: string) {
  return crypto.createHmac("sha256", `${env.JWT_ACCESS_SECRET}:${bearerToken}`).update(input).digest("hex");
}

export function safeEqualSignature(a: string, b: string) {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function createQrSignature(payload: string) {
  return crypto.createHmac("sha256", env.JWT_REFRESH_SECRET).update(payload).digest("hex");
}
