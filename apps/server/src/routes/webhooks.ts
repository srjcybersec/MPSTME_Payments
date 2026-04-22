import crypto from "node:crypto";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { webhookQueue } from "../jobs/queues.js";

const router = Router();

router.post("/razorpay", async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const eventId = req.headers["x-razorpay-event-id"];
  const rawBody: Buffer = req.body as Buffer;

  if (typeof signature !== "string" || !rawBody) {
    return res.status(400).json({ success: false, error: { code: "INVALID_WEBHOOK", message: "Bad webhook." } });
  }

  const expected = crypto.createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  if (expected !== signature) {
    return res
      .status(401)
      .json({ success: false, error: { code: "INVALID_SIGNATURE", message: "Webhook signature mismatch." } });
  }

  const parsed = JSON.parse(rawBody.toString("utf8")) as { event: string };
  const safeEventId = typeof eventId === "string" ? eventId : crypto.randomUUID();

  const existing = await prisma.webhookEvent.findUnique({
    where: { eventId: safeEventId }
  });
  if (existing) {
    return res.status(200).json({ success: true, data: { duplicate: true } });
  }

  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      provider: "RAZORPAY",
      eventId: safeEventId,
      eventType: parsed.event ?? "unknown",
      payload: parsed
    }
  });

  await webhookQueue.add("process-razorpay-webhook", { webhookEventId: webhookEvent.id });
  return res.status(200).json({ success: true, data: { accepted: true } });
});

export default router;
