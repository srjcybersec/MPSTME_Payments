import { WalletTransactionSource, WalletTransactionType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { getSocketIO } from "../socket/io.js";
import { redis } from "../lib/redis.js";
import { createConfirmedRazorpayOrder } from "../services/order-service.js";

type RazorpayCapturedPayload = {
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        notes?: {
          userId?: string;
          purpose?: string;
        };
      };
    };
  };
};

export async function processRazorpayWebhookJob(data: { webhookEventId: string }) {
  const webhookEvent = await prisma.webhookEvent.findUnique({
    where: { id: data.webhookEventId }
  });
  if (!webhookEvent || webhookEvent.processedAt) {
    return;
  }

  if (webhookEvent.eventType !== "payment.captured") {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processedAt: new Date() }
    });
    return;
  }

  const payload = webhookEvent.payload as RazorpayCapturedPayload;
  const payment = payload.payload?.payment?.entity;
  const paymentId = payment?.id;
  const razorpayOrderId = payment?.order_id;
  const amountPaise = payment?.amount;
  const userId = payment?.notes?.userId;
  const purpose = payment?.notes?.purpose;

  if (!paymentId || !amountPaise || !userId) {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processedAt: new Date() }
    });
    return;
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet && purpose === "WALLET_TOPUP") {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processedAt: new Date() }
    });
    return;
  }
  if (!wallet && purpose !== "ORDER_DIRECT") {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processedAt: new Date() }
    });
    return;
  }

  if (purpose === "ORDER_DIRECT" && razorpayOrderId) {
    const existingOrder = await prisma.order.findFirst({
      where: {
        studentId: userId,
        paymentMethod: "RAZORPAY",
        orderNotes: { contains: paymentId }
      }
    });
    if (!existingOrder) {
      const intentRaw = await redis.get(`payment:intent:${razorpayOrderId}`);
      if (intentRaw) {
        const intent = JSON.parse(intentRaw) as {
          userId: string;
          amountPaise: number;
          orderIntent: {
            items: Array<{ menuItemId: string; quantity: number }>;
            orderNotes?: string;
            targetPickupTime?: string;
          };
        };
        try {
          const created = await createConfirmedRazorpayOrder(
            intent.userId,
            intent.orderIntent.items,
            `${intent.orderIntent.orderNotes ?? ""} | rzpay:${paymentId}`.trim(),
            intent.orderIntent.targetPickupTime
          );
          getSocketIO()?.to("vendor").emit("order:new", { order: created });
          getSocketIO()?.to(`student:${intent.userId}`).emit("order:status_changed", {
            orderId: created.id,
            newStatus: created.status,
            estimatedWait: 15
          });
          await redis.del(`payment:intent:${razorpayOrderId}`);
        } catch (error) {
          await prisma.auditLog.create({
            data: {
              actorRole: "SYSTEM",
              action: "ORDER_DIRECT_CAPTURE_PROCESSING_FAILED",
              targetType: "PAYMENT",
              targetId: paymentId,
              metadata: {
                razorpayOrderId,
                userId: intent.userId,
                reason: error instanceof Error ? error.message : "UNKNOWN"
              }
            }
          });
        }
      }
    }
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processedAt: new Date() }
    });
    return;
  }

  const existingTx = await prisma.walletTransaction.findFirst({
    where: { referenceId: paymentId, source: WalletTransactionSource.RAZORPAY }
  });

  if (!existingTx) {
    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet!.id },
        data: { balancePaise: { increment: amountPaise } }
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet!.id,
          type: WalletTransactionType.CREDIT,
          amountPaise,
          description: "Razorpay wallet top-up",
          referenceId: paymentId,
          source: WalletTransactionSource.RAZORPAY
        }
      });
      await tx.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processedAt: new Date() }
      });
    });
  } else {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processedAt: new Date() }
    });
  }

  const refreshedWallet = await prisma.wallet.findUnique({ where: { id: wallet!.id } });
  getSocketIO()?.to(`student:${userId}`).emit("wallet:balance_updated", {
    newBalance: refreshedWallet?.balancePaise ?? wallet!.balancePaise
  });
}
