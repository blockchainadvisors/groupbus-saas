import { Worker, Job } from "bullmq";
import { getRedisConnection, closeRedisConnection } from "../shared/queue";
import { createChildLogger } from "../shared/logger";
import prisma from "../shared/prisma";

const log = createChildLogger("document");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocumentJobData {
  type: "JOB_SHEET" | "DRIVER_BRIEFING" | "QUOTE_PDF" | "OTHER";
  bookingId?: string;
  customerQuoteId?: string;
  data: Record<string, unknown>;
}

// Map job types to human-readable file names
const FILE_NAME_MAP: Record<DocumentJobData["type"], string> = {
  JOB_SHEET: "Job Sheet",
  DRIVER_BRIEFING: "Driver Briefing",
  QUOTE_PDF: "Quote",
  OTHER: "Document",
};

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------

async function processJob(job: Job<DocumentJobData>) {
  const { type, bookingId, customerQuoteId, data } = job.data;

  log.info({ jobId: job.id, type, bookingId, customerQuoteId }, "Processing document job");

  // TODO: Replace placeholder with actual PDF generation
  // (e.g. puppeteer, @react-pdf/renderer, or an HTML-to-PDF service)
  const fileName = `${FILE_NAME_MAP[type]} - ${job.id}.pdf`;

  // Create a Document record in the database
  const document = await prisma.document.create({
    data: {
      type,
      fileName,
      fileUrl: "", // Will be populated once real PDF generation + upload is implemented
      fileSize: null,
      mimeType: "application/pdf",
      description: `Auto-generated ${FILE_NAME_MAP[type]}`,
      ...(bookingId ? { bookingId } : {}),
    },
  });

  log.info(
    { jobId: job.id, documentId: document.id, type, fileName },
    "Document record created (placeholder)",
  );

  return { documentId: document.id, type, fileName };
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

const connection = getRedisConnection();

const worker = new Worker<DocumentJobData>("documents", processJob, {
  connection,
  concurrency: 3,
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

log.info("Document worker started and listening for jobs...");

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(signal: string) {
  log.info({ signal }, "Shutting down document worker...");
  await worker.close();
  await prisma.$disconnect();
  await closeRedisConnection();
  log.info("Document worker shut down cleanly");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
