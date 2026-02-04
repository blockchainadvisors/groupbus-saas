import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aiPipelineQueue } from "@/lib/queue";
import { rateLimitMiddleware } from "@/lib/rate-limit";

const limiter = rateLimitMiddleware({ limit: 30, window: 60 });

export async function POST(request: Request) {
  try {
    const rl = await limiter(request);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }
    // Verify the webhook secret
    const webhookSecret = request.headers.get("x-webhook-secret");

    if (!webhookSecret || webhookSecret !== process.env.INBOUND_EMAIL_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Create an InboundEmail record from the webhook payload
    const inboundEmail = await prisma.inboundEmail.create({
      data: {
        fromEmail: body.from,
        fromName: body.fromName ?? null,
        subject: body.subject,
        body: body.text ?? body.html ?? "",
        rawHeaders: body.headers ?? null,
      },
    });

    // Queue the AI pipeline for email intake processing
    await aiPipelineQueue.add("flow2:enquiry-intake", {
      inboundEmailId: inboundEmail.id,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Inbound email webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
