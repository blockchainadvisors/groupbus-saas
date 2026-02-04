import { LLMMessage } from "../providers/base";

const SYSTEM_PROMPT = `You are GroupBus's email specialist. Personalize emails for recipients.
Keep the brand voice professional yet friendly.
Generate clean HTML email content that renders well in all email clients.
Adapt tone based on the context: formal for new contacts, friendly for established relationships, urgent when time-sensitive.`;

export function buildEmailPersonalizerPrompt(context: {
  templateType: string;
  recipientName: string;
  recipientType: "customer" | "supplier" | "admin";
  context: Record<string, string>;
  urgency?: "normal" | "high";
}): LLMMessage[] {
  const contextLines = Object.entries(context.context)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");

  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Personalize this email:

TYPE: ${context.templateType}
RECIPIENT: ${context.recipientName} (${context.recipientType})
URGENCY: ${context.urgency ?? "normal"}

CONTEXT:
${contextLines}

Generate a personalized email subject and HTML body.`,
    },
  ];
}
