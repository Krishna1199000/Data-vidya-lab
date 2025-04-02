import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth.config";
import { PrismaClient } from "@prisma/client";
import { 
  getAvailableAccount,
  provisionResources,
  generateConsoleUrl
} from "@/app/api/labs/terraform/executor";

const prisma = new PrismaClient();

// Add a simple in-memory lock to prevent concurrent requests from the same user
const processingRequests = new Map<string, boolean>();

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

    // Check if this user already has a request in progress
    if (processingRequests.get(userId)) {
      return NextResponse.json({ 
        error: "Another request is already being processed", 
        code: "CONCURRENT_REQUEST"
      }, { status: 429 });
    }
    
    // Mark this user as having a request in progress
    processingRequests.set(userId, true);
    
    try {
      // Check if user already has an active session in the database
      const activeSession = await prisma.labSession.findFirst({
        where: {
          userId: userId,
          status: "ACTIVE"
        }
      });

      if (activeSession) {
        // User already has an active session
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
        ].find(acc => acc.id === activeSession.awsAccountId);
        
        if (!account) {
          throw new Error("Associated AWS account not found");
        }
        
        // Generate a console URL
        const consoleUrl = await generateConsoleUrl(
          account.region,
          activeSession.aws_access_key_id || "",
          activeSession.aws_secret_access_key || "", 
          ""  // No session token for IAM users
        );
        
        return NextResponse.json({
          sessionId: activeSession.id,
          credentials: {
            accountId: account.id,
            username: activeSession.awsUsername || account.username,
            password: activeSession.password,
            accessKeyId: activeSession.aws_access_key_id,
            secretAccessKey: activeSession.aws_secret_access_key,
            region: account.region,
            consoleUrl
          }
        });
      }

      // Find an available AWS account
      const availableAccount = await getAvailableAccount();

      // Generate a unique session ID
      const sessionId = crypto.randomUUID();

      // Provision resources using Terraform
      const resources = await provisionResources(
        availableAccount,
        userId,
        labId,
        sessionId
      );

      // Generate console URL
      const consoleUrl = await generateConsoleUrl(
        resources.region,
        resources.accessKeyId,
        resources.secretAccessKey,
        ""  // No session token for IAM users
      );

      // Create lab session
      const labSession = await prisma.labSession.create({
        data: {
          id: sessionId,
          labId,
          userId: userId,
          awsAccountId: availableAccount.id,
          awsUsername: resources.username,
          password: resources.password,
          aws_access_key_id: resources.accessKeyId,
          aws_secret_access_key: resources.secretAccessKey,
          expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
          status: "ACTIVE"
        }
      });

      return NextResponse.json({
        sessionId: labSession.id,
        credentials: {
          accountId: availableAccount.id,
          username: resources.username,
          password: resources.password,
          accessKeyId: resources.accessKeyId,
          secretAccessKey: resources.secretAccessKey,
          region: resources.region,
          s3BucketName: resources.s3BucketName,
          consoleUrl
        }
      });
    } finally {
      // Always clean up the lock when done
      processingRequests.delete(userId);
    }
  } catch (error: any) {
    console.error("Error starting lab:", error);
    return NextResponse.json({ 
      error: "Failed to start lab", 
      details: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}