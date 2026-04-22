import { Router } from "express";
import { z } from "zod";
import { success, failure } from "../lib/api-response.js";
import { razorpay } from "../lib/razorpay.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { redis, tryRedis } from "../lib/redis.js";

const router = Router();
const RAZORPAY_ORDER_TIMEOUT_MS = 12000;

const createPaymentOrderSchema = z.object({
  amountPaise: z.number().int().min(100).max(200000),
  purpose: z.enum(["WALLET_TOPUP", "ORDER_DIRECT"]).default("WALLET_TOPUP"),
  orderIntent: z
    .object({
      items: z.array(z.object({ menuItemId: z.string().min(1), quantity: z.number().int().min(1).max(10) })).min(1),
      orderNotes: z.string().max(200).optional(),
      targetPickupTime: z.string().datetime().optional()
    })
    .optional()
});

router.post("/create-order", requireAuth(["STUDENT"]), validateBody(createPaymentOrderSchema), async (req, res) => {
  try {
    const idempotencyKey = req.headers["x-idempotency-key"];
    if (typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
      return failure(
        res,
        { code: "IDEMPOTENCY_KEY_REQUIRED", message: "x-idempotency-key header is required." },
        400
      );
    }

    const existing = await tryRedis(() => redis.get(`payment:idem:${idempotencyKey}`));
    if (existing) {
      return success(res, JSON.parse(existing));
    }

    const { amountPaise, purpose, orderIntent } = req.body;
    if (purpose === "ORDER_DIRECT" && !orderIntent) {
      return failure(
        res,
        { code: "ORDER_INTENT_REQUIRED", message: "orderIntent is required for direct order payments." },
        400
      );
    }

    const compactUserId = req.user!.id.replace(/[^a-zA-Z0-9]/g, "").slice(-10);
    const receiptId = `rcpt_${compactUserId}_${Date.now().toString(36)}`.slice(0, 40);

    const order = await Promise.race([
      razorpay.orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt: receiptId,
        notes: {
          userId: req.user!.id,
          purpose
        }
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Razorpay order creation timed out.")), RAZORPAY_ORDER_TIMEOUT_MS);
      })
    ]);

    if (purpose === "ORDER_DIRECT" && orderIntent) {
      const cached = await tryRedis(() =>
        redis.set(
          `payment:intent:${order.id}`,
          JSON.stringify({
            userId: req.user!.id,
            purpose,
            amountPaise,
            orderIntent
          }),
          "EX",
          30 * 60
        )
      );
      if (cached === null) {
        console.warn("Redis unavailable or slow: skipped payment intent cache");
      }
    }

    const response = {
      razorpayOrderId: order.id,
      amountPaise: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    };

    const idemWritten = await tryRedis(() =>
      redis.set(`payment:idem:${idempotencyKey}`, JSON.stringify(response), "EX", 24 * 60 * 60)
    );
    if (idemWritten === null) {
      console.warn("Redis unavailable or slow: skipped idempotency write");
    }
    return success(res, response, 201);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "error" in error
          ? JSON.stringify((error as { error: unknown }).error)
          : "Payment gateway unavailable";
    return failure(
      res,
      { code: "PAYMENT_GATEWAY_ERROR", message: `Unable to create payment order. ${message}` },
      502
    );
  }
});

export default router;
