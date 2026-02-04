import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  LLMProvider,
  LLMCompletionOptions,
  LLMResponse,
  LLMStructuredOptions,
  LLMStructuredResponse,
} from "./base";

export class OpenAIProvider extends LLMProvider {
  name = "openai" as const;
  private client: OpenAI;

  constructor() {
    super();
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async textCompletion(options: LLMCompletionOptions): Promise<LLMResponse> {
    const start = Date.now();
    const response = await this.client.chat.completions.create({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
    });

    const choice = response.choices[0];
    return {
      content: choice.message.content ?? "",
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      model: response.model,
      latencyMs: Date.now() - start,
    };
  }

  async structuredCompletion<T extends z.ZodType>(
    options: LLMStructuredOptions<T>
  ): Promise<LLMStructuredResponse<z.infer<T>>> {
    const start = Date.now();
    const response = await this.client.chat.completions.create({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens,
      response_format: zodResponseFormat(options.schema, options.schemaName),
    });

    const choice = response.choices[0];
    const content = choice.message.content ?? "{}";
    const parsed = options.schema.parse(JSON.parse(content));

    return {
      content,
      parsed,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      model: response.model,
      latencyMs: Date.now() - start,
    };
  }
}
