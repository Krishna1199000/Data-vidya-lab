import { type NextRequest } from "next/server"
import { NextResponse } from "next/server"
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

async function uploadToS3(file: File): Promise<string> {
  try {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File size exceeds the limit of 5MB")
    }

    const filename = `profile-${Date.now()}-${file.name}`
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
  } catch (error) {
    console.error("Error in uploadToS3:", error)
    throw error
  }
}

async function deleteFromS3(url: string) {
  if (!url) return
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME!
    const key = url.split(`https://${bucketName}.s3.amazonaws.com/`)[1]
    if (!key) return

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })

    await s3Client.send(command)
  } catch (error) {
    console.error("Error in deleteFromS3:", error)
  }
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

    const profile = await db.profile.findUnique({
      where: { userId: resolvedParams.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
        
          },
        },
      },
    })

    if (!profile || (profile.userId !== session.user.id && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const updateData: { [key: string]: string | null } = {}

    // Handle text fields
    const fields = ["bio", "role", "company", "location", "github", "twitter", "linkedin"]
    fields.forEach((field) => {
      const value = formData.get(field)
      if (value !== null) {
        updateData[field] = value === "" ? null : value.toString()
      }
    })

    // Handle profile image
    const image = formData.get("image") as File | null
    if (image && image.size > 0) {
      try {
        // Delete old image if it exists
        if (profile.user.image) {
          await deleteFromS3(profile.user.image)
        }

        // Upload new image
        const imageUrl = await uploadToS3(image)
        
        // Update user's image
        await db.user.update({
          where: { id: profile.user.id },
          data: { image: imageUrl },
        })

        // Update profile with new image URL
        profile.user.image = imageUrl
      } catch (error) {
        console.error("Error handling image upload:", error)
        return NextResponse.json({ error: "Failed to upload image" }, { status: 500 })
      }
    }

    // Update profile
    const updatedProfile = await db.profile.update({
      where: { userId: resolvedParams.id },
      data: updateData,
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

    // Generate signed URLs for the response
    const userImage = updatedProfile.user.image
      ? await generateSignedUrl(updatedProfile.user.image.split(".com/")[1] || "")
      : null
    const profileImage = updatedProfile.image
      ? await generateSignedUrl(updatedProfile.image.split(".com/")[1] || "")
      : null

    const profileWithSignedUrls = {
      ...updatedProfile,
      image: profileImage,
      user: {
        ...updatedProfile.user,
        image: userImage
      }
    }

    return NextResponse.json(profileWithSignedUrls)
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json({ 
      error: "Failed to update profile",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;

  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profile = await db.profile.findUnique({
      where: { userId: resolvedParams.id },
      select: {
        userId: true,
        image: true,
      },
    })

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    if (profile.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (profile.image) {
      await deleteFromS3(profile.image)
    }

    await db.profile.delete({
      where: { userId: resolvedParams.id },
    })

    await db.user.update({
      where: { id: resolvedParams.id },
      data: { image: null },
    })

    return NextResponse.json({ message: "Profile deleted successfully" })
  } catch (error) {
    console.error("Profile deletion error:", error)
    return NextResponse.json({ 
      error: "Failed to delete profile",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
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

    const profile = await db.profile.findUnique({
      where: { userId: resolvedParams.id },
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
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Generate signed URLs for images
    const userImage = profile.user.image
      ? await generateSignedUrl(profile.user.image.split(".com/")[1] || "")
      : null
    const profileImage = profile.image
      ? await generateSignedUrl(profile.image.split(".com/")[1] || "")
      : null

    const profileWithSignedUrls = {
      ...profile,
      image: profileImage,
      user: {
        ...profile.user,
        image: userImage
      }
    }

    return NextResponse.json(profileWithSignedUrls)
  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch profile",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}