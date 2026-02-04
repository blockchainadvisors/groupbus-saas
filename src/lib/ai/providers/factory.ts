import { LLMProvider } from "./base";
import { OpenAIProvider } from "./openai";

export type AiTaskType =
  | "email-parser"
  | "enquiry-analyzer"
  | "supplier-selector"
  | "bid-evaluator"
  | "markup-calculator"
  | "quote-content"
  | "job-documents"
  | "email-personalizer";

const TASK_MODEL_MAP: Record<AiTaskType, string> = {
  "email-parser": "gpt-4o",
  "enquiry-analyzer": "gpt-4o-mini",
  "supplier-selector": "gpt-4o",
  "bid-evaluator": "gpt-4o",
  "markup-calculator": "gpt-4o-mini",
  "quote-content": "gpt-4o-mini",
  "job-documents": "gpt-4o-mini",
  "email-personalizer": "gpt-4o-mini",
};

let providerInstance: LLMProvider | null = null;

export function getProvider(): LLMProvider {
  if (!providerInstance) {
    const providerName = process.env.LLM_PROVIDER ?? "openai";
    switch (providerName) {
      case "openai":
        providerInstance = new OpenAIProvider();
        break;
      default:
        throw new Error(`Unknown LLM provider: ${providerName}`);
    }
  }
  return providerInstance;
}

export function getModelForTask(taskType: AiTaskType): string {
  return process.env.LLM_DEFAULT_MODEL ?? TASK_MODEL_MAP[taskType];
}
