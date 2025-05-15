import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth.config"
import { PrismaClient } from "@prisma/client"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"
import {
  IAMClient,
  DeleteUserCommand,
  DeleteAccessKeyCommand,
  DeleteLoginProfileCommand,
  ListAccessKeysCommand,
  ListUserPoliciesCommand,
  DeleteUserPolicyCommand,
  ListAttachedUserPoliciesCommand,
  DetachUserPolicyCommand,
} from "@aws-sdk/client-iam"
import { S3Client, DeleteBucketCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3"

const prisma = new PrismaClient()
const execAsync = promisify(exec)

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Get the lab session
    const labSession = await prisma.labSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        awsAccountId: true,
        awsUsername: true,
        status: true,
        aws_access_key_id: true,
        aws_secret_access_key: true,
      },
    })

    if (!labSession) {
      return NextResponse.json({ error: "Lab session not found" }, { status: 404 })
    }

    if (labSession.status === "ENDED") {
      return NextResponse.json({ message: "Lab session already ended", username: labSession.awsUsername })
    }

    // Determine which account was used - FIX HERE
    // Check the username prefix instead of the account ID
    const accountNumber = labSession.awsUsername?.startsWith("student2-") ? "2" : "1"
    const terraformDir = path.join(process.cwd(), "terraform", `account${accountNumber}`)

    console.log(`Ending lab for user ${labSession.awsUsername} in account ${accountNumber}`)

    // Try Terraform destroy first
    let terraformSuccess = false
    try {
      if (fs.existsSync(terraformDir)) {
        console.log(`Attempting Terraform destroy in ${terraformDir}`)

        // Set AWS credentials for Terraform as environment variables
        const env = {
          ...process.env,
          AWS_ACCESS_KEY_ID: process.env[`AWS_ACCESS_KEY_ID_LABUSER${accountNumber}`],
          AWS_SECRET_ACCESS_KEY: process.env[`AWS_SECRET_ACCESS_KEY_LABUSER${accountNumber}`],
          TF_VAR_username: labSession.awsUsername || undefined,
        }

        const { stdout, stderr } = await execAsync("terraform destroy -auto-approve", {
          cwd: terraformDir,
          env,
          timeout: 300000, // 5 minute timeout
        })

        console.log("Terraform destroy stdout:", stdout)
        if (stderr) console.error("Terraform destroy stderr:", stderr)

        // Check if resources were destroyed
        terraformSuccess = !stdout.includes("No objects need to be destroyed")
      } else {
        console.log(`Terraform directory not found: ${terraformDir}`)
      }
    } catch (terraformError) {
      console.error("Error during terraform destroy:", terraformError)
      // Continue with AWS SDK cleanup
    }

    // If Terraform didn't succeed, use AWS SDK directly
    if (!terraformSuccess) {
      console.log("Terraform destroy did not succeed, using AWS SDK directly")

      try {
        // Create IAM and S3 clients with proper credentials
        // Map account number to the correct environment variable names
        const credentials = {
          "1": {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID_LABUSER1 || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_LABUSER1 || '',
          },
          "2": {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID_LABUSER2 || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_LABUSER2 || '',
          },
        }

        const awsConfig = {
          region: "ap-south-1",
          credentials: credentials[accountNumber as "1" | "2"],
        }

        // Validate credentials before proceeding
        if (!awsConfig.credentials.accessKeyId || !awsConfig.credentials.secretAccessKey) {
          throw new Error(
            `Missing AWS credentials for account ${accountNumber}. Please check environment variables AWS_ACCESS_KEY_ID_LABUSER${accountNumber} and AWS_SECRET_ACCESS_KEY_LABUSER${accountNumber}`,
          )
        }

        const iamClient = new IAMClient(awsConfig)
        const s3Client = new S3Client(awsConfig)

        const username = labSession.awsUsername
        if (!username) {
          throw new Error("Username is required")
        }

        // Extract bucket name from username (based on your naming convention)
        // FIX HERE - Use the correct bucket prefix based on the account number
        const bucketPrefix = accountNumber === "1" ? "lab1-" : "lab2-"
        const usernameParts = username.split("-")
        const bucketSuffix = usernameParts.length > 1 ? usernameParts[1] : ""
        const bucketName = `${bucketPrefix}${bucketSuffix}`

        console.log(`Attempting to clean up bucket: ${bucketName}`)

        // 1. Empty and delete S3 bucket if it exists
        try {
          // List objects in the bucket
          const listObjectsResponse = await s3Client.send(new ListObjectsV2Command({ Bucket: bucketName }))

          // Delete all objects
          if (listObjectsResponse.Contents) {
            for (const object of listObjectsResponse.Contents) {
              if (object.Key) {
                await s3Client.send(
                  new DeleteObjectCommand({
                    Bucket: bucketName,
                    Key: object.Key,
                  }),
                )
                console.log(`Deleted object: ${object.Key}`)
              }
            }
          }

          // Delete the bucket
          await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }))
          console.log(`Deleted bucket: ${bucketName}`)
        } catch (s3Error) {
          console.error(`Error cleaning up S3 bucket: ${s3Error}`)
          // Continue with IAM cleanup
        }

        console.log(`Attempting to clean up IAM user: ${username}`)

        // 2. Clean up IAM user
        try {
          // List and delete user policies
          const userPoliciesResponse = await iamClient.send(new ListUserPoliciesCommand({ UserName: username }))

          if (userPoliciesResponse.PolicyNames) {
            for (const policyName of userPoliciesResponse.PolicyNames) {
              await iamClient.send(
                new DeleteUserPolicyCommand({
                  UserName: username,
                  PolicyName: policyName,
                }),
              )
              console.log(`Deleted inline policy: ${policyName}`)
            }
          }

          // List and detach managed policies
          const attachedPoliciesResponse = await iamClient.send(
            new ListAttachedUserPoliciesCommand({ UserName: username }),
          )

          if (attachedPoliciesResponse.AttachedPolicies) {
            for (const policy of attachedPoliciesResponse.AttachedPolicies) {
              if (policy.PolicyArn) {
                await iamClient.send(
                  new DetachUserPolicyCommand({
                    UserName: username,
                    PolicyArn: policy.PolicyArn,
                  }),
                )
                console.log(`Detached managed policy: ${policy.PolicyName}`)
              }
            }
          }

          // List and delete access keys
          if (!username) {
            throw new Error("Username is required for listing access keys")
          }
          const accessKeysResponse = await iamClient.send(new ListAccessKeysCommand({ UserName: username }))

          if (accessKeysResponse.AccessKeyMetadata) {
            for (const key of accessKeysResponse.AccessKeyMetadata) {
              if (key.AccessKeyId) {
                await iamClient.send(
                  new DeleteAccessKeyCommand({
                    UserName: username,
                    AccessKeyId: key.AccessKeyId,
                  }),
                )
                console.log(`Deleted access key: ${key.AccessKeyId}`)
              }
            }
          }

          // Delete login profile
          try {
            if (username) {
              await iamClient.send(new DeleteLoginProfileCommand({ UserName: username }))
            }
            console.log(`Deleted login profile for user: ${username}`)
          } catch (loginProfileError) {
            console.error(`Error deleting login profile: ${loginProfileError}`)
            // Continue with user deletion
          }

          // Finally delete the user
          await iamClient.send(new DeleteUserCommand({ UserName: username }))
          console.log(`Deleted IAM user: ${username}`)
        } catch (iamError) {
          console.error(`Error cleaning up IAM user: ${iamError}`)
        }
      } catch (awsSdkError) {
        console.error("Error using AWS SDK for cleanup:", awsSdkError)
      }
    }

    // Update lab session status regardless of cleanup success
    await prisma.labSession.update({
      where: { id: sessionId },
      data: {
        status: "ENDED",
        endedAt: new Date(),
      },
    })

    return NextResponse.json({
      message: "Lab environment destroyed successfully",
      username: labSession.awsUsername,
      terraformSuccess,
    })
  } catch (error) {
    console.error("Error ending lab:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to end lab environment" },
      { status: 500 },
    )
  }
}