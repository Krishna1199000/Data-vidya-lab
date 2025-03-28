import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth.config";
import prisma from "@/src/index";
import crypto from "crypto";

// AWS Account configurations
const AWS_ACCOUNTS = [
  {
    id: "982534396819",
    name: "darshiltestacc",
    available: true
  },
  {
    id: "559050244279", 
    name: "datavidhyatest",
    available: true
  }
];

// Generate a random password
function generatePassword() {
  return crypto.randomBytes(12).toString('base64')
    .replace(/[+/=]/g, '') // Remove special chars
    .slice(0, 12); // Ensure 12 char length
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already has an active session
    const activeSession = await prisma.labSession.findFirst({
      where: {
        userId: session.user.id,
        status: "ACTIVE"
      }
    });

    if (activeSession) {
      return NextResponse.json(
        { error: "You already have an active lab session" },
        { status: 400 }
      );
    }

    // Find available AWS account
    const availableAccount = AWS_ACCOUNTS.find(acc => acc.available);
    
    if (!availableAccount) {
      return NextResponse.json(
        { error: "No AWS accounts available. Please try again later." },
        { status: 503 }
      );
    }

    // Generate new password
    const password = generatePassword();

    // Create new lab session
    const labSession = await prisma.labSession.create({
      data: {
        labId: params.id,
        userId: session.user.id,
        awsAccountId: availableAccount.id,
        password: password,
        status: "ACTIVE"
      }
    });

    // Mark account as unavailable
    availableAccount.available = false;

    return NextResponse.json({
      id: labSession.id,
      accountId: availableAccount.id,
      accountName: availableAccount.name,
      password: password,
      loginUrl: `https://${availableAccount.id}.signin.aws.amazon.com/console`
    });

  } catch (error) {
    console.error("Lab session error:", error);
    return NextResponse.json(
      { error: "Failed to start lab session" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find and end active session
    const activeSession = await prisma.labSession.findFirst({
      where: {
        userId: session.user.id,
        labId: params.id,
        status: "ACTIVE"
      }
    });

    if (!activeSession) {
      return NextResponse.json(
        { error: "No active lab session found" },
        { status: 404 }
      );
    }

    // Update session status
    await prisma.labSession.update({
      where: { id: activeSession.id },
      data: {
        status: "ENDED",
        endedAt: new Date()
      }
    });

    // Mark AWS account as available again
    const account = AWS_ACCOUNTS.find(acc => acc.id === activeSession.awsAccountId);
    if (account) {
      account.available = true;
    }

    return NextResponse.json({ message: "Lab session ended successfully" });

  } catch (error) {
    console.error("End session error:", error);
    return NextResponse.json(
      { error: "Failed to end lab session" },
      { status: 500 }
    );
  }
}