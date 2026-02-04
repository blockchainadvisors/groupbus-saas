import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  base: {
    service: process.env.PM2_PROCESS_NAME || "gb-worker",
  },
});

export default logger;

export function createChildLogger(name: string) {
  return logger.child({ worker: name });
}
