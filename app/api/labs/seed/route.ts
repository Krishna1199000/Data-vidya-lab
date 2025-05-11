import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth.config";

const prisma = new PrismaClient();

// This is a temporary route to seed the database with a sample lab
export async function GET() {
  try {
    // Get the current user to use as author
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: "Authentication required to create sample lab" 
      }, { status: 401 });
    }

    // Check if a lab already exists to avoid duplicates
    const existingLab = await prisma.lab.findFirst();
    
    if (existingLab) {
      return NextResponse.json({ 
        message: "Lab already exists", 
        labId: existingLab.id 
      });
    }
    
    // Create a sample lab with correct JSON format
    const lab = await prisma.lab.create({
      data: {
        title: "Sample Lab",
        difficulty: "BEGINNER",
        duration: 60,
        description: "This is a sample lab created for testing purposes.",
        objectives: [{ title: "Sample Objective", description: "Learn how to use AWS resources" }],
        audience: "Developers and students",
        prerequisites: "Basic understanding of cloud computing",
        coveredTopics: [{ topic: "AWS", details: "Explore AWS resources" }],
        steps: {
          "1": { title: "Step 1", description: "Start the lab" },
          "2": { title: "Step 2", description: "Use the AWS Console" }
        },
        published: true,
        authorId: session.user.id
      }
    });
    
    return NextResponse.json({ 
      message: "Sample lab created successfully", 
      labId: lab.id 
    });
  } catch (error) {
    console.error("Error creating sample lab:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ 
      error: "Failed to create sample lab", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
} 