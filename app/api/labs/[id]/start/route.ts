import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/app/api/auth.config";
import prisma from "@/src/index";
import { LabSessionStatus } from "@prisma/client"; 
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
// Import crypto for password generation
import crypto from 'crypto';
// Import SDK components needed for setting password later
import { IAMClient, UpdateLoginProfileCommand } from "@aws-sdk/client-iam"; 

const execAsync = promisify(exec);

// Function to generate a random password (meeting basic AWS requirements)
function generatePassword(length = 16) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";
  let password = "";
  // Ensure at least one of each required type
  password += "abcdefghijklmnopqrstuvwxyz"[crypto.randomInt(26)];
  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[crypto.randomInt(26)];
  password += "0123456789"[crypto.randomInt(10)];
  password += "!@#$%^&*()_+-="[crypto.randomInt(14)];
  
  for (let i = password.length; i < length; i++) {
    password += charset[crypto.randomInt(charset.length)];
  }
  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

// Define the background provisioning function
// Add username and password parameters
async function provisionLabResources(sessionId: string, terraformDir: string, accountId: string, username: string, passwordToSet: string) {
  try {
    console.log(`Starting Terraform provisioning for session: ${sessionId} in ${terraformDir}`);
    
    // Set AWS credentials for Terraform as environment variables
    const accountNumber = accountId === "124744987862" ? "1" : "2"
    const env = {
        ...process.env,
        AWS_ACCESS_KEY_ID: process.env[`AWS_ACCESS_KEY_ID_LABUSER${accountNumber}`],
        AWS_SECRET_ACCESS_KEY: process.env[`AWS_SECRET_ACCESS_KEY_LABUSER${accountNumber}`],
    }

    // Escape username for shell command safety, though TF vars are generally safe
    const safeUsername = username.replace(/\'/g, "'\\\''");
    const terraformVars = `-var="user_name_tf='${safeUsername}'"`;

    await execAsync('terraform init', { cwd: terraformDir, env });
    // Pass the username variable to apply
    await execAsync(`terraform apply -auto-approve ${terraformVars}`, { cwd: terraformDir, env });

    // Get outputs (excluding password and username as they are pre-determined or passed)
    const { stdout: accessKeyId } = await execAsync('terraform output -raw access_key_id', { cwd: terraformDir, env });
    const { stdout: secretAccessKey } = await execAsync('terraform output -raw secret_access_key', { cwd: terraformDir, env });
    const { stdout: bucketName } = await execAsync('terraform output -raw bucket_name', { cwd: terraformDir, env });

    console.log(`Terraform apply successful for session: ${sessionId}. Setting IAM password.`);

    // *** Set the IAM User Password using AWS SDK ***
    try {
      const iamCredentials = {
        accessKeyId: process.env[`AWS_ACCESS_KEY_ID_LABUSER${accountNumber}`] || '',
        secretAccessKey: process.env[`AWS_SECRET_ACCESS_KEY_LABUSER${accountNumber}`] || '',
      };
      if (!iamCredentials.accessKeyId || !iamCredentials.secretAccessKey) {
        throw new Error(`Missing admin credentials for account ${accountNumber}`);
      }
      const iamClient = new IAMClient({ region: "ap-south-1", credentials: iamCredentials });
      const updateLoginProfileCommand = new UpdateLoginProfileCommand({
        UserName: username, 
        Password: passwordToSet,
        PasswordResetRequired: false, // User doesn't need to change it immediately
      });
      await iamClient.send(updateLoginProfileCommand);
      console.log(`Successfully set password for IAM user ${username} via SDK.`);
    } catch (sdkError) {
      console.error(`Failed to set password for IAM user ${username} via SDK:`, sdkError);
      // Log error but continue to update DB status as ACTIVE, maybe add a warning field?
      // Or potentially set status to FAILED_PASSWORD_SET?
    }
    // **************************************************

    // Update lab session in database with keys and ACTIVE status
    await prisma.labSession.update({
      where: { id: sessionId },
      data: {
        // Username, Password, AccountId already set during creation
        aws_access_key_id: accessKeyId.trim(),
        aws_secret_access_key: secretAccessKey.trim(),
        // Optionally store bucketName if schema allows
        status: LabSessionStatus.ACTIVE, 
      },
    });
    console.log(`Database updated for session: ${sessionId}`);

  } catch (error) {
    console.error(`Error during Terraform provisioning for session ${sessionId}:`, error);
    // Update lab session status to FAILED
    await prisma.labSession.update({
      where: { id: sessionId },
      data: {
        status: LabSessionStatus.FAILED, 
      },
    });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const labId = resolvedParams.id; 

    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for active lab sessions
    const activeSessions = await prisma.labSession.count({
      where: {
        status: 'ACTIVE',
      },
    });

    if (activeSessions >= 2) {
      return NextResponse.json(
        { error: 'Server is busy. Please try again later.' },
        { status: 429 }
      );
    }

    // Example: Limit user to 1 active/pending session (Adjust as needed)
    const userActiveOrPendingSessions = await prisma.labSession.count({
      where: {
        userId: session.user.id,
        status: { in: [LabSessionStatus.ACTIVE, LabSessionStatus.PENDING] } 
      },
    });

    if (userActiveOrPendingSessions >= 1) {
      return NextResponse.json(
        { error: 'You already have an active or pending lab session.' },
        { status: 409 } // Conflict
      );
    }

    // Check total active/pending sessions for server load limiting
    const totalActiveOrPendingSessions = await prisma.labSession.count({
      where: {
         status: { in: [LabSessionStatus.ACTIVE, LabSessionStatus.PENDING] } 
      },
    });

    if (totalActiveOrPendingSessions >= 2) {
      return NextResponse.json(
        { error: 'Server is busy. Please try again later.' },
        { status: 429 }
      );
    }

    // Determine account and directory
    const accountNumber = (totalActiveOrPendingSessions % 2) + 1;
    const terraformDir = path.join(process.cwd(), 'terraform', `account${accountNumber}`);
    const accountId = accountNumber === 1 ? '124744987862' : '104023954744'; 

    // *** Generate username and password upfront ***
    const randomSuffix = crypto.randomBytes(4).toString('hex'); // 8 hex chars
    const generatedUsername = `student${accountNumber}-${randomSuffix}`;
    const generatedPassword = generatePassword();
    // *******************************************

    // Create INITIAL lab session record, including username/password
    const labSession = await prisma.labSession.create({
      data: {
        labId: labId,
        userId: session.user.id,
        awsAccountId: accountId, 
        awsUsername: generatedUsername, // Store generated username
        password: generatedPassword,   // Store generated password
        expiresAt: new Date(Date.now() + 3600000), 
        startedAt: new Date(), 
        status: LabSessionStatus.PENDING,
      },
    });

    // NOTE: Omitted the immediate update to PENDING as create now includes it.
    console.log(`Created session ${labSession.id} with PENDING status, user ${generatedUsername}`);

    // Trigger the background provisioning process - DO NOT await it
    // Pass generated username and password
    provisionLabResources(labSession.id, terraformDir, accountId, generatedUsername, generatedPassword);

    console.log(`Immediately returning session ID: ${labSession.id} for user ${session.user.id}`);

    // Return only the session ID immediately
    return NextResponse.json({
      sessionId: labSession.id,
    });

  } catch (error) {
    console.error('Error initiating lab start:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to initiate lab session creation' },
      { status: 500 }
    );
  }
}