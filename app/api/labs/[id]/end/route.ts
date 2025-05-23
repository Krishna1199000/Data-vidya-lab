import { NextResponse, NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
// import fs from "fs/promises" // Commented out as fs is not used directly anymore
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

const prisma = new PrismaClient()
const execAsync = promisify(exec)

// Define the path to the Terraform binary within the project
const TERRAFORM_BINARY_PATH = process.env.VERCEL 
  ? path.join(process.cwd(), 'lib', 'terraform', 'terraform') 
  : 'terraform';

// async function copyDirectory(src: string, dest: string) {
//   try {
//     // Create destination directory if it doesn't exist
//     await fs.mkdir(dest, { recursive: true });

//     // Read all files from source directory
//     const files = await fs.readdir(src);

//     // Copy each file
//     for (const file of files) {
//       const srcPath = path.join(src, file);
//       const destPath = path.join(dest, file);

//       const stat = await fs.stat(srcPath);
//       if (stat.isDirectory()) {
//         // Recursively copy subdirectories
//         await copyDirectory(srcPath, destPath);
//       } else {\n//         // Copy file
//         await fs.copyFile(srcPath, destPath);
//       }
//     }
//   } catch (error) {
//     console.error('Error copying directory:', error);
//     throw error;
//   }
// } // Removed unused function

// Function to get the correct Terraform command based on the environment
// function getTerraformCommand() {
//   // Check if we're in a production environment (Vercel)
//   if (process.env.VERCEL) {
//     return path.join(process.cwd(), 'lib', 'terraform', 'terraform');
//   }
//   // For local development, just use 'terraform'
//   return 'terraform';
// } // Removed unused function

export async function POST(
  request: NextRequest
) {
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
        labId: true,
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

    // Get the lab to retrieve the services for terraform cleanup
    const lab = await prisma.lab.findUnique({
      where: { id: labSession.labId },
      select: {
        services: true,
      },
    })

    // Determine which account was used
    const accountNumber = labSession.awsUsername?.startsWith("student2-") ? "2" : "1"
    const sourceTerraformDir = path.join(process.cwd(), "terraform", `account${accountNumber}`)
    // const tmpDir = path.join(os.tmpdir(), `terraform-account${accountNumber}`)

    console.log(`Ending lab for user ${labSession.awsUsername} in account ${accountNumber}`)

    // Try Terraform destroy first
    let terraformSuccess = false
    try {
      // Copy terraform directory to /tmp
      // await copyDirectory(sourceTerraformDir, tmpDir) // No longer needed
      // console.log(`Copied terraform directory to ${tmpDir}`) // No longer needed

      // Create terraform.tfvars with the same services list to ensure proper cleanup
      // if (lab && lab.services) {
      //   const variablesFile = path.join(tmpDir, 'terraform.tfvars')
      //   await fs.writeFile(variablesFile, `services_list = ${JSON.stringify(lab.services)}\n`)
      //   console.log(`Created terraform.tfvars in ${tmpDir}`)
      // } // No longer needed

      // Set AWS credentials for Terraform as environment variables
      const env = {
        ...process.env,
        AWS_ACCESS_KEY_ID: process.env[`AWS_ACCESS_KEY_ID_LABUSER${accountNumber}`],
        AWS_SECRET_ACCESS_KEY: process.env[`AWS_SECRET_ACCESS_KEY_LABUSER${accountNumber}`],
        TF_VAR_username: labSession.awsUsername || undefined,
      }

      console.log('Initializing Terraform...')
      // Initialize Terraform in the source directory, passing plugin dir explicitly
      await execAsync(`${TERRAFORM_BINARY_PATH} init -plugin-dir=${path.join(process.cwd(), 'lib', 'terraform', 'plugins')}`, { 
        cwd: sourceTerraformDir, // Run init in the source directory
        env,
      })

      console.log('Destroying Terraform resources...')
      // Pass services_list using -var flag
      const { stdout, stderr } = await execAsync(`${TERRAFORM_BINARY_PATH} destroy -auto-approve -var 'services_list=${JSON.stringify(lab?.services || [])}'`, {
        cwd: sourceTerraformDir, // Run destroy in the source directory
        env,
        timeout: 300000, // 5 minute timeout
      })

      console.log('Terraform destroy stdout:', stdout)
      if (stderr) console.error('Terraform destroy stderr:', stderr)

      // Check if resources were destroyed
      terraformSuccess = !stdout.includes('No objects need to be destroyed')

      // Clean up tmp directory - only needed if copyDirectory was used
      // try {
      //   await fs.rm(tmpDir, { recursive: true, force: true })
      //   console.log(`Cleaned up temporary directory: ${tmpDir}`)
      // } catch (cleanupError) {
      //   console.warn('Error cleaning up temporary directory:', cleanupError)
      // }
    } catch (terraformError) {
      console.error('Error during terraform destroy:', terraformError)
      // Clean up tmp directory in case of error - only needed if copyDirectory was used
      // try {
      //   await fs.rm(tmpDir, { recursive: true, force: true })
      //   console.log(`Cleaned up temporary directory after error: ${tmpDir}`)
      // } catch (cleanupError) {
      //   console.warn('Error cleaning up temporary directory:', cleanupError)
      // }
      // Continue with AWS SDK cleanup
    }

    // If Terraform didn't succeed, use AWS SDK directly
    if (!terraformSuccess) {
      console.log('Terraform destroy did not succeed, using AWS SDK directly')

      try {
        // Create IAM client with proper credentials
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

        const username = labSession.awsUsername
        if (!username) {
          throw new Error("Username is required")
        }

        console.log(`Attempting to clean up IAM user: ${username}`)

        // Clean up IAM user
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