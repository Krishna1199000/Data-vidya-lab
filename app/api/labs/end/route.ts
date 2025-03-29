import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth.config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId } = body;

    const labSession = await prisma.labSession.findUnique({
      where: { id: sessionId }
    });

    if (!labSession) {
      return NextResponse.json({ error: "Lab session not found" }, { status: 404 });
    }

    if (labSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.labSession.update({
      where: { id: sessionId },
      data: {
        status: "ENDED",
        endedAt: new Date()
      }
    });

    return NextResponse.json({ message: "Lab session ended successfully" });

  } catch (error) {
    console.error("Error ending lab:", error);
    return NextResponse.json({ error: "Failed to end lab" }, { status: 500 });
  }
}