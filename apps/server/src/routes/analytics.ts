import { PaymentMethod, Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { success } from "../lib/api-response.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function parseRange(query: unknown) {
  const schema = z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional()
  });
  const parsed = schema.parse(query);
  return {
    from: parsed.from ? new Date(parsed.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: parsed.to ? new Date(parsed.to) : new Date()
  };
}

router.get("/revenue", requireAuth(["VENDOR"]), async (req, res) => {
  const { from, to } = parseRange(req.query);
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { not: "CANCELLED" }
    },
    select: { paymentMethod: true, totalAmountPaise: true, createdAt: true }
  });

  const totals = orders.reduce(
    (acc, order) => {
      acc.totalPaise += order.totalAmountPaise;
      if (order.paymentMethod === PaymentMethod.WALLET) acc.walletPaise += order.totalAmountPaise;
      if (order.paymentMethod === PaymentMethod.RAZORPAY) acc.razorpayPaise += order.totalAmountPaise;
      return acc;
    },
    { totalPaise: 0, walletPaise: 0, razorpayPaise: 0 }
  );

  return success(res, { from, to, ...totals, orderCount: orders.length });
});

router.get("/popular-items", requireAuth(["VENDOR"]), async (req, res) => {
  const { from, to } = parseRange(req.query);
  const grouped = await prisma.orderItem.groupBy({
    by: ["menuItemId"],
    where: {
      order: {
        createdAt: { gte: from, lte: to },
        status: { not: "CANCELLED" }
      }
    },
    _sum: {
      quantity: true,
      subtotalPaise: true
    },
    orderBy: {
      _sum: { quantity: "desc" }
    },
    take: 10
  });

  const ids = grouped.map((g) => g.menuItemId);
  const items = await prisma.menuItem.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, categoryId: true }
  });
  const map = new Map(items.map((i) => [i.id, i]));

  return success(
    res,
    grouped.map((g) => ({
      menuItemId: g.menuItemId,
      name: map.get(g.menuItemId)?.name ?? "Unknown",
      quantity: g._sum.quantity ?? 0,
      revenuePaise: g._sum.subtotalPaise ?? 0
    }))
  );
});

router.get("/peak-hours", requireAuth(["VENDOR"]), async (req, res) => {
  const { from, to } = parseRange(req.query);
  const rows = await prisma.$queryRaw<Array<{ hour: number; day: number; count: bigint }>>(Prisma.sql`
    SELECT
      EXTRACT(HOUR FROM "createdAt")::int AS hour,
      EXTRACT(DOW FROM "createdAt")::int AS day,
      COUNT(*)::bigint AS count
    FROM "Order"
    WHERE "createdAt" BETWEEN ${from} AND ${to}
      AND "status" <> 'CANCELLED'
    GROUP BY hour, day
    ORDER BY day ASC, hour ASC
  `);

  return success(
    res,
    rows.map((r) => ({
      hour: r.hour,
      day: r.day,
      count: Number(r.count)
    }))
  );
});

router.get("/students", requireAuth(["VENDOR"]), async (req, res) => {
  const { from, to } = parseRange(req.query);
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { not: "CANCELLED" }
    },
    select: { studentId: true, createdAt: true }
  });

  const uniqueStudents = new Set(orders.map((o) => o.studentId));
  const byDay = new Map<string, Set<string>>();
  for (const order of orders) {
    const dayKey = order.createdAt.toISOString().slice(0, 10);
    if (!byDay.has(dayKey)) {
      byDay.set(dayKey, new Set());
    }
    byDay.get(dayKey)!.add(order.studentId);
  }

  return success(res, {
    activeStudents: uniqueStudents.size,
    dailyActive: Array.from(byDay.entries()).map(([date, ids]) => ({ date, count: ids.size }))
  });
});

export default router;
