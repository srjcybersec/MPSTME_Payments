import { Queue, Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { logger } from "../lib/logger.js";
import { processRazorpayWebhookJob } from "./webhook-worker.js";
import { processScheduledOrderJob } from "./scheduled-order-worker.js";
import { processWalletReconciliationJob } from "./reconciliation-worker.js";

export const webhookQueue = new Queue("razorpay-webhook", {
  connection: redis
});
export const scheduledOrderQueue = new Queue("scheduled-order", {
  connection: redis
});
export const reconciliationQueue = new Queue("wallet-reconciliation", {
  connection: redis
});

export function startWorkers() {
  const webhookWorker = new Worker(
    "razorpay-webhook",
    async (job) => {
      await processRazorpayWebhookJob(job.data as { webhookEventId: string });
    },
    {
      connection: redis,
      concurrency: 10
    }
  );

  webhookWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Webhook job failed");
  });

  const scheduledWorker = new Worker(
    "scheduled-order",
    async (job) => {
      await processScheduledOrderJob(job.data as { orderId: string });
    },
    {
      connection: redis,
      concurrency: 10
    }
  );

  scheduledWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Scheduled order job failed");
  });

  const reconciliationWorker = new Worker(
    "wallet-reconciliation",
    async () => {
      await processWalletReconciliationJob();
    },
    {
      connection: redis,
      concurrency: 1
    }
  );

  reconciliationWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Wallet reconciliation job failed");
  });

  reconciliationQueue
    .add(
      "wallet-reconcile",
      {},
      {
        repeat: { every: 5 * 60 * 1000 },
        removeOnComplete: true,
        removeOnFail: 1000
      }
    )
    .catch((err) => {
      logger.error({ err }, "Failed to schedule reconciliation repeat job");
    });
}
