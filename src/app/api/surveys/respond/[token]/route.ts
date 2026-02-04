import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const survey = await prisma.surveyResponse.findUnique({
    where: { accessToken: token },
    include: {
      template: {
        select: {
          id: true,
          name: true,
          description: true,
          questions: true,
        },
      },
      booking: {
        select: {
          referenceNumber: true,
          enquiry: {
            select: {
              pickupLocation: true,
              dropoffLocation: true,
              departureDate: true,
              contactName: true,
            },
          },
        },
      },
    },
  });

  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  if (survey.completedAt) {
    return NextResponse.json({
      status: "completed",
      completedAt: survey.completedAt,
    });
  }

  return NextResponse.json({
    status: "pending",
    template: survey.template,
    booking: survey.booking,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const survey = await prisma.surveyResponse.findUnique({
    where: { accessToken: token },
  });

  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  if (survey.completedAt) {
    return NextResponse.json(
      { error: "Survey already completed" },
      { status: 409 }
    );
  }

  const body = await request.json();
  const { answers, overallRating, comments } = body;

  if (!answers || typeof answers !== "object") {
    return NextResponse.json(
      { error: "Answers are required" },
      { status: 400 }
    );
  }

  if (overallRating != null && (overallRating < 1 || overallRating > 5)) {
    return NextResponse.json(
      { error: "Rating must be between 1 and 5" },
      { status: 400 }
    );
  }

  const updated = await prisma.surveyResponse.update({
    where: { accessToken: token },
    data: {
      answers,
      overallRating: overallRating ?? null,
      comments: comments ?? null,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, completedAt: updated.completedAt });
}
