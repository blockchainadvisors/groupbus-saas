import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const notificationId = body?.id;

  if (notificationId) {
    // Mark single notification as read
    await prisma.notification.updateMany({
      where: { id: notificationId, userId: session.user.id },
      data: { readAt: new Date(), status: "READ" },
    });
  } else {
    // Mark all as read
    await prisma.notification.updateMany({
      where: { userId: session.user.id, readAt: null },
      data: { readAt: new Date(), status: "READ" },
    });
  }

  return NextResponse.json({ success: true });
}
