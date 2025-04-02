import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth.config";
import { PrismaClient } from "@prisma/client";
import { 
  destroyResources
} from "@/app/api/labs/terraform/executor";

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const labId = params.id;
    
    // Parse the request body to get sessionId
    const body = await request.json();
    const { sessionId } = body;
    
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    // Find the lab session
    const labSession = await prisma.labSession.findFirst({
      where: {
        id: sessionId,
        userId,
        status: "ACTIVE"
      }
    });

    if (!labSession) {
      return NextResponse.json({ error: "Lab session not found" }, { status: 404 });
    }

    // Find the associated AWS account
    const account = [
      {
        id: "124744987862",
        username: "LabUser1",
        region: "us-east-1",
        accessKeyId: process.env.AWS_ACCESS_KEY_ID_LABUSER1!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_LABUSER1!,
        terraformPath: "account1"
      },
      {
        id: "104023954744", 
        username: "LabUser2",
        region: "us-east-1",
        accessKeyId: process.env.AWS_ACCESS_KEY_ID_LABUSER2!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_LABUSER2!,
        terraformPath: "account2"
      }
    ].find(acc => acc.id === labSession.awsAccountId);
    
    if (!account) {
      throw new Error("Associated AWS account not found");
    }

    // Destroy the resources
    await destroyResources(
      account,
      userId,
      labId,
      sessionId
    );

    // Update the lab session status
    await prisma.labSession.update({
      where: { id: sessionId },
      data: { status: "ENDED" }
    });

    return NextResponse.json({ message: "Lab session ended successfully" });
  } catch (error: any) {
    console.error("Error ending lab:", error);
    return NextResponse.json({ 
      error: "Failed to end lab", 
      details: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}