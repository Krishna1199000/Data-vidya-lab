import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const prisma = new PrismaClient();
const execAsync = promisify(exec);

// Function to get the correct Terraform command based on the environment
function getTerraformCommand() {
  // Check if we're in a production environment (Vercel)
  if (process.env.VERCEL) {
    return path.join(process.cwd(), 'lib', 'terraform', 'terraform');
  }
  // For local development, just use 'terraform'
  return 'terraform';
}

async function copyDirectory(src: string, dest: string) {
  try {
    // Create destination directory if it doesn't exist
    await fs.mkdir(dest, { recursive: true });

    // Read all files from source directory
    const files = await fs.readdir(src);

    // Copy each file
    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);

      const stat = await fs.stat(srcPath);
      if (stat.isDirectory()) {
        // Recursively copy subdirectories
        await copyDirectory(srcPath, destPath);
      } else {
        // Copy file
        await fs.copyFile(srcPath, destPath);
      }
    }
  } catch (error) {
    console.error('Error copying directory:', error);
    throw error;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
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

    // Get the lab details to retrieve selected services and duration
    const lab = await prisma.lab.findUnique({
      where: { id: resolvedParams.id },
      select: {
        id: true,
        services: true,
        duration: true,
      },
    });

    if (!lab) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404 });
    }

    // Determine which account to use based on active sessions
    const accountNumber = activeSessions + 1;
    const sourceTerraformDir = path.join(process.cwd(), 'terraform', `account${accountNumber}`);
    const tmpDir = path.join(os.tmpdir(), `terraform-account${accountNumber}`);
    const accountId = accountNumber === 1 ? '124744987862' : '104023954744';

    // Create variables file for terraform to use the lab services
    const servicesVar = lab.services && lab.services.length > 0 
      ? lab.services 
      : ['S3']; // Default to S3 if no services are specified
    
    // Log the services being enabled for this lab session
    console.log(`Starting lab with services: ${JSON.stringify(servicesVar)}`);
    
    try {
      // Copy terraform directory to temp directory
      await copyDirectory(sourceTerraformDir, tmpDir);
      console.log(`Copied terraform directory to ${tmpDir}`);

      // Create terraform.tfvars file in the temp directory
      const variablesFile = path.join(tmpDir, 'terraform.tfvars');
      await fs.writeFile(variablesFile, `services_list = ${JSON.stringify(servicesVar)}\n`);
      console.log(`Created terraform.tfvars in ${tmpDir}`);

      // Set AWS credentials for Terraform as environment variables
      const env = {
        ...process.env,
        AWS_ACCESS_KEY_ID: process.env[`AWS_ACCESS_KEY_ID_LABUSER${accountNumber}`],
        AWS_SECRET_ACCESS_KEY: process.env[`AWS_SECRET_ACCESS_KEY_LABUSER${accountNumber}`],
        TF_VAR_username: `student${accountNumber}-${Date.now()}`,
      };

      const terraformCmd = getTerraformCommand();

      // Initialize Terraform
      console.log('Initializing Terraform...');
      await execAsync(`${terraformCmd} init -reconfigure`, {
        cwd: tmpDir,
        env,
      });
      
      console.log('Applying Terraform configuration...');
      const applyResult = await execAsync(`${terraformCmd} apply -auto-approve`, { 
        cwd: tmpDir,
        env,
        timeout: 300000, // 5 minute timeout
      });
      
      console.log('Terraform apply output:', applyResult.stdout);
      if (applyResult.stderr) {
        console.warn('Terraform apply stderr:', applyResult.stderr);
      }

      // Get outputs separately to handle sensitive values
      const { stdout: userName } = await execAsync(`${terraformCmd} output -raw user_name`, { 
        cwd: tmpDir,
        env,
      });
      const { stdout: accessKeyId } = await execAsync(`${terraformCmd} output -raw access_key_id`, { 
        cwd: tmpDir,
        env,
      });
      const { stdout: secretAccessKey } = await execAsync(`${terraformCmd} output -raw secret_access_key`, { 
        cwd: tmpDir,
        env,
      });
      const { stdout: password } = await execAsync(`${terraformCmd} output -raw password`, { 
        cwd: tmpDir,
        env,
      });

      // Calculate expiration time based on lab duration
      const expiresAt = new Date(Date.now() + (lab.duration * 60 * 1000)); // Convert minutes to milliseconds

      // Create lab session in database
      const labSession = await prisma.labSession.create({
        data: {
          labId: resolvedParams.id,
          userId: session.user.id,
          awsAccountId: accountId,
          awsUsername: userName.trim(),
          aws_access_key_id: accessKeyId.trim(),
          aws_secret_access_key: secretAccessKey.trim(),
          password: password.trim(),
          expiresAt: expiresAt,
          status: 'ACTIVE',
        },
      });

      // Clean up tmp directory
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
        console.log(`Cleaned up temporary directory: ${tmpDir}`);
      } catch (cleanupError) {
        console.warn('Error cleaning up temporary directory:', cleanupError);
      }

      return NextResponse.json({
        sessionId: labSession.id,
        credentials: {
          accountId: accountId,
          username: userName.trim(),
          password: password.trim(),
          accessKeyId: accessKeyId.trim(),
          secretAccessKey: secretAccessKey.trim(),
          region: 'ap-south-1',
          consoleUrl: `https://${accountId}.signin.aws.amazon.com/console`,
        },
        expiresAt: expiresAt.toISOString(),
        services: servicesVar,
      });
    } catch (error) {
      // Clean up tmp directory in case of error
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
        console.log(`Cleaned up temporary directory after error: ${tmpDir}`);
      } catch (cleanupError) {
        console.warn('Error cleaning up temporary directory:', cleanupError);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error starting lab:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start lab environment' },
      { status: 500 }
    );
  }
}