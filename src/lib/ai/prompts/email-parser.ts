import { LLMMessage } from "../providers/base";

const SYSTEM_PROMPT = `You are an expert email parser for GroupBus, a coach and bus rental marketplace in the UK.
Your job is to extract structured enquiry information from customer emails.

Extract as much information as possible from the email. If a field cannot be determined, omit it.
Dates should be in ISO 8601 format (YYYY-MM-DD). Times in HH:MM format.
Passenger counts should be numbers. Prices should be in GBP.

Rate your confidence from 0 to 1 based on how complete and clear the email is.
List any important fields that are missing.`;

export function buildEmailParserPrompt(email: {
  subject: string;
  body: string;
  fromEmail: string;
  fromName?: string;
}): LLMMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Parse this inbound email into a structured coach/bus rental enquiry.

From: ${email.fromName ? `${email.fromName} <${email.fromEmail}>` : email.fromEmail}
Subject: ${email.subject}

Body:
${email.body}`,
    },
  ];
}
