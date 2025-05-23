import { NextResponse,NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const bookmark = await prisma.bookmark.create({
      data: {
        userId: session.user.id,
        labId: resolvedParams.id,
      },
    });

    return NextResponse.json(bookmark);
  } catch (error) {
    console.error("[BOOKMARK_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await prisma.bookmark.delete({
      where: {
        userId_labId: {
          userId: session.user.id,
          labId:resolvedParams.id,
        },
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[BOOKMARK_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

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

    const bookmark = await prisma.bookmark.findUnique({
      where: {
        userId_labId: {
          userId: session.user.id,
          labId: resolvedParams.id,
        },
      },
    });

    return NextResponse.json({ isBookmarked: !!bookmark });
  } catch (error) {
    console.error("[BOOKMARK_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 