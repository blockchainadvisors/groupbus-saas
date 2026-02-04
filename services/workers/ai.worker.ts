import { Worker, Job } from "bullmq";
import IORedis from "ioredis";

// These will be dynamically imported since they use @/ aliases
// We need to register tsconfig paths first
import { register } from "tsconfig-paths";
import { resolve } from "path";

// Register path aliases so @/ imports work
const tsConfig = require(resolve(__dirname, "../../tsconfig.json"));
register({
  baseUrl: resolve(__dirname, "../../"),
  paths: tsConfig.compilerOptions.paths,
});

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

async function processJob(job: Job) {
  console.log(`[AI Worker] Processing job ${job.name} (${job.id})`);

  const pipelineId = job.id ?? `pipeline-${Date.now()}`;

  switch (job.name) {
    case "flow2:enquiry-intake": {
      const { runEnquiryIntakePipeline } = await import("../../src/lib/ai/pipelines/enquiry-intake.pipeline");
      return runEnquiryIntakePipeline({
        enquiryId: job.data.enquiryId,
        inboundEmailId: job.data.inboundEmailId,
        pipelineId,
      });
    }
    case "flow3:bid-evaluation": {
      const { runBidEvaluationPipeline } = await import("../../src/lib/ai/pipelines/bid-evaluation.pipeline");
      return runBidEvaluationPipeline({
        enquiryId: job.data.enquiryId,
        pipelineId,
      });
    }
    case "flow4:quote-generation":
    case "quote-generation": {
      const { runQuoteGenerationPipeline } = await import("../../src/lib/ai/pipelines/quote-generation.pipeline");
      return runQuoteGenerationPipeline({
        enquiryId: job.data.enquiryId,
        supplierQuoteId: job.data.supplierQuoteId,
        supplierId: job.data.supplierId,
        pipelineId: job.data.pipelineId ?? pipelineId,
      });
    }
    case "flow6:job-confirmation": {
      const { runJobConfirmationPipeline } = await import("../../src/lib/ai/pipelines/job-confirmation.pipeline");
      return runJobConfirmationPipeline({
        customerQuoteId: job.data.customerQuoteId,
        pipelineId,
      });
    }
    default:
      console.warn(`[AI Worker] Unknown job type: ${job.name}`);
  }
}

const worker = new Worker("ai-pipeline", processJob, {
  connection,
  concurrency: 2,
  limiter: {
    max: 10,
    duration: 60000, // Max 10 jobs per minute
  },
});

worker.on("completed", (job) => {
  console.log(`[AI Worker] Job ${job.name} (${job.id}) completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[AI Worker] Job ${job?.name} (${job?.id}) failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("[AI Worker] Worker error:", err);
});

console.log("[AI Worker] Started and listening for jobs...");
