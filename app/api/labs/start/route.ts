import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth.config";
import { PrismaClient } from "@prisma/client";
import { 
  STSClient, 
  GetFederationTokenCommand,
  Credentials as STSCredentials 
} from "@aws-sdk/client-sts";
import { 
  IAMClient, 
  UpdateLoginProfileCommand, 
  CreateLoginProfileCommand 
} from "@aws-sdk/client-iam";
import crypto from "crypto";

const prisma = new PrismaClient();

// Add a simple in-memory lock to prevent concurrent requests from the same user
const processingRequests = new Map<string, boolean>();

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

  console.log("Temporary credentials obtained:", {
    AccessKeyId: response.Credentials.AccessKeyId,
    Expiration: response.Credentials.Expiration
  });

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

// Generate a random password for lab session that meets AWS IAM requirements
function generateSessionPassword(): string {
  // Create a password that meets AWS IAM requirements
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let password = '';
  // Ensure at least one of each type
  password += upper.charAt(Math.floor(Math.random() * upper.length));
  password += lower.charAt(Math.floor(Math.random() * lower.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += special.charAt(Math.floor(Math.random() * special.length));
  
  // Add more random characters
  for (let i = 0; i < 8; i++) {
    const allChars = upper + lower + numbers + special;
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

// Function to set temporary IAM user password
async function setTemporaryIamPassword(account: typeof AWS_ACCOUNTS[0], password: string): Promise<boolean> {
  const iamClient = new IAMClient({
    region: account.region,
    credentials: {
      accessKeyId: account.accessKeyId,
      secretAccessKey: account.secretAccessKey
    }
  });

  try {
    // Try to update existing login profile
    const updateCommand = new UpdateLoginProfileCommand({
      UserName: account.username,
      Password: password,
      PasswordResetRequired: false
    });
    
    await iamClient.send(updateCommand);
    console.log(`Successfully updated password for ${account.username}`);
    return true;
  } catch (error: any) {
    if (error.name === 'NoSuchEntityException') {
      // If user doesn't have a login profile, create one
      try {
        const createCommand = new CreateLoginProfileCommand({
          UserName: account.username,
          Password: password,
          PasswordResetRequired: false
        });
        
        await iamClient.send(createCommand);
        console.log(`Successfully created login profile for ${account.username}`);
        return true;
      } catch (createError) {
        console.error("Error creating login profile:", createError);
        throw createError;
      }
    } else {
      console.error("Error updating login profile:", error);
      throw error;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    
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
      const body = await request.json();
      const { labId } = body;

      // Check if user already has an active session in the database
      const activeSession = await prisma.labSession.findFirst({
        where: {
          userId: userId,
          status: "ACTIVE"
        }
      });

      if (activeSession) {
        // If the user already has an active session, return it instead of creating a new one
        const account = AWS_ACCOUNTS.find(acc => acc.id === activeSession.awsAccountId);
        
        if (!account) {
          throw new Error("Associated AWS account not found");
        }
        
        // Get fresh credentials using the existing session info
        const tempCredentials = await getTemporaryCredentials(account);
        const consoleUrl = await generateConsoleUrl(account.region, tempCredentials);
        
        return NextResponse.json({
          sessionId: activeSession.id,
          credentials: {
            accountId: account.id,
            username: account.username,
            password: activeSession.password, // Use stored password
            accessKeyId: tempCredentials.AccessKeyId,
            secretAccessKey: tempCredentials.SecretAccessKey,
            sessionToken: tempCredentials.SessionToken,
            region: account.region,
            consoleUrl
          }
        });
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

      // Generate a random password for the lab session
      const sessionPassword = generateSessionPassword();
      
      // Set the temporary password for IAM user
      await setTemporaryIamPassword(availableAccount, sessionPassword);

      // Get temporary credentials using AWS STS - CALL ONLY ONCE
      const tempCredentials = await getTemporaryCredentials(availableAccount);
      
      // Generate sign-in URL for AWS Console using the same credentials
      const consoleUrl = await generateConsoleUrl(
        availableAccount.region,
        tempCredentials
      );

      // Create lab session with minimal required fields
      const labSession = await prisma.labSession.create({
        data: {
          labId,
          userId: userId,
          awsAccountId: availableAccount.id,
          password: sessionPassword,
          expiresAt: tempCredentials.Expiration!,
          status: "ACTIVE"
        }
      });

      return NextResponse.json({
        sessionId: labSession.id,
        credentials: {
          accountId: availableAccount.id,
          username: availableAccount.username,
          password: sessionPassword,
          accessKeyId: tempCredentials.AccessKeyId,
          secretAccessKey: tempCredentials.SecretAccessKey,
          sessionToken: tempCredentials.SessionToken,
          region: availableAccount.region,
          consoleUrl
        }
      });
    } finally {
      // Always clean up the lock when done
      processingRequests.delete(userId);
    }
  } catch (error: any) {
    // Safely log the error without causing another error
    console.error("Error starting lab:", error ? error.toString() : "Unknown error");
    return NextResponse.json({ 
      error: "Failed to start lab", 
      details: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}