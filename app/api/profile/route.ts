import { type NextRequest } from "next/server"
import db from "../../../src/index"
import { getServerSession } from "next-auth"
import { authOptions } from "../../api/auth.config"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

async function uploadToS3(file: File): Promise<string> {
  try {
    console.log("Starting S3 upload for file:", file.name)
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    if (buffer.length > 5 * 1024 * 1024) {
      throw new Error("File size exceeds the limit of 5MB")
    }

    const filename = `profile-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`
    const bucketName = process.env.AWS_S3_BUCKET_NAME

    if (!bucketName) {
      throw new Error("AWS_S3_BUCKET_NAME is not configured")
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      Body: buffer,
      ContentType: file.type,
    })

    await s3Client.send(command)
    return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`
  } catch (error) {
    console.error("Error in uploadToS3:", error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    // First, verify that the user exists
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    const formData = await req.formData()
    interface ProfileData {
      userId: string;
      bio?: string;
      role?: string;
      company?: string;
      location?: string;
      github?: string;
      twitter?: string;
      linkedin?: string;
      image?: string;
    }

    const profileData: ProfileData = {
      userId: session.user.id,
    }

    // Handle text fields
    const fields: (keyof ProfileData)[] = ["bio", "role", "company", "location", "github", "twitter", "linkedin"]
    fields.forEach((field) => {
      const value = formData.get(field)
      if (value !== null && value !== "") {
        profileData[field] = value.toString() as string
      }
    })

    // Handle profile image
    const image = formData.get("image") as File | null
    if (image) {
      try {
        const imageUrl = await uploadToS3(image)
        profileData.image = imageUrl

        // Update user's image
        await db.user.update({
          where: { 
            id: session.user.id,
          },
          data: { 
            image: imageUrl,
          },
        })
      } catch (uploadError) {
        console.error("Upload error:", uploadError)
        return new Response(
          JSON.stringify({
            error: "Failed to upload image",
            details: uploadError instanceof Error ? uploadError.message : "Unknown error",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        )
      }
    }

    // Check if profile exists
    const existingProfile = await db.profile.findUnique({
      where: { userId: session.user.id },
    })

    let profile
    try {
      if (existingProfile) {
        profile = await db.profile.update({
          where: { userId: session.user.id },
          data: profileData,
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true,
              },
            },
          },
        })
      } else {
        profile = await db.profile.create({
          data: profileData,
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true,
              },
            },
          },
        })
      }
    } catch (dbError) {
      console.error("Database error:", dbError)
      return new Response(
        JSON.stringify({
          error: "Failed to save profile in database",
          details: dbError instanceof Error ? dbError.message : "Unknown database error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      )
    }

    return new Response(JSON.stringify(profile), { 
      status: existingProfile ? 200 : 201, 
      headers: { "Content-Type": "application/json" } 
    })
  } catch (error) {
    console.error("General error:", error)
    return new Response(
      JSON.stringify({
        error: "Failed to process profile update",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify(profile), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to fetch profile",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}