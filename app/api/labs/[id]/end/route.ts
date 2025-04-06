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

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get the lab session
    const labSession = await prisma.labSession.findUnique({
      where: { id: sessionId },
    });

    if (!labSession) {
      return NextResponse.json(
        { error: 'Lab session not found' },
        { status: 404 }
      );
    }

    // Determine which account was used
    const accountNumber = labSession.awsAccountId.includes('1') ? 1 : 2;
    const terraformDir = path.join(process.cwd(), 'terraform', `account${accountNumber}`);

    // Destroy Terraform resources
    await execAsync('terraform destroy -auto-approve', { cwd: terraformDir });

    // Update lab session status
    await prisma.labSession.update({
      where: { id: sessionId },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
      },
    });

    return NextResponse.json({ message: 'Lab environment destroyed successfully' });
  } catch (error) {
    console.error('Error ending lab:', error);
    return NextResponse.json(
      { error: 'Failed to end lab environment' },
      { status: 500 }
    );
  }
}