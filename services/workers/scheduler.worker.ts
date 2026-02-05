import { Queue, Worker, Job } from "bullmq";
import { getRedisConnection, closeRedisConnection } from "../shared/queue";
import { createChildLogger } from "../shared/logger";
import prisma from "../shared/prisma";

const log = createChildLogger("scheduler");

// ---------------------------------------------------------------------------
// Queues for dispatching follow-up jobs
// ---------------------------------------------------------------------------

const connection = getRedisConnection();

const schedulerQueue = new Queue("scheduler", { connection });
const aiPipelineQueue = new Queue("ai-pipeline", { connection });
const emailQueue = new Queue("email", { connection });

// ---------------------------------------------------------------------------
// Task handlers
// ---------------------------------------------------------------------------

/**
 * Check for expired supplier enquiries and trigger bid evaluation when all
 * suppliers for an enquiry have responded or expired.
 */
async function handleBidTimeout() {
  const now = new Date();

  // Find PENDING supplier enquiries whose deadline has passed
  const expired = await prisma.supplierEnquiry.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: now },
    },
    select: { id: true, enquiryId: true },
  });

  if (expired.length === 0) {
    log.info("bid-timeout: No expired supplier enquiries found");
    return;
  }

  log.info({ count: expired.length }, "bid-timeout: Expiring supplier enquiries");

  // Expire them in bulk
  await prisma.supplierEnquiry.updateMany({
    where: { id: { in: expired.map((e) => e.id) } },
    data: { status: "EXPIRED" },
  });

  // Deduplicate enquiry IDs
  const enquiryIds = [...new Set(expired.map((e) => e.enquiryId))];

  for (const enquiryId of enquiryIds) {
    // Check whether all suppliers have now responded (or expired)
    const pendingCount = await prisma.supplierEnquiry.count({
      where: { enquiryId, status: "PENDING" },
    });

    if (pendingCount === 0) {
      log.info({ enquiryId }, "bid-timeout: All suppliers responded/expired -- triggering bid evaluation");
      await aiPipelineQueue.add("flow3:bid-evaluation", { enquiryId });
    }
  }
}

/**
 * Expire customer quotes that have passed their validUntil date.
 */
async function handleQuoteExpiry() {
  const now = new Date();

  const result = await prisma.customerQuote.updateMany({
    where: {
      status: "SENT_TO_CUSTOMER",
      validUntil: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  log.info({ expiredCount: result.count }, "quote-expiry: Updated expired customer quotes");
}

/**
 * Trigger post-trip surveys for bookings completed yesterday.
 */
async function handleSurveyTrigger() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setHours(23, 59, 59, 999);

  const completedBookings = await prisma.booking.findMany({
    where: {
      status: "COMPLETED",
      completedAt: {
        gte: yesterday,
        lte: endOfYesterday,
      },
    },
    select: { id: true, enquiryId: true },
  });

  log.info(
    { count: completedBookings.length },
    "survey-trigger: Bookings completed yesterday",
  );

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  for (const booking of completedBookings) {
    const enquiry = await prisma.enquiry.findUnique({
      where: { id: booking.enquiryId },
      select: { contactEmail: true, contactName: true },
    });

    if (!enquiry?.contactEmail) {
      log.warn({ bookingId: booking.id }, "survey-trigger: No contact email found, skipping");
      continue;
    }

    const surveyLink = `${baseUrl}/survey?booking=${booking.id}`;

    await emailQueue.add("send-email", {
      to: enquiry.contactEmail,
      subject: "How was your trip? – GroupBus Feedback Survey",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">We'd Love Your Feedback</h2>
          <p>Dear ${enquiry.contactName},</p>
          <p>Thank you for travelling with GroupBus. We hope you had a great experience!</p>
          <p>Please take a moment to share your feedback — it helps us improve our service for everyone.</p>
          <p style="margin-top: 16px;">
            <a href="${surveyLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Complete Survey
            </a>
          </p>
          <p>Kind regards,<br/>GroupBus</p>
        </div>
      `.trim(),
    });

    log.info({ bookingId: booking.id, to: enquiry.contactEmail }, "survey-trigger: Queued survey email");
  }
}

/**
 * Send reminder emails to suppliers who have not responded to enquiries
 * sent more than 48 hours ago.
 */
async function handleReminderEmails() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

  const enquiries = await prisma.enquiry.findMany({
    where: {
      status: "SENT_TO_SUPPLIERS",
      updatedAt: { lt: cutoff },
    },
    include: {
      supplierEnquiries: {
        where: { status: "PENDING" },
        include: {
          organisation: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  let reminderCount = 0;

  for (const enquiry of enquiries) {
    for (const se of enquiry.supplierEnquiries) {
      if (!se.organisation.email) continue;

      await emailQueue.add("supplier-reminder", {
        to: se.organisation.email,
        subject: `Reminder: Quote request for ${enquiry.referenceNumber}`,
        html: `
          <p>Dear ${se.organisation.name},</p>
          <p>This is a friendly reminder that we are still awaiting your quote for enquiry <strong>${enquiry.referenceNumber}</strong>.</p>
          <p>Please submit your quote at your earliest convenience.</p>
          <p>Kind regards,<br/>GroupBus</p>
        `.trim(),
      });

      reminderCount++;
    }
  }

  log.info({ reminderCount }, "reminder-emails: Queued supplier reminder emails");
}

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------

async function processJob(job: Job) {
  log.info({ jobId: job.id, name: job.name }, "Processing scheduler job");

  switch (job.name) {
    case "bid-timeout":
      return handleBidTimeout();
    case "quote-expiry":
      return handleQuoteExpiry();
    case "survey-trigger":
      return handleSurveyTrigger();
    case "reminder-emails":
      return handleReminderEmails();
    default:
      log.warn({ name: job.name }, "Unknown scheduler job type");
  }
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

const worker = new Worker("scheduler", processJob, {
  connection,
  concurrency: 1,
});

worker.on("completed", (job) => {
  log.info({ jobId: job.id, name: job.name }, "Scheduler job completed");
});

worker.on("failed", (job, err) => {
  log.error({ jobId: job?.id, name: job?.name, err: err.message }, "Scheduler job failed");
});

worker.on("error", (err) => {
  log.error({ err: err.message }, "Scheduler worker error");
});

// ---------------------------------------------------------------------------
// Register repeating (cron) jobs on startup
// ---------------------------------------------------------------------------

async function registerRepeatingJobs() {
  // Every hour: check for expired bids
  await schedulerQueue.add(
    "bid-timeout",
    {},
    { repeat: { pattern: "0 * * * *" }, jobId: "bid-timeout" },
  );

  // Every hour: check for expired customer quotes
  await schedulerQueue.add(
    "quote-expiry",
    {},
    { repeat: { pattern: "30 * * * *" }, jobId: "quote-expiry" },
  );

  // Every day at 09:00 UTC: trigger post-trip surveys
  await schedulerQueue.add(
    "survey-trigger",
    {},
    { repeat: { pattern: "0 9 * * *" }, jobId: "survey-trigger" },
  );

  // Every day at 10:00 UTC: send reminder emails to unresponsive suppliers
  await schedulerQueue.add(
    "reminder-emails",
    {},
    { repeat: { pattern: "0 10 * * *" }, jobId: "reminder-emails" },
  );

  log.info("Repeating scheduler jobs registered");
}

registerRepeatingJobs().catch((err) => {
  log.error({ err: err.message }, "Failed to register repeating jobs");
});

log.info("Scheduler worker started and listening for jobs...");

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(signal: string) {
  log.info({ signal }, "Shutting down scheduler worker...");
  await worker.close();
  await schedulerQueue.close();
  await aiPipelineQueue.close();
  await emailQueue.close();
  await prisma.$disconnect();
  await closeRedisConnection();
  log.info("Scheduler worker shut down cleanly");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
