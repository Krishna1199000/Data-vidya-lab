import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/app/api/auth.config";
import { PrismaClient } from "@prisma/client";
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

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

    // Determine which account to use based on active sessions
    const accountNumber = activeSessions + 1;
    const terraformDir = path.join(process.cwd(), 'terraform', 'account' + accountNumber);
    const accountId = accountNumber === 1 ? '124744987862' : '104023954744';

    // Initialize and apply Terraform
    await execAsync('terraform init', { cwd: terraformDir });
    await execAsync('terraform apply -auto-approve', { cwd: terraformDir });

    // Get outputs separately to handle sensitive values
    const { stdout: userName } = await execAsync('terraform output -raw user_name', { cwd: terraformDir });
    const { stdout: accessKeyId } = await execAsync('terraform output -raw access_key_id', { cwd: terraformDir });
    const { stdout: secretAccessKey } = await execAsync('terraform output -raw secret_access_key', { cwd: terraformDir });
    const { stdout: password } = await execAsync('terraform output -raw password', { cwd: terraformDir });
    const { stdout: bucketName } = await execAsync('terraform output -raw bucket_name', { cwd: terraformDir });

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
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
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
        s3BucketName: bucketName.trim(),
      },
    });
  } catch (error) {
    console.error('Error starting lab:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start lab environment' },
      { status: 500 }
    );
  }
}