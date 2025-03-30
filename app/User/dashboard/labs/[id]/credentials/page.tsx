"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Info, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Credentials {
  accountId: string;
  username: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  region: string;
  consoleUrl: string;
}

interface LabResponse {
  sessionId: string;
  credentials: Credentials;
}

export default function LabCredentials({ params }: { params: { id: string } }) {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [password, setPassword] = useState("LabPassword123!"); // Default password
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    startLab();
    // Generate a more secure password
    const generatedPassword = `Lab${Math.random().toString(36).substring(2, 8)}${Math.floor(Math.random() * 100)}!`;
    setPassword(generatedPassword);
  }, []);

  const startLab = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/labs/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ labId: params.id }),
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

      setSessionId(data.sessionId);
      setCredentials(data.credentials);
    } catch (err) {
      console.error("Error starting lab:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const endLab = async () => {
    if (!sessionId) {
      toast({
        title: "Error",
        description: "No active lab session found",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Ending lab session with ID:", sessionId);
      const response = await fetch("/api/labs/end", {
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

      toast({
        title: "Success",
        description: "Lab session ended successfully",
      });

      router.push("/dashboard");
    } catch (err) {
      console.error("Error ending lab:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const openAWSConsole = () => {
    if (credentials?.consoleUrl) {
      window.open(credentials.consoleUrl, "_blank");
    }
  };

  // Copy all login information at once
  const copyAllCredentials = () => {
    if (!credentials) return;

    const credentialText = 
`Account ID: ${credentials.accountId}
Username: ${credentials.username}
Password: ${password}`;

    navigator.clipboard.writeText(credentialText);
    toast({
      title: "Copied!",
      description: "All login credentials copied to clipboard",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Card className="max-w-2xl mx-auto p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </Card>
      </div>
    );
  }

  if (!credentials) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-2xl font-bold">AWS Lab Credentials</h1>
        </div>

        <div className="space-y-4">
          <div className="mb-6">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
              onClick={openAWSConsole}
            >
              <ExternalLink className="h-4 w-4" />
              Open AWS Console
            </Button>
            <p className="text-xs text-center mt-2 text-muted-foreground">
              Click the button above to open the AWS Management Console
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg mb-4">
            <h3 className="font-medium mb-2">Manual Login Instructions:</h3>
            <ol className="list-decimal pl-5 space-y-1 text-sm">
              <li>If the AWS Console button doesn't work, go to <a href="https://signin.aws.amazon.com/console" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">AWS Console Login</a></li>
              <li>Select <strong>"IAM user"</strong></li>
              <li>Enter the Account ID, Username, and Password below</li>
              <li>Click "Sign in"</li>
            </ol>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3 w-full"
              onClick={copyAllCredentials}
            >
              <Copy className="h-3 w-3 mr-1" /> Copy All Credentials
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Account ID</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Your AWS account identifier</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="font-mono mt-1">{credentials.accountId}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(credentials.accountId, "Account ID")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Username</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Your AWS IAM username</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="font-mono mt-1">{credentials.username}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(credentials.username, "Username")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Password</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Password for AWS console login</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="font-mono mt-1">{password}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(password, "Password")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button
            className="w-full bg-red-600 hover:bg-red-700 text-white mt-4"
            onClick={endLab}
          >
            End Lab
          </Button>

          <div className="pt-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-4">
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Important Notes:</h3>
              <ul className="list-disc pl-4 space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                <li>These credentials will expire after 1 hour</li>
                <li>Do not share these credentials with anyone</li>
                <li>Save your work before the session expires</li>
                <li>If the console button doesn't work, use the manual login instructions above</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}