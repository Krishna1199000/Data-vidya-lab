import { NextRequest, NextResponse } from "next/server"
import { getServerSession, DefaultSession } from "next-auth"
import { authOptions } from "../../api/auth.config"
import db from "../../../src/index"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// Define the type for lab with author
interface Author {
  id: string;
  name: string | null;
  email: string | null;
}

interface Lab {
  id: string;
  title: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  duration: number;
  description: string | null;
  objectives: string[];
  audience: string | null;
  prerequisites: string | null;
  coveredTopics: string[];
  steps: Record<string, { [key: string]: string | number | boolean | object }>;
  authorId: string;
  published: boolean;
  environmentImageBefore: string | null;
  environmentImageAfter: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: Author;
  isOwner?: boolean;
  services: string[];
}

// Type for the database response
type DbLabResponse = {
  id: string;
  title: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  duration: number;
  description: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  objectives: string | any[];
  audience: string | null;
  prerequisites: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  coveredTopics: string | any[];
  steps: string | Record<string, { [key: string]: string | number | boolean | object }> | null;
  authorId: string;
  published: boolean;
  environmentImageBefore: string | null;
  environmentImageAfter: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string | null;
    email: string | null;
  };
  services: string[];
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

async function uploadToS3(file: File, prefix: string): Promise<string> {
  try {
    console.log('Starting S3 upload process for:', file.name);
    
    const filename = `${prefix}-${Date.now()}-${file.name}`
    const bucketName = process.env.AWS_S3_BUCKET_NAME!

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      ContentType: file.type,
    })

    // Reduce the expiration time and immediately use the signed URL
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // Reduced to 60 seconds
    
    // Convert File to ArrayBuffer immediately before upload
    const arrayBuffer = await file.arrayBuffer()
    
    // Upload immediately after getting the signed URL
    const response = await fetch(signedUrl, {
      method: "PUT",
      body: arrayBuffer,
      headers: {
        "Content-Type": file.type,
      },
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload error response:', errorText);
      throw new Error(`Failed to upload file to S3: ${response.status} ${errorText}`);
    }

    // Construct the final URL using the AWS S3 URL pattern
    const finalUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;
    console.log('Upload successful. Final URL:', finalUrl);
    return finalUrl;

  } catch (error) {
    console.error("Detailed S3 upload error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    throw error; // Throw the original error to preserve the error message
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
      )
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse(
        JSON.stringify({ error: "Forbidden: Only administrators can create labs" }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const formData = await req.formData()

    // Validate required fields - only title and duration are required
    const requiredFields = [
      "title",
      "duration",
    ]
    
    const missingFields = requiredFields.filter((field) => {
      const value = formData.get(field)
      return value === null || value === undefined || value === ""
    })

    if (missingFields.length > 0) {
      return new NextResponse(
        JSON.stringify({ error: `Missing required fields: ${missingFields.join(", ")}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Handle image uploads
    const environmentImageBefore = formData.get("environmentImageBefore") as File | null
    const environmentImageAfter = formData.get("environmentImageAfter") as File | null
    let beforeImagePath = null
    let afterImagePath = null

    try {
      if (environmentImageBefore) {
        beforeImagePath = await uploadToS3(environmentImageBefore, 'before')
      }

      if (environmentImageAfter) {
        afterImagePath = await uploadToS3(environmentImageAfter, 'after')
      }
    } catch (error) {
      console.error("Image upload error:", error);
      return new NextResponse(
        JSON.stringify({ 
          error: "Failed to upload images", 
          details: error instanceof Error ? error.message : "Unknown error" 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse JSON fields with error handling
    let objectives = []
    let coveredTopics = []
    let steps: Record<string, { [key: string]: string | number | boolean | object }> = {}   
    let services: string[] = []

    try {
      const objectivesStr = formData.get("objectives")
      const coveredTopicsStr = formData.get("coveredTopics")
      const stepsStr = formData.get("steps")
      const servicesStr = formData.get("services")

      objectives = objectivesStr ? JSON.parse(objectivesStr as string) : []
      coveredTopics = coveredTopicsStr ? JSON.parse(coveredTopicsStr as string) : []
      steps = stepsStr ? JSON.parse(stepsStr as string) : {}
      services = servicesStr ? JSON.parse(servicesStr as string) : []
    } catch (error: unknown) {
      console.error(error); 
  
      if ((error as { code: string }).code === "P2002") {
        return new NextResponse(
          JSON.stringify({ error: "A lab with this title already exists" }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    const duration = parseInt(formData.get("duration") as string, 10)
    if (isNaN(duration)) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid duration value" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create lab with validated data
    const lab = await db.lab.create({
      data: {
        title: formData.get("title") as string,
        difficulty: (formData.get("difficulty") as string || "BEGINNER") as
          | "BEGINNER"
          | "INTERMEDIATE"
          | "ADVANCED",
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
    })

    return new NextResponse(
      JSON.stringify({ success: true, data: lab }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    if ((error as { code: string }).code === "P2002") {
      return new NextResponse(
        JSON.stringify({ error: "A lab with this title already exists" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new NextResponse(
      JSON.stringify({ error: (error as { message: string }).message || "Failed to create lab" }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
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