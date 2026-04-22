import http from "node:http";
import { app } from "./app.js";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { initializeSocketServer } from "./socket/server.js";
import { startWorkers } from "./jobs/queues.js";

const server = http.createServer(app);
initializeSocketServer(server);
startWorkers();

server.listen(env.PORT, () => {
  logger.info(`Server listening on port ${env.PORT}`);
  if (
    env.NODE_ENV === "development" &&
    env.FRONTEND_ORIGIN.includes("localhost") &&
    env.RAZORPAY_KEY_ID.startsWith("rzp_live_")
  ) {
    logger.warn(
      "Razorpay LIVE keys with a localhost frontend: add this origin under Dashboard → Account & settings → Websites & API keys (or use rzp_test_* locally). Unlisted sites can break UPI/card checkout."
    );
  }
});
