import { type NextRequest, NextResponse } from "next/server"
import db from "../../../../src/index"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../api/auth.config"
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

async function generateSignedUrl(key: string) {
  if (!key) return null
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
  })
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params; // Await the params if they are a Promise

  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only administrators can edit labs" }, { status: 403 })
    }

    const existingLab = await db.lab.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!existingLab) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 })
    }

    if (existingLab.authorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden: You can only edit your own labs" }, { status: 403 })
    }

    const formData = await request.formData()
    const updateData: Record<string, unknown> = {};

    const fields = [
      "title",
      "description",
      "difficulty",
      "duration",
      "objectives",
      "audience",
      "prerequisites",
      "environment",
      "coveredTopics",
      "steps",
      "published",
    ]

    fields.forEach((field) => {
      const value = formData.get(field)
      if (value !== null) {
        if (field === "duration") {
          updateData[field] = Number.parseInt(value as string)
        } else if (["objectives", "coveredTopics", "environment", "steps"].includes(field)) {
          updateData[field] = JSON.parse(value as string)
        } else if (field === "published") {
          updateData[field] = value === "true"
        } else {
          updateData[field] = value
        }
      }
    })

    const environmentImageBefore = formData.get("environmentImageBefore") as File
    const environmentImageAfter = formData.get("environmentImageAfter") as File

    if (environmentImageBefore) {
      const imageUrl = await uploadToS3(environmentImageBefore)
      updateData.environmentImageBefore = imageUrl
    }

    if (environmentImageAfter) {
      const imageUrl = await uploadToS3(environmentImageAfter)
      updateData.environmentImageAfter = imageUrl
    }

    const lab = await db.lab.update({
      where: { id: resolvedParams.id },
      data: updateData,
    })

    return NextResponse.json(lab)
  } catch (error) {
    console.error("Update error:", error)
    return NextResponse.json({ error: "Failed to update lab" }, { status: 500 })
  }
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {

  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only administrators can delete labs" }, { status: 403 })
    }

    const resolvedParams = await params;
    const existingLab = await db.lab.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!existingLab) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 })
    }

    if (existingLab.authorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden: You can only delete your own labs" }, { status: 403 })
    }

    if (existingLab.environmentImageBefore) {
      await deleteFromS3(existingLab.environmentImageBefore)
    }

    if (existingLab.environmentImageAfter) {
      await deleteFromS3(existingLab.environmentImageAfter)
    }

    await db.lab.delete({
      where: { id: resolvedParams.id },
    })

    return NextResponse.json({ message: "Lab deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ error: "Failed to delete lab" }, { status: 500 })
  }
}


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;

  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const lab = await db.lab.findUnique({
      where: { id: resolvedParams.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    if (!lab) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 })
    }

    // Fetch active lab session for the current user and lab
    const activeLabSession = await db.labSession.findFirst({
      where: {
        userId: session.user.id,
        labId: resolvedParams.id,
        status: "ACTIVE",
      },
      select: { // Select necessary fields for the frontend
        id: true,
        awsAccountId: true,
        awsUsername: true,
        password: true,
        aws_access_key_id: true,
        aws_secret_access_key: true,
        aws_session_token: true,
        expiresAt: true,
      },
    });

    const environmentImageBefore = lab.environmentImageBefore
      ? await generateSignedUrl(lab.environmentImageBefore.split(".com/")[1] || "")
      : null;
    const environmentImageAfter = lab.environmentImageAfter
      ? await generateSignedUrl(lab.environmentImageAfter.split(".com/")[1] || "")
      : null;

    const labWithOwnership = {
      ...lab,
      environmentImageBefore,
      environmentImageAfter,
      isOwner: session.user.role === "ADMIN" && session.user.id === lab.authorId,
    }

    // Safely parse steps if they exist
    let parsedSteps = null;
    try {
      if (lab.steps) {
        parsedSteps = JSON.parse(JSON.stringify(lab.steps));
      }
    } catch (parseError) {
      console.error("Error parsing lab steps:", parseError);
    }

    const labWithParsedSteps = {
      ...labWithOwnership,
      steps: parsedSteps,
    }

    // Include activeLabSession in the response
    const responseData = {
      ...labWithParsedSteps,
      activeLabSession: activeLabSession, // Include session data
    };

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Fetch error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Failed to fetch lab" },
      { status: 500 }
    )
  }
}

async function uploadToS3(file: File): Promise<string> {
  const filename = `${Date.now()}-${file.name}`
  const bucketName = process.env.AWS_S3_BUCKET_NAME!

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filename,
    ContentType: file.type,
  })

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

  const response = await fetch(signedUrl, {
    method: "PUT",
    body: await file.arrayBuffer(),
    headers: {
      "Content-Type": file.type,
    },
  })

  if (!response.ok) {
    throw new Error("Failed to upload file to S3")
  }

  return `https://${bucketName}.s3.amazonaws.com/${filename}`
}

async function deleteFromS3(url: string) {
  const bucketName = process.env.AWS_S3_BUCKET_NAME!;
  
  try {
    // Extract the key from the S3 URL
    const key = url.split('.com/')[1];
    
    if (!key) {
      console.warn("Could not extract S3 key from URL:", url);
      return;
    }

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error("Error deleting from S3:", error);
    // Don't throw the error, just log it and continue
  }
}