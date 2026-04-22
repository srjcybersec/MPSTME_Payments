import pino from "pino";

const baseLoggerConfig = {
  level: process.env.LOG_LEVEL ?? "info"
};

export const logger =
  process.env.NODE_ENV === "development"
    ? pino({
        ...baseLoggerConfig,
        transport: {
          target: "pino-pretty",
          options: { colorize: true }
        }
      })
    : pino(baseLoggerConfig);
