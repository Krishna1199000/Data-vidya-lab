import { NextRequest, NextResponse } from "next/server";
import { getServerSession, DefaultSession } from "next-auth";
import { authOptions } from "../../api/auth.config";
import db from "../../../src/index";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function uploadToS3(file: File, prefix: string): Promise<string> {
  try {
    const filename = `${prefix}-${Date.now()}-${file.name}`;
    const bucketName = process.env.AWS_S3_BUCKET_NAME!;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      ContentType: file.type,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const arrayBuffer = await file.arrayBuffer();
    
    const response = await fetch(signedUrl, {
      method: "PUT",
      body: arrayBuffer,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file to S3: ${response.status}`);
    }

    return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;
  } catch (error) {
    console.error("S3 upload error:", error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    interface CustomSession extends DefaultSession {
      user: DefaultSession["user"] & {
        id: string;
        role?: string;
      };
    }
    
    const session = (await getServerSession(authOptions)) as CustomSession;

    if (!session?.user?.id) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized: You must be logged in to create a lab" }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse(
        JSON.stringify({ error: "Forbidden: Only administrators can create labs" }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.formData();

    // Validate required fields
    const requiredFields = ["title", "duration"];
    const missingFields = requiredFields.filter((field) => {
      const value = formData.get(field);
      return value === null || value === undefined || value === "";
    });

    if (missingFields.length > 0) {
      return new NextResponse(
        JSON.stringify({ error: `Missing required fields: ${missingFields.join(", ")}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle image uploads
    const environmentImageBefore = formData.get("environmentImageBefore") as File | null;
    const environmentImageAfter = formData.get("environmentImageAfter") as File | null;
    let beforeImagePath = null;
    let afterImagePath = null;

    try {
      if (environmentImageBefore) {
        beforeImagePath = await uploadToS3(environmentImageBefore, 'before');
      }
      if (environmentImageAfter) {
        afterImagePath = await uploadToS3(environmentImageAfter, 'after');
      }
    } catch (error) {
      console.error("Image upload error:", error);
      return new NextResponse(
        JSON.stringify({ error: "Failed to upload images" }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON fields
    let objectives = [];
    let coveredTopics = [];
    let steps = {};
    let services: string[] = [];

    try {
      const objectivesStr = formData.get("objectives");
      const coveredTopicsStr = formData.get("coveredTopics");
      const stepsStr = formData.get("steps");
      const servicesStr = formData.get("services");

      objectives = objectivesStr ? JSON.parse(objectivesStr as string) : [];
      coveredTopics = coveredTopicsStr ? JSON.parse(coveredTopicsStr as string) : [];
      steps = stepsStr ? JSON.parse(stepsStr as string) : {};
      services = servicesStr ? JSON.parse(servicesStr as string) : [];
    } catch (error) {
      console.error("JSON parsing error:", error);
      return new NextResponse(
        JSON.stringify({ error: "Invalid JSON data" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const duration = parseInt(formData.get("duration") as string, 10);
    if (isNaN(duration) || duration <= 0) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid duration value" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create lab with validated data
    const lab = await db.lab.create({
      data: {
        title: formData.get("title") as string,
        difficulty: (formData.get("difficulty") as string || "BEGINNER") as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
        duration,
        description: (formData.get("description") as string) || null,
        objectives,
        audience: (formData.get("audience") as string) || null,
        prerequisites: (formData.get("prerequisites") as string) || null,
        coveredTopics,
        steps,
        authorId: session.user.id,
        published: false,
        environmentImageBefore: beforeImagePath,
        environmentImageAfter: afterImagePath,
        services,
      },
    });

    return new NextResponse(
      JSON.stringify({ success: true, data: lab }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error creating lab:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to create lab" }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

interface DbLabResponse {
  id: string;
  title: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  duration: number;
  description: string | null;
  objectives: string | string[];
  audience: string | null;
  prerequisites: string | null;
  coveredTopics: string | string[];
  steps: string | Record<string, any>;
  authorId: string;
  published: boolean;
  environmentImageBefore: string | null;
  environmentImageAfter: string | null;
  services: string | string[];
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface Lab extends Omit<DbLabResponse, 'steps' | 'objectives' | 'coveredTopics' | 'services'> {
  objectives: string[];
  coveredTopics: string[];
  steps: Record<string, { [key: string]: string | number | boolean | object }>;
  services: string[];
  isOwner: boolean;
}

export async function GET() {
  try {
    interface CustomSession extends DefaultSession {
      user: DefaultSession["user"] & {
        id: string;
        role?: string;
      };
    }

    const session = (await getServerSession(authOptions)) as CustomSession;

    const labs = await db.lab.findMany({
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }) as DbLabResponse[]
    
    const labsWithOwnership: Lab[] = labs.map((lab) => {
      const parsedObjectives = typeof lab.objectives === "string" 
        ? JSON.parse(lab.objectives) 
        : lab.objectives;

      const parsedCoveredTopics = typeof lab.coveredTopics === "string"
        ? JSON.parse(lab.coveredTopics)
        : lab.coveredTopics;

      const parsedSteps = lab.steps && typeof lab.steps === "string"
        ? JSON.parse(lab.steps)
        : lab.steps || {};

      const parsedServices = typeof lab.services === "string"
        ? JSON.parse(lab.services)
        : lab.services || [];

      return {
        ...lab,
        objectives: parsedObjectives,
        coveredTopics: parsedCoveredTopics,
        steps: parsedSteps as Record<string, { [key: string]: string | number | boolean | object }>,
        services: parsedServices,
        isOwner: session?.user?.role === "ADMIN" && session?.user?.id === lab.authorId,
      };
    });

    return new NextResponse(
      JSON.stringify(labsWithOwnership),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ error: (error as { message: string }).message || "Failed to fetch labs" } ),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}