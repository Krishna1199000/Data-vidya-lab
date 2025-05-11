"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, ExternalLink, LogOut, Database, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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

interface Credentials {
  accountId: string;
  username: string;
  password: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
  consoleUrl: string;
  s3BucketName?: string;
}

export default function LabCredentials({ params }: { params: { id: string } }) {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [awsConsoleWindow, setAwsConsoleWindow] = useState<Window | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const router = useRouter();
  const { toast } = useToast();
  const startLabInProgress = useRef(false);
  const maxRetries = 3;
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkBucketDirectly = async () => {
    if (!sessionId) return;
    
    try {
      console.log("Performing direct bucket check with session ID:", sessionId);
      const response = await fetch(`/api/labs/${params.id}/bucket-check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.warn("Bucket check error:", data);
        return false;
      }
      
      const data = await response.json();
      if (data.credentials) {
        console.log("Bucket check found credentials:", data.credentials);
        setCredentials(data.credentials);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error during direct bucket check:", error);
      return false;
    }
  };

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
      // Clean up any polling intervals
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [retryCount]);

  // Add new effect for bucket check when stuck in loading state
  useEffect(() => {
    // If we have a session ID but no credentials, and we're not loading, try direct bucket check
    if (sessionId && !credentials && !loading) {
      let bucketCheckTimer: NodeJS.Timeout;
      
      const performBucketCheck = async () => {
        const success = await checkBucketDirectly();
        if (!success) {
          // Schedule another check in 5 seconds
          bucketCheckTimer = setTimeout(performBucketCheck, 5000);
        }
      };
      
      // Start bucket checks
      performBucketCheck();
      
      return () => {
        if (bucketCheckTimer) clearTimeout(bucketCheckTimer);
      };
    }
  }, [sessionId, credentials, loading]);

  const startLab = async () => {
    if (startLabInProgress.current) {
      console.log("Start lab request already in progress, skipping");
      return;
    }
    
    startLabInProgress.current = true;
    setLoading(true);
    setError(null);
    
    try {
      console.log("Starting lab with params:", params.id);
      const response = await fetch(`/api/labs/${params.id}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        
        // Handle specific error cases
        if (data.code === "CONCURRENT_REQUEST") {
          console.log("Concurrent request detected, waiting and retrying");
          setTimeout(() => {
            startLabInProgress.current = false;
            startLab();
          }, 5000); // Wait 5 seconds before retrying
          return;
        }
      
        throw new Error(data.error || data.details || `Failed to start lab: ${response.status}`);
      }

      const data = await response.json();
      console.log("Lab session response:", data);

      if (!data.sessionId) {
        throw new Error("No session ID received from server");
      }

      setSessionId(data.sessionId);
      
      // If we don't have credentials yet but have a session ID, poll for them
      if (!data.credentials && data.sessionId) {
        await pollForCredentials(data.sessionId);
      } else if (data.credentials) {
        console.log("Credentials received:", data.credentials);
        setCredentials(data.credentials);
      } else {
        console.warn("No credentials in response");
      }
    } catch (err) {
      console.error("Error starting lab:", err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      
      // Special handling for specific errors
      if (errorMessage.includes("BucketAlreadyOwnedByYou") || 
          errorMessage.includes("BucketAlreadyExists")) {
        
        // Try to recover by calling the check-status endpoint first
        await checkLabStatus();
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
      startLabInProgress.current = false;
    }
  };

  const checkLabStatus = async () => {
    try {
      // Check if there's an existing session for this lab
      const response = await fetch(`/api/labs/${params.id}/check-status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to check lab status: ${response.status}`);
      }

      // If we got back valid session data, use it
      if (data.sessionId && data.credentials) {
        console.log("Retrieved existing lab session", data);
        setSessionId(data.sessionId);
        setCredentials(data.credentials);
        return true;
      } else if (data.sessionId) {
        // If we have a session ID but no credentials yet, poll for them
        await pollForCredentials(data.sessionId);
        return true;
      }
      
      // If no session exists but we're getting bucket already exists errors,
      // try a cleanup endpoint before retrying
      const cleanupResponse = await fetch(`/api/labs/${params.id}/cleanup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!cleanupResponse.ok) {
        const cleanupData = await cleanupResponse.json();
        console.warn("Cleanup warning:", cleanupData.error || "Unknown error during cleanup");
      }
      
      // Increment retry count for next attempt
      if (retryCount < maxRetries) {
        toast({
          title: "Retrying...",
          description: "Cleaning up resources and retrying lab creation",
        });
        setRetryCount(prev => prev + 1);
        return true;
      }
      
      return false;
    } catch (err) {
      console.error("Error checking lab status:", err);
      return false;
    }
  };

  const pollForCredentials = async (sid: string) => {
    let attempts = 0;
    const maxPollAttempts = 30; // Increased from 20 to 30
    
    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    return new Promise<void>((resolve, reject) => {
      console.log("Starting polling for credentials with session ID:", sid);
      pollingIntervalRef.current = setInterval(async () => {
        try {
          attempts++;
          console.log(`Polling attempt ${attempts}/${maxPollAttempts}`);
          
          if (attempts >= maxPollAttempts) {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
            }
            console.error("Polling timed out after maximum attempts");
            
            // Last resort attempt - direct account access fallback
            try {
              console.log("Attempting direct account access fallback...");
              const fallbackResponse = await fetch(`/api/labs/${params.id}/fallback-credentials`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                  sessionId: sid,
                  bucketName: `lab-bucket-124744987862-${sid.substring(0, 8)}` 
                }),
              });
              
              if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                if (fallbackData.credentials) {
                  console.log("Fallback credentials received:", fallbackData.credentials);
                  setCredentials(fallbackData.credentials);
                  resolve();
                  return;
                }
              }
            } catch (fallbackErr) {
              console.error("Fallback credentials attempt failed:", fallbackErr);
            }
            
            reject(new Error("Timed out waiting for lab credentials"));
            return;
          }
          
          // First try the check-status endpoint (which should be the most reliable)
          let response = await fetch(`/api/labs/${params.id}/check-status`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });
          
          let data;
          if (response.ok) {
            data = await response.json();
            console.log("Status check response:", data);
            
            if (data.credentials) {
              console.log("Credentials received from status check:", data.credentials);
              setCredentials(data.credentials);
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
              }
              resolve();
              return;
            }
          }
          
          // If check-status didn't work, try the dedicated status endpoint
          response = await fetch(`/api/labs/${params.id}/status`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sessionId: sid }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.warn("Status endpoint error:", errorData);
            // Continue polling despite error
            return;
          }
          
          data = await response.json();
          console.log("Dedicated status endpoint response:", data);
          
          if (data.credentials) {
            console.log("Credentials received from polling:", data.credentials);
            setCredentials(data.credentials);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
            }
            resolve();
            return;
          } else {
            console.warn("No credentials in response, polling will continue");
          }
          
          // If we've been polling for a while with no success, try to refresh credentials
          if (attempts % 5 === 0 && attempts >= 10) {
            console.log("Attempting to refresh credentials forcefully...");
            const refreshResponse = await fetch(`/api/labs/${params.id}/refresh-credentials`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ sessionId: sid }),
            });
            
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              if (refreshData.credentials) {
                console.log("Refresh returned credentials:", refreshData.credentials);
                setCredentials(refreshData.credentials);
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                }
                resolve();
                return;
              }
            }
          }
        } catch (err) {
          console.error("Error during credential polling:", err);
          // Don't reject here, just log the error and continue polling
          // Only reject if we hit the max attempts
          if (attempts >= maxPollAttempts) {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
            }
            reject(err);
          }
        }
      }, 2000); // Poll every 2 seconds (reduced from 3 to be more responsive)
    });
  };

  const retryStartLab = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      toast({
        title: "Retrying",
        description: "Attempting to start lab again",
      });
    } else {
      toast({
        title: "Error",
        description: "Maximum retry attempts reached. Please try again later.",
        variant: "destructive",
      });
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
          window.eval.call(awsConsoleWindow, logoutScript);
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
    router.push(`/dashboard/labs/${params.id}`);
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
    } else {
      toast({
        title: "Error",
        description: "Console URL is not available",
        variant: "destructive",
      });
    }
  };

  const copyAllCredentials = () => {
    if (!credentials) return;

    const credentialText = 
`AWS Account Information:
Account ID: ${credentials.accountId}
Region: ${credentials.region}

Console Access:
Username: ${credentials.username}
Password: ${credentials.password}

Programmatic Access:
Access Key ID: ${credentials.accessKeyId}
Secret Access Key: ${credentials.secretAccessKey}
${credentials.sessionToken ? `Session Token: ${credentials.sessionToken}` : ''}

${credentials.s3BucketName ? `Resources:\nS3 Bucket: ${credentials.s3BucketName}` : ''}`;

    navigator.clipboard.writeText(credentialText);
    toast({
      title: "Copied!",
      description: "All credentials copied to clipboard",
    });
  };

  // Check if we're still waiting but have a sessionId - show special message
  if (loading && sessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Resources created! Fetching credentials...</p>
          <p className="text-xs text-muted-foreground mt-2">This may take up to a minute</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Starting lab environment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Card className="max-w-2xl mx-auto p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Starting Lab</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex gap-4">
            <Button onClick={retryStartLab} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
            <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
          </div>
        </Card>
      </div>
    );
  }

  // Show message when we have sessionId but no credentials yet
  if (sessionId && !credentials) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-2xl mx-auto p-6">
          <h1 className="text-xl font-bold mb-4">Lab Resources Created</h1>
          <p className="text-muted-foreground mb-6">
            Your lab resources have been created, but we&apos;re still waiting for all credentials.
            This should only take a moment...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-xs text-muted-foreground mb-4 text-center">
            Session ID: <code className="bg-muted-foreground/20 p-1 rounded">{sessionId.substring(0, 8)}...</code>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              window.location.reload();
            }}
            className="w-full mt-4"
          >
            Refresh
          </Button>
          <Button 
            variant="ghost" 
            onClick={async () => {
              toast({
                title: "Checking...",
                description: "Trying to find your lab resources directly",
              });
              const success = await checkBucketDirectly();
              if (!success) {
                toast({
                  title: "Not found yet",
                  description: "Your lab resources might still be provisioning. Please wait.",
                  variant: "destructive",
                });
              }
            }}
            className="w-full mt-2"
          >
            Check Resources Directly
          </Button>
        </Card>
      </div>
    );
  }

  if (!credentials) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-2xl mx-auto p-6">
          <h1 className="text-xl font-bold text-orange-600 mb-4">Missing Credentials</h1>
          <p className="text-muted-foreground mb-6">
            We couldn&apos;t retrieve your lab credentials. This might be a temporary issue.
          </p>
          <div className="flex gap-4">
            <Button onClick={retryStartLab} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
            <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
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
                    <code className="font-mono text-sm">{credentials.accountId}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(credentials.accountId, "Account ID")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Region</p>
                  <p className="font-mono text-sm mt-1">{credentials.region}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Username</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="font-mono text-sm">{credentials.username}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(credentials.username, "Username")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Password</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="font-mono text-sm">{credentials.password}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(credentials.password, "Password")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Access Keys */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="access-keys">
              <AccordionTrigger className="text-lg font-semibold">
                Programmatic Access
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Access Key ID</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="font-mono text-sm">{credentials.accessKeyId}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(credentials.accessKeyId, "Access Key ID")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Secret Access Key</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="font-mono text-sm">{credentials.secretAccessKey}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(credentials.secretAccessKey, "Secret Access Key")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Resources */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Provisioned Resources</h2>
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">S3 Bucket</p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <code className="font-mono text-sm">{credentials.s3BucketName || 'No bucket provisioned'}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => credentials.s3BucketName && copyToClipboard(credentials.s3BucketName, "S3 Bucket Name")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Copy All Button */}
          <Button 
            onClick={copyAllCredentials}
            className="w-full mt-4 flex items-center justify-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy All Credentials
          </Button>
        </div>
      </Card>

      {/* End Lab Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lab Environment Ended</DialogTitle>
            <DialogDescription>
              Your lab environment has been successfully terminated. All provisioned resources have been cleaned up.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={completeLabEnd}>Return to Lab</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}