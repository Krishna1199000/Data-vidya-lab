import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/app/api/auth.config";
import { PrismaClient } from "@prisma/client";
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();
const execAsync = promisify(exec);

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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
      where: { id: params.id },
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
    const terraformDir = path.join(process.cwd(), 'terraform', 'account' + accountNumber);
    const accountId = accountNumber === 1 ? '124744987862' : '104023954744';

    // Create variables file for terraform to use the lab services
    const servicesVar = lab.services && lab.services.length > 0 
      ? lab.services 
      : ['S3']; // Default to S3 if no services are specified
    
    // Log the services being enabled for this lab session
    console.log(`Starting lab with services: ${JSON.stringify(servicesVar)}`);
    
    // Create terraform.tfvars file with the selected services
    const variablesFile = path.join(terraformDir, 'terraform.tfvars');
    fs.writeFileSync(variablesFile, `services_list = ${JSON.stringify(servicesVar)}\n`);

    // Initialize and apply Terraform
    await execAsync('terraform init', { cwd: terraformDir });
    
    // Set a timeout for terraform apply to prevent hanging
    const applyResult = await execAsync('terraform apply -auto-approve', { 
      cwd: terraformDir,
      timeout: 300000, // 5 minute timeout
    });
    
    console.log('Terraform apply output:', applyResult.stdout);
    if (applyResult.stderr) {
      console.warn('Terraform apply stderr:', applyResult.stderr);
    }

    // Get outputs separately to handle sensitive values
    const { stdout: userName } = await execAsync('terraform output -raw user_name', { cwd: terraformDir });
    const { stdout: accessKeyId } = await execAsync('terraform output -raw access_key_id', { cwd: terraformDir });
    const { stdout: secretAccessKey } = await execAsync('terraform output -raw secret_access_key', { cwd: terraformDir });
    const { stdout: password } = await execAsync('terraform output -raw password', { cwd: terraformDir });

    // Calculate expiration time based on lab duration
    const expiresAt = new Date(Date.now() + (lab.duration * 60 * 1000)); // Convert minutes to milliseconds

    // Create lab session in database
    const labSession = await prisma.labSession.create({
      data: {
        labId: params.id,
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
    console.error('Error starting lab:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start lab environment' },
      { status: 500 }
    );
  }
}