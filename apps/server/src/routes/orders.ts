import { OrderStatus, PaymentMethod, WalletTransactionSource, WalletTransactionType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { failure, success } from "../lib/api-response.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { withMutex } from "../lib/mutex.js";
import { getSocketIO } from "../socket/io.js";
import { createQrSignature } from "../lib/hmac.js";
import { scheduledOrderQueue } from "../jobs/queues.js";
import { createConfirmedWalletOrder } from "../services/order-service.js";
import { razorpay } from "../lib/razorpay.js";

const router = Router();

async function cancelOrderWithRefund(
  orderId: string,
  actor: { id: string; role: "STUDENT" | "VENDOR" },
  reason: string
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return { status: "NOT_FOUND" as const };
  }
  if (order.status === OrderStatus.CANCELLED) {
    return { status: "ALREADY_CANCELLED" as const, order };
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.CANCELLED }
    });

    if (order.paymentMethod === PaymentMethod.WALLET) {
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: order.studentId } });
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balancePaise: { increment: order.totalAmountPaise } }
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.CREDIT,
          amountPaise: order.totalAmountPaise,
          description: `Refund for cancelled order ${order.id}`,
          referenceId: order.id,
          source: WalletTransactionSource.REFUND
        }
      });
    }
  });

  if (order.paymentMethod === PaymentMethod.RAZORPAY) {
    const rzpayMatch = order.orderNotes?.match(/rzpay:([a-zA-Z0-9_]+)/);
    if (rzpayMatch?.[1]) {
      try {
        await razorpay.payments.refund(rzpayMatch[1], {
          amount: order.totalAmountPaise,
          notes: { orderId: order.id, reason }
        });
      } catch {
        await prisma.auditLog.create({
          data: {
            actorId: actor.id,
            actorRole: actor.role,
            action: "RAZORPAY_REFUND_FAILED",
            targetType: "ORDER",
            targetId: order.id,
            metadata: { paymentReference: rzpayMatch[1], reason }
          }
        });
      }
    }
  }

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: actor.role === "VENDOR" ? "ORDER_CANCELLED_BY_VENDOR" : "ORDER_CANCELLED_BY_STUDENT",
      targetType: "ORDER",
      targetId: order.id,
      metadata: { paymentMethod: order.paymentMethod, reason }
    }
  });

  getSocketIO()?.to(`student:${order.studentId}`).emit("order:status_changed", {
    orderId: order.id,
    newStatus: OrderStatus.CANCELLED
  });

  return { status: "CANCELLED" as const, order };
}

const createOrderSchema = z.object({
  items: z.array(z.object({ menuItemId: z.string().min(1), quantity: z.number().int().min(1).max(10) })).min(1),
  paymentMethod: z.enum(["WALLET", "RAZORPAY"]).default("WALLET"),
  orderNotes: z.string().max(200).optional(),
  targetPickupTime: z.string().datetime().optional()
});

router.post("/", requireAuth(["STUDENT"]), validateBody(createOrderSchema), async (req, res) => {
  if (req.body.paymentMethod !== PaymentMethod.WALLET) {
    return failure(res, { code: "PAYMENT_METHOD_NOT_READY", message: "Direct Razorpay order flow pending." }, 501);
  }

  const studentId = req.user!.id;
  try {
    const result = await withMutex(`wallet:lock:${studentId}`, 5000, async () => {
      const result = await createConfirmedWalletOrder(
        studentId,
        req.body.items as Array<{ menuItemId: string; quantity: number }>,
        req.body.orderNotes,
        req.body.targetPickupTime
      );

      if (result.status !== "ORDER_CREATED") {
        return result;
      }

      if (result.order.targetPickupTime) {
        const menuIds = result.order.items.map((item) => item.menuItemId);
        const menuItems = await prisma.menuItem.findMany({ where: { id: { in: menuIds } } });
        const map = new Map(menuItems.map((m) => [m.id, m]));
        const maxPrep = Math.max(
          ...result.order.items.map((item) => {
            const menu = map.get(item.menuItemId);
            return menu?.preparationTimeMinutes ?? 10;
          }),
          10
        );
        const prepareAt = new Date(result.order.targetPickupTime.getTime() - maxPrep * 60 * 1000);
        const delay = Math.max(0, prepareAt.getTime() - Date.now());
        await scheduledOrderQueue.add(
          "prepare-scheduled-order",
          { orderId: result.order.id },
          { delay, removeOnComplete: true, removeOnFail: 1000 }
        );
      }

      return result;
    });

    if (result.status === "REJECTED_ALL") {
      return failure(res, { code: "OUT_OF_STOCK", message: "Selected items are unavailable." }, 409);
    }
    if (result.status === "INSUFFICIENT_BALANCE") {
      return failure(res, { code: "INSUFFICIENT_BALANCE", message: "Wallet balance is insufficient." }, 409);
    }

    getSocketIO()?.to("vendor").emit("order:new", { order: result.order });
    getSocketIO()?.to(`student:${studentId}`).emit("order:status_changed", {
      orderId: result.order.id,
      newStatus: result.order.status,
      estimatedWait: 15
    });

    return success(
      res,
      {
        order: result.order,
        unavailableItems: result.rejected
      },
      result.rejected.length > 0 ? 207 : 201
    );
  } catch (error) {
    if (error instanceof Error && error.message === "RESOURCE_LOCKED") {
      return failure(res, { code: "ORDER_IN_PROGRESS", message: "Another order is currently processing." }, 409);
    }
    throw error;
  }
});

router.get("/", requireAuth(["STUDENT"]), async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { studentId: req.user!.id },
    orderBy: { createdAt: "desc" },
    include: { items: true }
  });
  return success(res, orders);
});

router.get("/queue", requireAuth(["VENDOR"]), async (_req, res) => {
  const orders = await prisma.order.findMany({
    where: { status: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY] } },
    orderBy: { createdAt: "asc" },
    include: { items: true, student: { select: { id: true, name: true } } }
  });
  return success(res, orders);
});

const vendorHistoryQuerySchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PREPARING", "READY", "COLLECTED", "CANCELLED"]).optional(),
  take: z.coerce.number().int().min(1).max(200).default(100)
});

router.get("/vendor/history", requireAuth(["VENDOR"]), async (req, res) => {
  const query = vendorHistoryQuerySchema.parse(req.query);
  const where = query.status ? { status: query.status } : {};
  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: query.take,
    include: {
      items: true,
      receipt: true,
      student: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
  return success(res, orders);
});

router.get("/:id", requireAuth(["STUDENT", "VENDOR"]), async (req, res) => {
  const id = String(req.params.id);
  const where =
    req.user!.role === "VENDOR"
      ? { id }
      : {
          id,
          studentId: req.user!.id
        };
  const order = await prisma.order.findFirst({
    where,
    include: { items: true, receipt: true }
  });
  if (!order) {
    return failure(res, { code: "NOT_FOUND", message: "Order not found." }, 404);
  }

  if (!order.receipt) {
    const payload = JSON.stringify({
      orderId: order.id,
      studentId: order.studentId,
      timestamp: Date.now()
    });
    const signature = createQrSignature(payload);
    const receipt = await prisma.receipt.create({
      data: {
        orderId: order.id,
        qrCodeData: JSON.stringify({ payload, signature })
      }
    });
    return success(res, { ...order, receipt });
  }

  return success(res, order);
});

router.delete("/:id/cancel", requireAuth(["STUDENT"]), async (req, res) => {
  const id = String(req.params.id);
  const order = await prisma.order.findFirst({
    where: { id, studentId: req.user!.id },
    include: { items: true }
  });
  if (!order) {
    return failure(res, { code: "NOT_FOUND", message: "Order not found." }, 404);
  }
  if (!(order.status === OrderStatus.PENDING || order.status === OrderStatus.CONFIRMED)) {
    return failure(res, { code: "INVALID_STATE", message: "Order cannot be cancelled now." }, 409);
  }

  await cancelOrderWithRefund(order.id, { id: req.user!.id, role: req.user!.role }, "Student cancelled order");

  return success(res, { message: "Order cancelled and refunded." });
});

router.delete("/:id/vendor-cancel", requireAuth(["VENDOR"]), async (req, res) => {
  const id = String(req.params.id);
  const result = await cancelOrderWithRefund(id, { id: req.user!.id, role: req.user!.role }, "Vendor cancelled order");
  if (result.status === "NOT_FOUND") {
    return failure(res, { code: "NOT_FOUND", message: "Order not found." }, 404);
  }
  if (result.status === "ALREADY_CANCELLED") {
    return success(res, { message: "Order already cancelled." });
  }
  return success(res, { message: "Order cancelled by vendor and refund initiated." });
});

const updateStatusSchema = z.object({
  status: z.enum(["PREPARING", "READY", "COLLECTED", "READY_REVERT", "CANCELLED"])
});

router.patch("/:id/status", requireAuth(["VENDOR"]), validateBody(updateStatusSchema), async (req, res) => {
  const id = String(req.params.id);
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return failure(res, { code: "NOT_FOUND", message: "Order not found." }, 404);
  }

  const desired = req.body.status as "PREPARING" | "READY" | "COLLECTED" | "READY_REVERT" | "CANCELLED";
  if (desired === "CANCELLED") {
    const cancelled = await cancelOrderWithRefund(id, { id: req.user!.id, role: req.user!.role }, "Vendor status cancellation");
    if (cancelled.status === "NOT_FOUND") {
      return failure(res, { code: "NOT_FOUND", message: "Order not found." }, 404);
    }
    return success(res, { message: "Order cancelled by vendor and refund initiated." });
  }
  let nextStatus: OrderStatus | null = null;
  if (desired === "PREPARING" && order.status === OrderStatus.CONFIRMED) {
    nextStatus = OrderStatus.PREPARING;
  }
  if (desired === "READY" && (order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.PREPARING)) {
    nextStatus = OrderStatus.READY;
  }
  if (desired === "COLLECTED" && order.status === OrderStatus.READY) {
    nextStatus = OrderStatus.COLLECTED;
  }
  if (desired === "READY_REVERT" && order.status === OrderStatus.COLLECTED && order.collectedAt) {
    const within2Minutes = Date.now() - order.collectedAt.getTime() <= 2 * 60 * 1000;
    if (within2Minutes) {
      nextStatus = OrderStatus.READY;
    }
  }

  if (!nextStatus) {
    return failure(res, { code: "INVALID_STATE_TRANSITION", message: "Invalid status transition." }, 409);
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: nextStatus,
      readyAt: nextStatus === OrderStatus.READY ? new Date() : order.readyAt,
      collectedAt: nextStatus === OrderStatus.COLLECTED ? new Date() : nextStatus === OrderStatus.READY ? null : order.collectedAt
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "ORDER_STATUS_UPDATED",
      targetType: "ORDER",
      targetId: id,
      metadata: { previousStatus: order.status, nextStatus }
    }
  });

  getSocketIO()?.to(`student:${updated.studentId}`).emit("order:status_changed", {
    orderId: updated.id,
    newStatus: updated.status,
    estimatedWait: updated.status === OrderStatus.READY ? 0 : 10
  });
  if (updated.status === OrderStatus.READY) {
    getSocketIO()?.to(`student:${updated.studentId}`).emit("order:ready", {
      orderId: updated.id,
      qrCodeData: (await prisma.receipt.findUnique({ where: { orderId: updated.id } }))?.qrCodeData ?? null
    });
  }

  return success(res, updated);
});

const collectSchema = z.object({
  qrCodeData: z.string().min(10)
});

router.post("/:id/collect", requireAuth(["VENDOR"]), validateBody(collectSchema), async (req, res) => {
  const id = String(req.params.id);
  const order = await prisma.order.findUnique({
    where: { id },
    include: { receipt: true }
  });
  if (!order || !order.receipt) {
    return failure(res, { code: "NOT_FOUND", message: "Order receipt not found." }, 404);
  }
  if (order.status !== OrderStatus.READY) {
    return failure(res, { code: "INVALID_STATE", message: "Order is not ready for collection." }, 409);
  }

  let incoming: { payload: string; signature: string };
  try {
    incoming = JSON.parse(req.body.qrCodeData) as { payload: string; signature: string };
  } catch {
    return failure(res, { code: "INVALID_QR", message: "Malformed QR payload." }, 401);
  }
  const expectedSignature = createQrSignature(incoming.payload);
  if (incoming.signature !== expectedSignature || order.receipt.qrCodeData !== req.body.qrCodeData) {
    return failure(res, { code: "INVALID_QR", message: "QR data mismatch." }, 401);
  }
  const parsedPayload = JSON.parse(incoming.payload) as { orderId: string; studentId: string; timestamp: number };
  if (parsedPayload.orderId !== order.id || parsedPayload.studentId !== order.studentId) {
    return failure(res, { code: "INVALID_QR", message: "QR payload does not match order." }, 401);
  }
  if (Date.now() - parsedPayload.timestamp > 24 * 60 * 60 * 1000) {
    return failure(res, { code: "EXPIRED_QR", message: "QR payload expired." }, 401);
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: OrderStatus.COLLECTED,
      collectedAt: new Date()
    }
  });

  getSocketIO()?.to(`student:${updated.studentId}`).emit("order:status_changed", {
    orderId: updated.id,
    newStatus: OrderStatus.COLLECTED
  });
  return success(res, updated);
});

export default router;
