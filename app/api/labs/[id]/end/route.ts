import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth.config";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs/promises";

const prisma = new PrismaClient();

// Function to clean up the lab session resources
async function cleanupLabResources(accountId: string, userId: string, labId: string, dirName: string): Promise<string> {
  try {
    const terraformDir = path.join(process.cwd(), "terraform");
    const userResourceDir = path.join(terraformDir, "generated", dirName);
    
    console.log(`Cleaning up resources for session in directory: ${dirName}`);
    
    // Check if the directory exists
    let directoryExists = false;
    try {
      await fs.access(userResourceDir);
      directoryExists = true;
    } catch {
      console.error(`Resource directory for ${dirName} not found`);
      return `Resource directory not found for ${dirName}`;
    }
    
    if (!directoryExists) {
      return `Resource directory not found for ${dirName}`;
    }
    
    // Clean up the resource directory
    try {
      await fs.rm(userResourceDir, { recursive: true, force: true });
      console.log(`Deleted resource directory at ${userResourceDir}`);
    } catch (err) {
      console.warn(`Could not delete resource directory: ${err}`);
      // Continue even if deletion fails
    }
    
    return `Successfully cleaned up resources for ${dirName}`;
  } catch (error) {
    console.error("Error cleaning up resources:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Resource cleanup failed: ${errorMessage}`);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const labId = params.id;
    
    // Find the active session for this lab and user
    const activeSession = await prisma.labSession.findFirst({
      where: {
        labId,
        userId,
        status: "ACTIVE"
      }
    });
    
    if (!activeSession) {
      return NextResponse.json({ error: "No active session found for this lab" }, { status: 404 });
    }
    
    // Use the stored directory name from the database for cleanup
    const dirName = activeSession.aws_access_key_id || 
                    `lab-user-${labId.substring(0, 4)}-${userId.substring(0, 4)}`;
    
    console.log(`Found resource directory for lab session: ${dirName}`);
    
    // Clean up resources
    let cleanupOutput;
    try {
      console.log(`Ending lab session with ID: ${activeSession.id} for directory ${dirName}`);
      cleanupOutput = await cleanupLabResources(activeSession.awsAccountId, userId, labId, dirName);
    } catch (error) {
      console.error("Error cleaning up resources:", error);
      cleanupOutput = `Error cleaning up resources: ${error instanceof Error ? error.message : String(error)}`;
      // Continue ending the session even if cleanup fails
    }
    
    // Update the session status to ENDED
    const updatedSession = await prisma.labSession.update({
      where: { id: activeSession.id },
      data: {
        status: "ENDED",
        endedAt: new Date()
      }
    });
    
    return NextResponse.json({
      message: "Lab session ended successfully",
      sessionId: updatedSession.id,
      cleanupOutput
    });
    
  } catch (error) {
    console.error("Error ending lab:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ 
      error: "Failed to end lab", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}