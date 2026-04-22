"use client";

import type { OfflineQueueRecord } from "./queue";

export function getDayStartUtcMs(nowMs: number) {
  const now = new Date(nowMs);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime();
}

export function calculateOfflineSpendTodayPaise(records: OfflineQueueRecord[], nowMs = Date.now()) {
  const dayStart = getDayStartUtcMs(nowMs);
  return records
    .filter((record) => {
      const ts = new Date(record.timestamp).getTime();
      return Number.isFinite(ts) && ts >= dayStart;
    })
    .reduce((sum, record) => sum + record.amountPaise, 0);
}

export function canQueueOfflineOrder(params: {
  localBalancePaise: number;
  orderAmountPaise: number;
  spentTodayPaise: number;
  dailyLimitPaise?: number;
}) {
  const limit = params.dailyLimitPaise ?? 50000;
  const hasBalance = params.localBalancePaise >= params.orderAmountPaise;
  const withinDailyLimit = params.spentTodayPaise + params.orderAmountPaise <= limit;
  return {
    allowed: hasBalance && withinDailyLimit,
    hasBalance,
    withinDailyLimit
  };
}

export function getProcessedLocalOrderIds(
  results: Array<{ localOrderId: string; status: string }>
) {
  return new Set(results.filter((result) => result.status === "PROCESSED").map((result) => result.localOrderId));
}
