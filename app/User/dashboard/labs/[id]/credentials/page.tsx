"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Info, ExternalLink, LogOut, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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

export default function LabCredentials({ params }: { params: { id: string } }) {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [awsConsoleWindow, setAwsConsoleWindow] = useState<Window | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [services, setServices] = useState<string[]>([]);
  const [progressValue, setProgressValue] = useState(100);
  const router = useRouter();
  const { toast } = useToast();
  const startLabInProgress = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!startLabInProgress.current) {
      startLab();
    }

    const handleWindowMessage = (event: MessageEvent) => {
      if (event.data === 'aws-console-closed') {
        toast({
          title: "AWS Console",
          description: "AWS Console window was closed",
        });
      }
    };
    
    window.addEventListener('message', handleWindowMessage);
    
    return () => {
      window.removeEventListener('message', handleWindowMessage);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (expiresAt) {
      // Set up timer to track remaining time
      timerRef.current = setInterval(() => {
        const now = new Date();
        const diff = expiresAt.getTime() - now.getTime();
        
        if (diff <= 0) {
          // Time expired, clear interval and end lab
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeRemaining(0);
          setProgressValue(0);
          
          // Only end lab if there's a session ID
          if (sessionId) {
            endLab();
          }
        } else {
          // Update time remaining
          setTimeRemaining(Math.floor(diff / 1000)); // Convert to seconds
          
          // Calculate percentage time remaining
          const totalDuration = expiresAt.getTime() - (new Date(expiresAt.getTime() - (60 * 60 * 1000))).getTime(); // Assuming 1 hour sessions
          const remainingPercentage = (diff / totalDuration) * 100;
          setProgressValue(remainingPercentage);
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [expiresAt, sessionId]);

  const startLab = async () => {
    if (startLabInProgress.current) {
      console.log("Start lab request already in progress, skipping");
      return;
    }
    
    startLabInProgress.current = true;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/labs/${params.id}/start`, {
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

      setSessionId(data.sessionId);
      setCredentials(data.credentials);
      setServices(data.services || []);
      
      // Set expiration time
      if (data.expiresAt) {
        const expireDate = new Date(data.expiresAt);
        setExpiresAt(expireDate);
        
        // Calculate initial time remaining
        const now = new Date();
        const diffMs = expireDate.getTime() - now.getTime();
        setTimeRemaining(Math.floor(diffMs / 1000)); // Convert to seconds
      }
    } catch (err) {
      console.error("Error starting lab:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      startLabInProgress.current = false;
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
      const response = await fetch(`/api/labs/${params.id}/end`, {
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

      const data = await response.json();
      setShowLogoutDialog(true);
      
      if (awsConsoleWindow && !awsConsoleWindow.closed) {
        try {
          const logoutScript = `
            document.querySelectorAll('a[data-testid="signout-link"]').forEach(link => {
              link.click();
            });
            window.close();
            window.opener.postMessage('aws-console-closed', '*');
          `;
          awsConsoleWindow.eval(logoutScript);
        } catch (windowErr) {
          console.log("Could not automatically sign out of AWS console", windowErr);
        }
      }

    } catch (err) {
      console.error("Error ending lab:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const completeLabEnd = () => {
    toast({
      title: "Success",
      description: "Lab session ended successfully",
    });
    router.push(`/User/dashboard/labs/${params.id}`);
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
      const newWindow = window.open(credentials.consoleUrl, "_blank");
      setAwsConsoleWindow(newWindow);
    }
  };

  const formatTimeRemaining = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressColor = (): string => {
    if (progressValue > 50) return "bg-green-500";
    if (progressValue > 20) return "bg-amber-500";
    return "bg-red-500";
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
      <Card className="max-w-3xl mx-auto p-6 shadow-lg border-opacity-70">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">AWS Lab Environment</h1>
          <Button
            variant="destructive"
            size="sm"
            onClick={endLab}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            End Lab
          </Button>
        </div>
        
        {/* Timer Section */}
        <div className="mb-6 bg-muted p-4 rounded-lg border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Lab Session Time</h2>
            </div>
            <div className="flex items-center gap-2">
              {timeRemaining < 300 && (
                <AlertCircle className="h-5 w-5 text-red-500 animate-pulse" />
              )}
              <span className={`font-mono text-lg font-bold ${timeRemaining < 300 ? 'text-red-500' : ''}`}>
                {formatTimeRemaining(timeRemaining)}
              </span>
            </div>
          </div>
          <Progress 
            value={progressValue} 
            className="h-2 transition-all duration-500"
            indicatorClassName={`transition-all duration-500 ${getProgressColor()}`}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {timeRemaining < 300 
              ? "⚠️ Your session will end soon! Save your work immediately." 
              : "Your lab session will automatically end when the timer reaches zero."}
          </p>
        </div>

        {/* Services Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Available Services</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {services.map((service) => (
              <Badge key={service} variant="secondary" className="px-3 py-1">
                {service}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* AWS Console Access */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Console Access</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={openAWSConsole}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open Console
              </Button>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Account ID</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="font-mono text-sm bg-background/50 px-2 py-1 rounded">{credentials.accountId}</code>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(credentials.accountId, "Account ID")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy Account ID</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Region</p>
                  <p className="font-mono text-sm bg-background/50 px-2 py-1 rounded inline-block mt-1">{credentials.region}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Username</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="font-mono text-sm bg-background/50 px-2 py-1 rounded">{credentials.username}</code>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(credentials.username, "Username")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy Username</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Password</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="font-mono text-sm bg-background/50 px-2 py-1 rounded">{credentials.password}</code>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(credentials.password, "Password")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy Password</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Access Keys */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="access-keys" className="border-border">
              <AccordionTrigger className="text-lg font-semibold">
                Programmatic Access
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Access Key ID</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="font-mono text-sm bg-background/50 px-2 py-1 rounded">{credentials.accessKeyId}</code>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(credentials.accessKeyId, "Access Key ID")}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy Access Key ID</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Secret Access Key</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="font-mono text-sm bg-background/50 px-2 py-1 rounded">{credentials.secretAccessKey}</code>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(credentials.secretAccessKey, "Secret Access Key")}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy Secret Access Key</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-5 w-5 text-yellow-800 dark:text-yellow-200" />
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200">Important Notes:</h3>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
              <li>Your lab session will automatically end when the timer expires</li>
              <li>Do not share these credentials with anyone</li>
              <li>Save your work before the session expires</li>
              <li>Resources will be automatically cleaned up when you end the lab</li>
              <li>Make sure to sign out of the AWS Console when you're done</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Logout Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign out of AWS Console</DialogTitle>
            <DialogDescription>
              Your lab has been ended. Please make sure to sign out of the AWS Console.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-lg my-4">
            <h3 className="font-medium mb-2">To sign out from AWS Console:</h3>
            <ol className="list-decimal pl-5 space-y-1 text-sm">
              <li>Go to your AWS Console window</li>
              <li>Click on your username in the top right corner</li>
              <li>Select "Sign Out"</li>
              <li>Close the AWS Console window</li>
            </ol>
            <div className="mt-3 flex items-center justify-center">
              <LogOut className="h-6 w-6 text-red-500" />
            </div>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button 
              type="button" 
              onClick={completeLabEnd}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              I have signed out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}