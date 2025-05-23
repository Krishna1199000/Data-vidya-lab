import { NextResponse,NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const labSession = await prisma.labSession.findUnique({
      where: {
        id: resolvedParams.id,
        userId: session.user.id,
        labId: resolvedParams.id,
      },
    });

    if (!labSession) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return NextResponse.json(labSession);
  } catch (error) {
    console.error("[SESSION_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { status, completionPercentage, timeSpent, endedAt } = body;

    const updatedSession = await prisma.labSession.update({
      where: {
        id: resolvedParams.id,
        userId: session.user.id,
        labId: resolvedParams.id,
      },
      data: {
        status,
        completionPercentage,
        timeSpent,
        endedAt: endedAt ? new Date(endedAt) : new Date(),
      },
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("[SESSION_UPDATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 