"use client";

interface Credentials {
  accountId: string;
  username: string;
  password: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  consoleUrl: string;
}

interface LabResponse {
  sessionId: string;
  credentials: Credentials;
  expiresAt: string;
  services: string[];
}

// Fetch lab details from the API
export async function fetchLabDetails(labId: string) {
  try {
    const response = await fetch(`/api/labs/${labId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch lab details");
    }
    const data = await response.json();
    
    if (!data) {
      throw new Error("No data received from server");
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching lab details:", error);
    throw error;
  }
}

// Start a lab session
export async function startLabSession(labId: string): Promise<LabResponse> {
  try {
    const response = await fetch(`/api/labs/${labId}/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || `Failed to start lab: ${response.status}`);
    }

    const data: LabResponse = await response.json();
    console.log("Lab session created successfully", data);

    if (!data.sessionId) {
      throw new Error("No session ID received from server");
    }

    return data;
  } catch (error) {
    console.error("Error starting lab:", error);
    throw error;
  }
}

// End a lab session
export async function endLabSession(labId: string, sessionId: string) {
  try {
    console.log("Ending lab session with ID:", sessionId);
    const response = await fetch(`/api/labs/${labId}/end`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to end lab");
    }

    return true;
  } catch (error) {
    console.error("Error ending lab:", error);
    throw error;
  }
}