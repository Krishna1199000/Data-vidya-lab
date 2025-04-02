import { PrismaClient } from "@prisma/client";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execPromise = promisify(exec);
const prisma = new PrismaClient();

// AWS account configurations from environment variables
const AWS_ACCOUNTS = [
  {
    id: "124744987862",
    username: "LabUser1",
    region: "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_LABUSER1!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_LABUSER1!,
    terraformPath: "account1"
  },
  {
    id: "104023954744", 
    username: "LabUser2",
    region: "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_LABUSER2!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_LABUSER2!,
    terraformPath: "account2"
  }
];

// Function to get an available AWS account
export async function getAvailableAccount() {
  // Get all active lab sessions
  const activeSessions = await prisma.labSession.findMany({
    where: { status: "ACTIVE" }
  });

  // Find account IDs that are currently in use
  const usedAccountIds = activeSessions.map(session => session.awsAccountId);
  
  // Find an available account
  const availableAccount = AWS_ACCOUNTS.find(account => !usedAccountIds.includes(account.id));
  
  if (!availableAccount) {
    throw new Error("No AWS accounts available. Please try again later.");
  }
  
  return availableAccount;
}

// Function to create temporary Terraform variable files
async function createTerraformVarFile(account: typeof AWS_ACCOUNTS[0], userId: string, labId: string, sessionId: string) {
  // Create a temporary directory for Terraform files
  const terraformDir = path.join(process.cwd(), "terraform", account.terraformPath);
  const tfvarsPath = path.join(terraformDir, "terraform.tfvars");
  
  // Create tfvars content
  const tfvarsContent = `
region     = "${account.region}"
access_key = "${account.accessKeyId}"
secret_key = "${account.secretAccessKey}"
account_id = "${account.id}"
user_id    = "${userId.substring(0, 8)}"
lab_id     = "${labId}"
session_id = "${sessionId}"
`;

  // Write the tfvars file
  await fs.promises.writeFile(tfvarsPath, tfvarsContent);
  
  return terraformDir;
}

// Function to clean up temporary Terraform files
async function cleanupTerraformFiles(terraformDir: string) {
  const tfvarsPath = path.join(terraformDir, "terraform.tfvars");
  
  try {
    await fs.promises.unlink(tfvarsPath);
  } catch (error) {
    console.error("Error cleaning up Terraform files:", error);
  }
}

// Function to provision resources using Terraform
export async function provisionResources(account: typeof AWS_ACCOUNTS[0], userId: string, labId: string, sessionId: string) {
  // Create Terraform variable file
  const terraformDir = await createTerraformVarFile(account, userId, labId, sessionId);
  
  try {
    // Initialize Terraform
    console.log("Initializing Terraform...");
    await execPromise("terraform init", { cwd: terraformDir });
    
    // Apply Terraform configuration
    console.log("Applying Terraform configuration...");
    const { stdout } = await execPromise("terraform apply -auto-approve", { cwd: terraformDir });
    
    // Parse outputs
    const outputs = await getTerraformOutputs(terraformDir);
    
    return {
      accountId: outputs.account_id,
      username: outputs.username,
      password: outputs.password,
      accessKeyId: outputs.access_key_id,
      secretAccessKey: outputs.secret_access_key,
      region: outputs.region,
      s3BucketName: outputs.s3_bucket_name
    };
  } catch (error) {
    console.error("Error provisioning resources:", error);
    throw new Error("Failed to provision AWS resources");
  } finally {
    // Clean up temp files
    await cleanupTerraformFiles(terraformDir);
  }
}

// Function to destroy resources using Terraform
export async function destroyResources(account: typeof AWS_ACCOUNTS[0], userId: string, labId: string, sessionId: string) {
  // Create Terraform variable file
  const terraformDir = await createTerraformVarFile(account, userId, labId, sessionId);
  
  try {
    // Initialize Terraform
    console.log("Initializing Terraform...");
    await execPromise("terraform init", { cwd: terraformDir });
    
    // Destroy Terraform resources
    console.log("Destroying Terraform resources...");
    await execPromise("terraform destroy -auto-approve", { cwd: terraformDir });
    
    return true;
  } catch (error) {
    console.error("Error destroying resources:", error);
    throw new Error("Failed to destroy AWS resources");
  } finally {
    // Clean up temp files
    await cleanupTerraformFiles(terraformDir);
  }
}

// Function to get Terraform outputs
async function getTerraformOutputs(terraformDir: string) {
  const { stdout } = await execPromise("terraform output -json", { cwd: terraformDir });
  const outputs = JSON.parse(stdout);
  
  return {
    username: outputs.username.value,
    password: outputs.password.value,
    account_id: outputs.account_id.value,
    access_key_id: outputs.access_key_id.value,
    secret_access_key: outputs.secret_access_key.value,
    region: outputs.region.value,
    s3_bucket_name: outputs.s3_bucket_name.value
  };
}

// Function to generate a sign-in URL for AWS Console
export async function generateConsoleUrl(region: string, accessKeyId: string, secretAccessKey: string, sessionToken: string): Promise<string> {
  const session = {
    sessionId: accessKeyId,
    sessionKey: secretAccessKey,
    sessionToken: sessionToken
  };

  const params = new URLSearchParams({
    Action: "getSigninToken",
    Session: JSON.stringify(session),
    SessionDuration: "3600"
  });

  try {
    const response = await fetch(`https://signin.aws.amazon.com/federation?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to get signin token:", errorText);
      throw new Error(`Failed to get signin token: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.SigninToken) {
      throw new Error("No SigninToken in response");
    }
    
    // Create the destination console URL
    const destination = encodeURIComponent(`https://${region}.console.aws.amazon.com/`);
    
    // Construct the final federation URL
    const federationUrl = `https://signin.aws.amazon.com/federation?Action=login&Destination=${destination}&SigninToken=${result.SigninToken}`;
    
    return federationUrl;
  } catch (error) {
    console.error("Error generating console URL:", error);
    throw error;
  }
}