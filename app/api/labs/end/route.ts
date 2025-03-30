import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth.config";
import { PrismaClient } from "@prisma/client";
import AWS from 'aws-sdk'; // You'll need to install aws-sdk

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
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    if (!labSession) {
      return NextResponse.json({ error: "Lab session not found" }, { status: 404 });
    }

    if (labSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If AWS credentials are stored, attempt to invalidate them
    if (labSession.aws_access_key_id && labSession.aws_secret_access_key) {
      try {
        // Configure AWS SDK with admin credentials from environment variables
        const iam = new AWS.IAM({
          region: process.env.AWS_REGION,
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        });

        // Invalidate any active sessions for this user
        // This is a best-effort approach since we can't directly log out of the AWS console
        if (labSession.aws_session_token) {
          await iam.deleteAccessKey({
            UserName: `lab-user-${labSession.userId.substring(0, 8)}`, // Adjust based on your naming convention
            AccessKeyId: labSession.aws_access_key_id
          }).promise();
        }
      } catch (awsError) {
        console.error("Error invalidating AWS credentials:", awsError);
        // Continue with lab session closure even if credential invalidation fails
      }
    }

    // Update the lab session status in the database
    await prisma.labSession.update({
      where: { id: sessionId },
      data: {
        status: "ENDED",
        endedAt: new Date(),
        // Clear sensitive credentials
        aws_access_key_id: null,
        aws_secret_access_key: null,
        aws_session_token: null
      }
    });

    return NextResponse.json({ 
      message: "Lab session ended successfully",
      logoutRequired: true // Flag for the frontend to know it should display logout instructions
    });

  } catch (error) {
    console.error("Error ending lab:", error);
    return NextResponse.json({ error: "Failed to end lab" }, { status: 500 });
  }
}