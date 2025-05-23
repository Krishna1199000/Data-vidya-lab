import { NextResponse,NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

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

    const labSessions = await prisma.labSession.findMany({
      where: {
        labId: resolvedParams.id,
        userId: session.user.id,
      },
      orderBy: {
        startedAt: "desc",
      },
    });

    return NextResponse.json(labSessions);
  } catch (error) {
    console.error("[SESSIONS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 