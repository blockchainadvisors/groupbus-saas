import { z } from "zod";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCompletionOptions {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LLMStructuredOptions<T extends z.ZodType>
  extends LLMCompletionOptions {
  schema: T;
  schemaName: string;
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  latencyMs: number;
}

export interface LLMStructuredResponse<T> extends LLMResponse {
  parsed: T;
}

export abstract class LLMProvider {
  abstract name: string;

  abstract textCompletion(options: LLMCompletionOptions): Promise<LLMResponse>;

  abstract structuredCompletion<T extends z.ZodType>(
    options: LLMStructuredOptions<T>
  ): Promise<LLMStructuredResponse<z.infer<T>>>;
}
