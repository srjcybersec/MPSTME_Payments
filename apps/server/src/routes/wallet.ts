import { Router } from "express";
import { WalletTransactionSource, WalletTransactionType } from "@prisma/client";
import { z } from "zod";
import { failure, success } from "../lib/api-response.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { withMutex } from "../lib/mutex.js";
import { createOfflineClientRecordSignature, createOfflineRecordSignature, safeEqualSignature } from "../lib/hmac.js";
import { getSocketIO } from "../socket/io.js";

const router = Router();

router.get("/", requireAuth(["STUDENT"]), async (req, res) => {
  const wallet = await prisma.wallet.upsert({
    where: { userId: req.user!.id },
    create: {
      userId: req.user!.id,
      balancePaise: 0
    },
    update: {},
    include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } }
  });
  return success(res, wallet);
});

const adminAdjustSchema = z.object({
  studentId: z.string().min(1),
  amountPaise: z.number().int(),
  reason: z.string().min(3)
});

router.post("/admin-adjust", requireAuth(["VENDOR"]), validateBody(adminAdjustSchema), async (req, res) => {
  const { studentId, amountPaise, reason } = req.body;
  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: studentId } });

  const updated = await prisma.wallet.update({
    where: { id: wallet.id },
    data: { balancePaise: { increment: amountPaise } }
  });

  await prisma.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: amountPaise >= 0 ? WalletTransactionType.CREDIT : WalletTransactionType.DEBIT,
      amountPaise: Math.abs(amountPaise),
      description: reason,
      source: WalletTransactionSource.MANUAL,
      referenceId: "vendor-adjustment"
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "WALLET_ADMIN_ADJUSTMENT",
      targetType: "WALLET",
      targetId: wallet.id,
      metadata: { studentId, amountPaise, reason }
    }
  });

  return success(res, updated);
});

router.get("/students", requireAuth(["VENDOR"]), async (_req, res) => {
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      studentId: true,
      isFrozen: true,
      wallet: {
        select: {
          balancePaise: true,
          dailyOfflineSpendPaise: true,
          updatedAt: true
        }
      }
    }
  });
  return success(res, students);
});

const freezeStudentSchema = z.object({
  isFrozen: z.boolean()
});

router.patch("/students/:studentId/freeze", requireAuth(["VENDOR"]), validateBody(freezeStudentSchema), async (req, res) => {
  const studentId = String(req.params.studentId);
  const student = await prisma.user.update({
    where: { id: studentId },
    data: { isFrozen: req.body.isFrozen },
    select: {
      id: true,
      name: true,
      email: true,
      isFrozen: true
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: req.body.isFrozen ? "STUDENT_FROZEN" : "STUDENT_UNFROZEN",
      targetType: "USER",
      targetId: student.id
    }
  });

  return success(res, student);
});

const vendorTransactionsQuerySchema = z.object({
  studentId: z.string().optional(),
  source: z.enum(["RAZORPAY", "WALLET_SYNC", "REFUND", "MANUAL"]).optional(),
  take: z.coerce.number().int().min(1).max(200).default(100)
});

router.get("/transactions", requireAuth(["VENDOR"]), async (req, res) => {
  const query = vendorTransactionsQuerySchema.parse(req.query);
  const where = {
    ...(query.source ? { source: query.source } : {}),
    ...(query.studentId ? { wallet: { userId: query.studentId } } : {})
  };
  const transactions = await prisma.walletTransaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: query.take,
    include: {
      wallet: {
        select: {
          id: true,
          userId: true,
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }
    }
  });

  return success(res, transactions);
});

const offlineRecordSchema = z.object({
  localOrderId: z.string().uuid(),
  amountPaise: z.number().int().positive(),
  timestamp: z.string(),
  deviceId: z.string().min(8),
  nonce: z.string().uuid(),
  signature: z.string().min(32)
});

const walletSyncSchema = z.object({
  records: z.array(offlineRecordSchema).max(20)
});

router.post("/sync", requireAuth(["STUDENT"]), validateBody(walletSyncSchema), async (req, res) => {
  const studentId = req.user!.id;
  const records = req.body.records as Array<z.infer<typeof offlineRecordSchema>>;

  if (records.length > 5) {
    await prisma.auditLog.create({
      data: {
        actorId: studentId,
        actorRole: "STUDENT",
        action: "OFFLINE_SYNC_REAUTH_REQUIRED",
        targetType: "USER",
        targetId: studentId,
        metadata: { pendingCount: records.length }
      }
    });
    return failure(
      res,
      { code: "REAUTH_REQUIRED", message: "Too many offline orders queued. Please log in again." },
      401
    );
  }

  const processed = await withMutex(`wallet:sync:${studentId}`, 8000, async () => {
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: studentId } });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: studentId } });
    if (user.isFrozen) {
      return records.map((record) => ({
        localOrderId: record.localOrderId,
        status: "REJECTED",
        failureReason: "WALLET_FROZEN"
      }));
    }

    let runningBalance = wallet.balancePaise;
    let dailySpend = wallet.dailyOfflineSpendPaise;
    const now = new Date();
    const dayStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (wallet.dailyOfflineSpendResetAt < dayStartUtc) {
      dailySpend = 0;
    }

    const results: Array<{ localOrderId: string; status: string; failureReason?: string }> = [];
    let trustedDeviceId = user.deviceId;

    for (const record of records) {
      const recordDate = new Date(record.timestamp);
      if (Number.isNaN(recordDate.getTime()) || Date.now() - recordDate.getTime() > 24 * 60 * 60 * 1000) {
        results.push({
          localOrderId: record.localOrderId,
          status: "REJECTED",
          failureReason: "STALE_OR_INVALID_TIMESTAMP"
        });
        continue;
      }

      if (!trustedDeviceId) {
        await prisma.user.update({
          where: { id: studentId },
          data: { deviceId: record.deviceId }
        });
        trustedDeviceId = record.deviceId;
      }

      if (trustedDeviceId && trustedDeviceId !== record.deviceId) {
        results.push({
          localOrderId: record.localOrderId,
          status: "REJECTED",
          failureReason: "UNRECOGNIZED_DEVICE"
        });
        continue;
      }

      const signedPayload = JSON.stringify({
        localOrderId: record.localOrderId,
        amountPaise: record.amountPaise,
        timestamp: record.timestamp,
        deviceId: record.deviceId,
        nonce: record.nonce
      });
      const expectedServerSignature = createOfflineRecordSignature(signedPayload, req.user!.sessionId);
      const bearerToken = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice("Bearer ".length)
        : null;
      const expectedClientSignature = bearerToken
        ? createOfflineClientRecordSignature(signedPayload, bearerToken)
        : null;
      const isValidSignature =
        safeEqualSignature(expectedServerSignature, record.signature) ||
        (expectedClientSignature ? safeEqualSignature(expectedClientSignature, record.signature) : false);
      if (!isValidSignature) {
        results.push({
          localOrderId: record.localOrderId,
          status: "REJECTED",
          failureReason: "SIGNATURE_MISMATCH"
        });
        continue;
      }

      const existingNonce = await prisma.offlineSyncQueue.findUnique({ where: { nonce: record.nonce } });
      if (existingNonce) {
        results.push({
          localOrderId: record.localOrderId,
          status: "REJECTED",
          failureReason: "NONCE_REPLAY"
        });
        continue;
      }

      if (dailySpend + record.amountPaise > 50000) {
        results.push({
          localOrderId: record.localOrderId,
          status: "FAILED",
          failureReason: "DAILY_OFFLINE_LIMIT_EXCEEDED"
        });
        continue;
      }

      if (runningBalance - record.amountPaise < 0) {
        results.push({
          localOrderId: record.localOrderId,
          status: "FAILED",
          failureReason: "INSUFFICIENT_SERVER_BALANCE"
        });
        continue;
      }

      await prisma.$transaction(async (tx) => {
        await tx.offlineSyncQueue.create({
          data: {
            studentId,
            deviceId: record.deviceId,
            nonce: record.nonce,
            localOrderId: record.localOrderId,
            payload: {
              amountPaise: record.amountPaise,
              timestamp: record.timestamp
            },
            status: "PROCESSED",
            processedAt: new Date()
          }
        });

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balancePaise: { decrement: record.amountPaise },
            dailyOfflineSpendPaise: { increment: record.amountPaise },
            dailyOfflineSpendResetAt: dayStartUtc
          }
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: WalletTransactionType.DEBIT,
            amountPaise: record.amountPaise,
            description: `Offline sync debit ${record.localOrderId}`,
            referenceId: record.localOrderId,
            source: WalletTransactionSource.WALLET_SYNC
          }
        });
      });

      runningBalance -= record.amountPaise;
      dailySpend += record.amountPaise;
      results.push({ localOrderId: record.localOrderId, status: "PROCESSED" });
    }

    return results;
  });

  const updatedWallet = await prisma.wallet.findUnique({ where: { userId: studentId } });
  getSocketIO()?.to(`student:${studentId}`).emit("wallet:balance_updated", {
    newBalance: updatedWallet?.balancePaise ?? 0
  });
  for (const result of processed) {
    getSocketIO()?.to(`student:${studentId}`).emit("order:sync_result", result);
  }

  return success(res, { results: processed, newBalance: updatedWallet?.balancePaise ?? 0 });
});

export default router;
