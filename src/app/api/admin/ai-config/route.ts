import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["SUPERADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const configs = await prisma.aiConfig.findMany({
      select: {
        id: true,
        key: true,
        value: true,
        description: true,
        updatedAt: true,
        updatedBy: true,
      },
      orderBy: { key: "asc" },
    });

    return NextResponse.json({ configs });
  } catch (error) {
    console.error("AiConfig GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["SUPERADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { key, value, description } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { error: "Key is required and must be a string" },
        { status: 400 }
      );
    }

    if (value === undefined) {
      return NextResponse.json(
        { error: "Value is required" },
        { status: 400 }
      );
    }

    const config = await prisma.aiConfig.upsert({
      where: { key },
      update: {
        value,
        description: description ?? undefined,
        updatedBy: session.user.id,
      },
      create: {
        key,
        value,
        description: description ?? null,
        updatedBy: session.user.id,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("AiConfig PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
