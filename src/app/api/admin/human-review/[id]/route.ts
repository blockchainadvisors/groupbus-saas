import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["SUPERADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, resolution } = body;

    if (!status || !["IN_REVIEW", "RESOLVED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be IN_REVIEW or RESOLVED." },
        { status: 400 }
      );
    }

    // Verify the task exists
    const existingTask = await prisma.humanReviewTask.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: "Human review task not found" },
        { status: 404 }
      );
    }

    // Build update data based on the target status
    const updateData: Record<string, unknown> = {
      status,
    };

    if (status === "RESOLVED") {
      updateData.resolvedBy = session.user.id;
      updateData.resolvedAt = new Date();
      if (resolution) {
        updateData.resolution = resolution;
      }
    }

    const updatedTask = await prisma.humanReviewTask.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Human review PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
