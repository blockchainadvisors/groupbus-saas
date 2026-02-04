import { Worker, Job } from "bullmq";
import { getRedisConnection, closeRedisConnection } from "../shared/queue";
import { createChildLogger } from "../shared/logger";
import prisma from "../shared/prisma";

const log = createChildLogger("notification");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------

async function processJob(job: Job<NotificationJobData>) {
  const { userId, type, title, message, link, metadata } = job.data;

  log.info({ jobId: job.id, userId, type, title }, "Processing notification job");

  // Create the notification record and mark as SENT (delivered)
  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      channel: "IN_APP",
      status: "SENT",
      link: link ?? null,
      sentAt: new Date(),
      metadata: (metadata ?? undefined) as undefined | Record<string, string | number | boolean | null>,
    },
  });

  log.info(
    { jobId: job.id, notificationId: notification.id, userId, type },
    "Notification created and marked as SENT",
  );

  return { notificationId: notification.id };
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

const connection = getRedisConnection();

const worker = new Worker<NotificationJobData>("notifications", processJob, {
  connection,
  concurrency: 10,
});

worker.on("completed", (job) => {
  log.info({ jobId: job.id, name: job.name }, "Job completed");
});

worker.on("failed", (job, err) => {
  log.error({ jobId: job?.id, name: job?.name, err: err.message }, "Job failed");
});

worker.on("error", (err) => {
  log.error({ err: err.message }, "Worker error");
});

log.info("Notification worker started and listening for jobs...");

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(signal: string) {
  log.info({ signal }, "Shutting down notification worker...");
  await worker.close();
  await prisma.$disconnect();
  await closeRedisConnection();
  log.info("Notification worker shut down cleanly");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
