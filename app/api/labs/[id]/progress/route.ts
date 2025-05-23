import { NextResponse,NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

interface Step {
  id: string;
  title: string;
  substeps?: Step[];
}

interface RawStepData {
  id?: string | number;
  title?: string;
  substeps?: RawStepData[];
}

// Helper function to parse and validate steps data from JSON
function parseSteps(rawSteps: unknown): Step[] { // Accept unknown type initially
  if (!Array.isArray(rawSteps)) {
    // If not an array, return empty array
    return [];
  }

  return rawSteps.map((rawStep: unknown) => { // Accept unknown type for individual raw steps
    // Ensure rawStep is an object before trying to access properties
    if (typeof rawStep !== 'object' || rawStep === null) {
      return null; // Return null for invalid step data
    }

    // Cast to RawStepData for safer property access within the map
    const stepData = rawStep as RawStepData;

    const step: Step = {
      id: typeof stepData.id === 'string' ? stepData.id : String(stepData.id || ''), // Ensure ID is string, fallback to empty string
      title: typeof stepData.title === 'string' ? stepData.title : 'Untitled Step', // Ensure title is string
    };

    // Recursively parse substeps if they exist and are an array
    if (stepData.substeps && Array.isArray(stepData.substeps)) {
      // Cast substeps to unknown[] before recursive call
      step.substeps = parseSteps(stepData.substeps as unknown[]);
    }

    return step;
  }).filter((step): step is Step => step !== null && typeof step.id === 'string' && step.title.length > 0); // Filter out nulls and steps with invalid ID or empty title
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const progress = await prisma.labProgress.findMany({
      where: {
        userId: session.user.id,
        labId: resolvedParams.id,
      },
    });

    const lab = await prisma.lab.findUnique({
      where: { id: resolvedParams.id },
      select: { steps: true },
    });

    if (!lab) {
      return new NextResponse("Lab not found", { status: 404 });
    }

    // Use the helper function to parse and validate steps
    const steps: Step[] = parseSteps(lab.steps);

    const totalSteps = steps.length;
    const completedSteps = progress.filter(p => p.status === "CHECKED").length;
    const completionPercentage = Math.round((completedSteps / totalSteps) * 100);

    return NextResponse.json({
      progress,
      completionPercentage,
      totalSteps,
      completedSteps,
    });
  } catch (error) {
    console.error("[PROGRESS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { stepId, status } = body;

    if (!stepId || !status) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const progress = await prisma.labProgress.upsert({
      where: {
        userId_labId_stepId: {
          userId: session.user.id,
          labId: resolvedParams.id,
          stepId,
        },
      },
      update: {
        status,
      },
      create: {
        userId: session.user.id,
        labId: resolvedParams.id,
        stepId,
        status,
      },
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.error("[PROGRESS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 