import "dotenv/config";
import { Worker, Job } from "bullmq";
import { createTransport, Transporter } from "nodemailer";
import { getRedisConnection, closeRedisConnection } from "../shared/queue";
import { createChildLogger } from "../shared/logger";

const log = createChildLogger("email");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmailJobData {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64 encoded
    contentType?: string;
  }>;
}

// ---------------------------------------------------------------------------
// SMTP Transport
// ---------------------------------------------------------------------------

function createSmtpTransport(): Transporter {
  const smtpHost = process.env.SMTP_HOST ?? "in-v3.mailjet.com";
  const smtpPort = Number(process.env.SMTP_PORT ?? 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  log.info({ host: smtpHost, port: smtpPort, hasAuth: !!(smtpUser && smtpPass) }, "Creating SMTP transport");

  const transport = createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: false,
    ...(smtpUser && smtpPass ? { auth: { user: smtpUser, pass: smtpPass } } : {}),
  });

  log.info("SMTP transport created");
  return transport;
}

const transporter = createSmtpTransport();

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------

async function processJob(job: Job<EmailJobData>) {
  const { to, subject, html, text, replyTo, attachments } = job.data;

  log.info({ jobId: job.id, to, subject }, "Processing email job");

  // SMTP_FROM must be set in environment (e.g., noreply@groupbus.badev.tools)
  if (!process.env.SMTP_FROM) {
    throw new Error("SMTP_FROM environment variable is required");
  }

  const mailOptions: Record<string, unknown> = {
    from: process.env.SMTP_FROM,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    html,
  };

  if (text) mailOptions.text = text;
  if (replyTo) mailOptions.replyTo = replyTo;

  if (attachments && attachments.length > 0) {
    mailOptions.attachments = attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content, "base64"),
      contentType: a.contentType,
    }));
  }

  const info = await transporter.sendMail(mailOptions);

  log.info(
    { jobId: job.id, messageId: info.messageId, accepted: info.accepted },
    "Email sent successfully",
  );

  return { messageId: info.messageId };
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

const connection = getRedisConnection();

const worker = new Worker<EmailJobData>("email", processJob, {
  connection,
  concurrency: 5,
  limiter: {
    max: 30,
    duration: 60_000, // Max 30 emails per minute
  },
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

log.info("Email worker started and listening for jobs...");

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(signal: string) {
  log.info({ signal }, "Shutting down email worker...");
  await worker.close();
  transporter.close();
  await closeRedisConnection();
  log.info("Email worker shut down cleanly");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
