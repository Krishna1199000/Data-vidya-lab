import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../auth.config"
import db from "../../../../../src/index"
import { IAMClient, DeleteUserCommand, DeleteAccessKeyCommand, ListAccessKeysCommand } from "@aws-sdk/client-iam"
import { S3Client, DeleteBucketCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3"

const iamClient = new IAMClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the lab session
    const labSession = await db.labSession.findFirst({
      where: {
        labId: params.id,
        userId: session.user.id,
        status: "ACTIVE",
      },
    })

    if (!labSession) {
      return NextResponse.json({ error: "No active lab session found" }, { status: 404 })
    }

    // Clean up AWS resources
    try {
      // 1. Delete S3 bucket contents and bucket
      if (labSession.awsUsername) {
        // Extract bucket name from username (based on your naming convention)
        const bucketPrefix = labSession.awsAccountId === "1" ? "lab1-" : "lab2-"
        const usernameParts = labSession.awsUsername.split("-")
        const bucketSuffix = usernameParts.length > 1 ? usernameParts[1] : ""
        const bucketName = `${bucketPrefix}${bucketSuffix}`

        // List all objects in the bucket
        const listObjectsCommand = new ListObjectsV2Command({
          Bucket: bucketName,
        })
        const listedObjects = await s3Client.send(listObjectsCommand)

        if (listedObjects.Contents && listedObjects.Contents.length > 0) {
          // Delete all objects
          const deleteObjectsCommand = new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: {
              Objects: listedObjects.Contents.map(({ Key }) => ({ Key })),
            },
          })
          await s3Client.send(deleteObjectsCommand)
        }

        // Delete the bucket
        const deleteBucketCommand = new DeleteBucketCommand({
          Bucket: bucketName,
        })
        await s3Client.send(deleteBucketCommand)
      }

      // 2. Delete IAM user access keys
      if (labSession.awsUsername) {
        const listAccessKeysCommand = new ListAccessKeysCommand({
          UserName: labSession.awsUsername,
        })
        const accessKeys = await iamClient.send(listAccessKeysCommand)

        if (accessKeys.AccessKeyMetadata) {
          for (const key of accessKeys.AccessKeyMetadata) {
            if (key.AccessKeyId) {
              const deleteAccessKeyCommand = new DeleteAccessKeyCommand({
                UserName: labSession.awsUsername,
                AccessKeyId: key.AccessKeyId,
              })
              await iamClient.send(deleteAccessKeyCommand)
            }
          }
        }

        // 3. Delete IAM user
        const deleteUserCommand = new DeleteUserCommand({
          UserName: labSession.awsUsername,
        })
        await iamClient.send(deleteUserCommand)
      }
    } catch (error) {
      console.error("Error cleaning up AWS resources:", error)
      // Continue with lab session cleanup even if AWS cleanup fails
    }

    // Update lab session status
    await db.labSession.update({
      where: { id: labSession.id },
      data: {
        status: "ENDED",
        endedAt: new Date(),
      },
    })

    return NextResponse.json({ message: "Lab session ended successfully" })
  } catch (error) {
    console.error("Error ending lab session:", error)
    return NextResponse.json(
      { error: "Failed to end lab session" },
      { status: 500 }
    )
  }
}