import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth.config";
import { PrismaClient } from "@prisma/client";
import { exec } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import util from "util";

const execAsync = util.promisify(exec);
const prisma = new PrismaClient();

// Add a simple in-memory lock to prevent concurrent requests from the same user
const processingRequests = new Map<string, boolean>();

// Configure AWS accounts with predefined user credentials
const AWS_ACCOUNTS = [
  {
    id: "124744987862",
    region: "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_LABUSER1 || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_LABUSER1 || ""
  },
  {
    id: "104023954744", 
    region: "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_LABUSER2 || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_LABUSER2 || ""
  }
];

// Function to run Terraform commands to create IAM users
async function runTerraformApply(accountId: string, userId: string, labId: string): Promise<{
  output: string;
  username: string;
  password: string;
}> {
  try {
    // Get a random lab ID portion and user ID portion for the username
    const labIdPart = labId.substring(0, 4);
    const userIdPart = userId.substring(0, 4);
    // Add timestamp to ensure uniqueness
    const timestamp = Date.now().toString().substring(7);
    const dirName = `lab-user-${labIdPart}-${userIdPart}-${timestamp}`;
    
    // Get the AWS account credentials
    const account = AWS_ACCOUNTS.find(acc => acc.id === accountId);
    if (!account) {
      throw new Error(`Account not found for ID: ${accountId}`);
    }
    
    // Determine which user account to use based on account ID
    const accountIndex = AWS_ACCOUNTS.findIndex(acc => acc.id === accountId);
    const username = accountIndex === 0 ? "LabUser1" : "LabUser2";
    
    // Create a unique directory for this user's terraform files
    const terraformDir = path.join(process.cwd(), "terraform");
    const userTerraformDir = path.join(terraformDir, "generated", dirName);
    try {
      await fs.mkdir(userTerraformDir, { recursive: true });
    } catch (err) {
      console.log("Directory already exists or creation failed:", err);
    }
    
    // Generate a random password that meets AWS requirements
    // AWS requires min length of 8, and at least one of each: uppercase, lowercase, number, special
    const generatePassword = () => {
      const lowercase = 'abcdefghijklmnopqrstuvwxyz';
      const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const numbers = '0123456789';
      const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      
      let password = '';
      
      // Ensure at least one of each required character type
      password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
      password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
      password += numbers.charAt(Math.floor(Math.random() * numbers.length));
      password += special.charAt(Math.floor(Math.random() * special.length));
      
      // Add more random characters to reach desired length (16)
      const allChars = lowercase + uppercase + numbers + special;
      for (let i = password.length; i < 16; i++) {
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
      }
      
      // Shuffle the password characters
      return password.split('').sort(() => 0.5 - Math.random()).join('');
    };
    
    const password = generatePassword();
    console.log(`Generated secure password for user ${username}`);
    
    // Create a Node.js script to update the IAM user's password using AWS SDK
    const updatePasswordScript = `
    const { IAMClient, DeleteLoginProfileCommand, CreateLoginProfileCommand } = require("@aws-sdk/client-iam");
    
    async function updateUserPassword() {
      try {
        // Create AWS IAM client
        const client = new IAMClient({
          region: "${account.region}",
          credentials: {
            accessKeyId: "${account.accessKeyId}",
            secretAccessKey: "${account.secretAccessKey}"
          }
        });
        
        // First try to delete existing login profile
        try {
          const deleteCommand = new DeleteLoginProfileCommand({
            UserName: "${username}"
          });
          await client.send(deleteCommand);
          console.log("Deleted existing login profile");
        } catch (err) {
          // Ignore error if login profile doesn't exist
          console.log("No existing login profile found or unable to delete");
        }
        
        // Create new login profile with our password
        const createCommand = new CreateLoginProfileCommand({
          UserName: "${username}",
          Password: "${password}",
          PasswordResetRequired: false
        });
        
        const response = await client.send(createCommand);
        console.log("Successfully created new login profile");
        process.exit(0);
      } catch (err) {
        console.error("Error updating password:", err);
        process.exit(1);
      }
    }
    
    updateUserPassword();
    `;
    
    // Write the Node.js script to a file
    const scriptPath = path.join(userTerraformDir, "update-password.js");
    await fs.writeFile(scriptPath, updatePasswordScript);
    
    // Create a package.json file to ensure AWS SDK is available
    const packageJson = `{
      "name": "update-password",
      "version": "1.0.0",
      "description": "Update IAM user password",
      "dependencies": {
        "@aws-sdk/client-iam": "^3.300.0"
      }
    }`;
    
    const packageJsonPath = path.join(userTerraformDir, "package.json");
    await fs.writeFile(packageJsonPath, packageJson);
    
    // Install dependencies and run the script
    console.log("Installing AWS SDK dependencies...");
    const installCommand = `cd ${userTerraformDir} && npm install`;
    await execAsync(installCommand);
    
    console.log("Running password update script...");
    const runScriptCommand = `cd ${userTerraformDir} && node update-password.js`;
    const scriptResult = await execAsync(runScriptCommand);
    console.log("Script output:", scriptResult.stdout);
    if (scriptResult.stderr) console.error("Script error:", scriptResult.stderr);
    
    console.log("Password update completed successfully");
    
    return {
      output: scriptResult.stdout + (scriptResult.stderr ? "\nErrors:\n" + scriptResult.stderr : ""),
      username: username,
      password: password
    };
  } catch (error) {
    console.error("Error updating password:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Password update failed: ${errorMessage}`);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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
      // Get the lab ID from URL parameters
      const labId = params.id;
      
      console.log(`Starting lab with ID: ${labId}`);
      
      // First, verify the lab exists in the database
      const lab = await prisma.lab.findUnique({
        where: { id: labId }
      });
      
      if (!lab) {
        return NextResponse.json({ error: "Lab not found" }, { status: 404 });
      }

      // Check if user already has an active session in the database
      const activeSession = await prisma.labSession.findFirst({
        where: {
          userId: userId,
          status: "ACTIVE"
        }
      });

      if (activeSession) {
        // If the user already has an active session, return it instead of creating a new one
        console.log("Found existing active session:", activeSession.id);
        
        // The username will be LabUser1 or LabUser2 based on the account ID
        const accountIndex = AWS_ACCOUNTS.findIndex(acc => acc.id === activeSession.awsAccountId);
        const username = accountIndex === 0 ? "LabUser1" : "LabUser2";
        
        // Use the direct sign-in URL for the AWS account
        const consoleUrl = `https://${activeSession.awsAccountId}.signin.aws.amazon.com/console`;
        
        return NextResponse.json({
          sessionId: activeSession.id,
          message: "Using existing lab session",
          terraformOutput: "Re-using existing Terraform resources",
          credentials: {
            accountId: activeSession.awsAccountId,
            username: username,
            password: activeSession.password,
            region: "us-east-1",
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

      console.log(`Using AWS account: ${availableAccount.id}`);
      
      // Determine the username based on account (LabUser1 or LabUser2)
      const accountIndex = AWS_ACCOUNTS.findIndex(acc => acc.id === availableAccount.id);
      const username = accountIndex === 0 ? "LabUser1" : "LabUser2";
      
      // Create a unique directory name for this session's Terraform files
      const labIdPart = labId.substring(0, 4);
      const userIdPart = userId.substring(0, 4);
      const timestamp = Date.now().toString().substring(7);
      const dirName = `lab-user-${labIdPart}-${userIdPart}-${timestamp}`;
      
      // Run Terraform to create/reset password for the IAM user
      console.log(`Running Terraform to create/reset IAM user password for ${username}`);
      const terraformResult = await runTerraformApply(availableAccount.id, userId, labId);
      
      // AWS console sign-in URL 
      const consoleUrl = `https://${availableAccount.id}.signin.aws.amazon.com/console`;

      // Create lab session with IAM user details
      const labSession = await prisma.labSession.create({
        data: {
          labId,
          userId: userId,
          awsAccountId: availableAccount.id,
          password: terraformResult.password,
          aws_access_key_id: dirName, // Store directory name for cleanup
          expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
          status: "ACTIVE"
        }
      });
      
      console.log(`Created new lab session with ID: ${labSession.id}`);

      return NextResponse.json({
        sessionId: labSession.id,
        message: "Terraform successfully created IAM user",
        terraformOutput: terraformResult.output,
        credentials: {
          accountId: availableAccount.id,
          username: terraformResult.username,
          password: terraformResult.password,
          region: availableAccount.region,
          consoleUrl
        }
      });
    } finally {
      // Always clean up the lock when done
      processingRequests.delete(userId);
    }
  } catch (error) {
    // Safely log the error without causing another error
    console.error("Error starting lab:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ 
      error: "Failed to start lab", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}