import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth.config";
import { PrismaClient } from "@prisma/client";
import { 
  STSClient, 
  GetFederationTokenCommand,
  Credentials as STSCredentials 
} from "@aws-sdk/client-sts";
import crypto from "crypto";

const prisma = new PrismaClient();

const AWS_ACCOUNTS = [
  {
    id: "124744987862",
    username: "LabUser1",
    region: "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_LABUSER1!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_LABUSER1!
  },
  {
    id: "104023954744", 
    username: "LabUser2",
    region: "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_LABUSER2!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_LABUSER2!
  }
];

async function getTemporaryCredentials(account: typeof AWS_ACCOUNTS[0]): Promise<STSCredentials> {
  const stsClient = new STSClient({
    region: account.region,
    credentials: {
      accessKeyId: account.accessKeyId,
      secretAccessKey: account.secretAccessKey
    }
  });

  // Generate a unique name for each user session to avoid conflicts
  const federationName = `${account.username}-${Date.now()}`;

  const command = new GetFederationTokenCommand({
    Name: federationName.substring(0, 32), // Ensure name is not too long (AWS limit)
    DurationSeconds: 3600, // 1 hour
    Policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: [
            "s3:*",
            "ec2:*",
            "rds:*"
            // Add other necessary permissions
          ],
          Resource: "*"
        }
      ]
    })
  });

  const response = await stsClient.send(command);
  
  if (!response.Credentials) {
    throw new Error("Failed to get temporary credentials");
  }

  return response.Credentials;
}

// Function to call AWS federation endpoint and get a sign-in token
async function getSigninToken(credentials: STSCredentials): Promise<string> {
  const session = {
    sessionId: credentials.AccessKeyId,
    sessionKey: credentials.SecretAccessKey,
    sessionToken: credentials.SessionToken
  };

  const params = new URLSearchParams({
    Action: "getSigninToken",
    Session: JSON.stringify(session),
    // Add DurationSeconds to extend token validity
    SessionDuration: "3600"
  });

  try {
    const response = await fetch(`https://signin.aws.amazon.com/federation?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to get signin token:", errorText);
      throw new Error(`Failed to get signin token: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.SigninToken) {
      throw new Error("No SigninToken in response");
    }
    
    return result.SigninToken;
  } catch (error) {
    console.error("Error getting signin token:", error);
    throw error;
  }
}

// Function to generate console URL
async function generateConsoleUrl(
  region: string,
  credentials: STSCredentials
): Promise<string> {
  try {
    // Get a federation signin token
    const signinToken = await getSigninToken(credentials);
    
    // Create the destination console URL
    const destination = encodeURIComponent(`https://${region}.console.aws.amazon.com/`);
    
    // Construct the final federation URL
    const federationUrl = `https://signin.aws.amazon.com/federation?Action=login&Destination=${destination}&SigninToken=${signinToken}`;
    
    return federationUrl;
  } catch (error) {
    console.error("Error generating console URL:", error);
    throw error;
  }
}

// Generate a random password for lab session
function generateSessionPassword(): string {
  return crypto.randomBytes(12).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { labId } = body;

    // Check if user already has an active session
    const activeSession = await prisma.labSession.findFirst({
      where: {
        userId: session.user.id,
        status: "ACTIVE"
      }
    });

    if (activeSession) {
      return NextResponse.json({ error: "You already have an active lab session" }, { status: 400 });
    }

    // Find an available AWS account
    const activeSessions = await prisma.labSession.findMany({
      where: { status: "ACTIVE" }
    });

    const usedAccountIds = activeSessions.map(session => session.awsAccountId);
    const availableAccount = AWS_ACCOUNTS.find(account => !usedAccountIds.includes(account.id));

    if (!availableAccount) {
      return NextResponse.json({ error: "No AWS accounts available. Please try again later." }, { status: 503 });
    }

    // Get temporary credentials using AWS STS
    const tempCredentials = await getTemporaryCredentials(availableAccount);
    console.log("Temporary credentials obtained:", {
      AccessKeyId: tempCredentials.AccessKeyId,
      Expiration: tempCredentials.Expiration
    });

    // Generate sign-in URL for AWS Console
    const consoleUrl = await generateConsoleUrl(
      availableAccount.region,
      tempCredentials
    );

    // Generate a random password for the lab session
    const sessionPassword = generateSessionPassword();

    // Create lab session with minimal required fields
    const labSession = await prisma.labSession.create({
      data: {
        labId,
        userId: session.user.id,
        awsAccountId: availableAccount.id,
        password: sessionPassword,
        expiresAt: tempCredentials.Expiration!,
        status: "ACTIVE"
      }
    });
    
    // Store AWS credentials separately - not in the database
    // This is a temporary solution to avoid schema issues
    const sessionWithCredentials = {
      ...labSession,
      aws_credentials: {
        accessKeyId: tempCredentials.AccessKeyId,
        secretAccessKey: tempCredentials.SecretAccessKey,
        sessionToken: tempCredentials.SessionToken
      }
    };

    return NextResponse.json({
      sessionId: labSession.id,
      credentials: {
        accountId: availableAccount.id,
        username: availableAccount.username,
        accessKeyId: tempCredentials.AccessKeyId,
        secretAccessKey: tempCredentials.SecretAccessKey,
        sessionToken: tempCredentials.SessionToken,
        region: availableAccount.region,
        consoleUrl
      }
    });

  } catch (error) {
    // Safely log the error without causing another error
    console.error("Error starting lab:", error ? error.toString() : "Unknown error");
    return NextResponse.json({ error: "Failed to start lab" }, { status: 500 });
  }
}