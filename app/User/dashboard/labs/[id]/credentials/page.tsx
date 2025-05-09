"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Copy, ExternalLink, LogOut, AlertTriangle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Credentials {
  accountId: string
  username: string
  password: string
  accessKeyId: string
  secretAccessKey: string
  region: string
  consoleUrl: string
  s3BucketName: string
}

interface LabResponse {
  sessionId: string
  credentials: Credentials
}

export default function LabCredentials({ params }: { params: { id: string } }) {
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [awsConsoleWindow, setAwsConsoleWindow] = useState<Window | null>(null)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [endingLab, setEndingLab] = useState(false)
  const [destroyedUsername, setDestroyedUsername] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const logoutTimer = useRef<NodeJS.Timeout | null>(null)
  const startLabInProgress = useRef(false)

  useEffect(() => {
    if (!startLabInProgress.current) {
      startLab()
    }

    return () => {
      if (logoutTimer.current) {
        clearTimeout(logoutTimer.current)
      }
    }
  }, [])

  const startLab = async () => {
    if (startLabInProgress.current) return
    startLabInProgress.current = true

    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/labs/${params.id}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to parse error response from server." }))
        throw new Error(data.error || `Failed to start lab: ${response.status}`)
      }

      const data: LabResponse = await response.json()

      if (!data.sessionId || !data.credentials) {
        throw new Error("Incomplete lab session data received from server")
      }

      setSessionId(data.sessionId)
      setCredentials(data.credentials)
    } catch (err) {
      console.error("Error starting lab:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred while starting the lab")
    } finally {
      setLoading(false)
      startLabInProgress.current = false
    }
  }

  useEffect(() => {
    if (awsConsoleWindow) {
      const checkWindowInterval = setInterval(() => {
        if (awsConsoleWindow.closed) {
          setAwsConsoleWindow(null)
          clearInterval(checkWindowInterval)
        }
      }, 1000)

      return () => clearInterval(checkWindowInterval)
    }
  }, [awsConsoleWindow])

  const endLab = async () => {
    if (!sessionId) {
      toast({
        title: "Error",
        description: "No active lab session ID found. Cannot end lab.",
        variant: "destructive",
      })
      return
    }
    
    setEndingLab(true)
    try {
      const response = await fetch(`/api/labs/${params.id}/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to end lab session.")
      }

      setDestroyedUsername(data.username || credentials?.username || "unknown user")
      setShowLogoutDialog(true)
    } catch (err) {
      console.error("Error ending lab:", err)
      toast({
        title: "Error Ending Lab",
        description: err instanceof Error ? err.message : "An unknown error occurred.",
        variant: "destructive",
      })
    } finally {
      setEndingLab(false)
    }
  }

  const completeLabEnd = () => {
    setShowLogoutDialog(false)
    toast({
      title: "Lab Ended",
      description: "Lab session ended.",
    })
    router.push(`/User/dashboard/labs/${params.id}`)
  }

  const copyToClipboard = (text: string | undefined | null, label: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: `${label} copied.`,
    })
  }

  const openAWSConsole = () => {
    if (!credentials?.consoleUrl || credentials.consoleUrl === "#") return
    const windowFeatures = "popup,width=1000,height=700"
    const newWindow = window.open(credentials.consoleUrl, "_blank", windowFeatures)
    if (newWindow) {
      setAwsConsoleWindow(newWindow)
      const checkClosed = setInterval(() => {
        if (newWindow.closed) {
          clearInterval(checkClosed)
          setAwsConsoleWindow(null)
        }
      }, 1000)
    } else {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups for this site to open the AWS Console.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Starting Lab</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <div className="mt-4">
            <Button onClick={() => router.back()} variant="secondary">Go Back</Button>
          </div>
        </Alert>
      </div>
    )
  }

  if (!credentials) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Credentials could not be loaded. Please try again.</AlertDescription>
          <div className="mt-4">
            <Button onClick={() => router.back()} variant="secondary">Go Back</Button>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <Card className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl font-semibold">Lab Environment Credentials</h1>
          <Button
            variant="destructive"
            size="sm"
            onClick={endLab}
            disabled={endingLab}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {endingLab ? "Ending..." : "End Lab"}
          </Button>
        </div>

        <div className="p-4 border rounded-lg mb-6">
          <h2 className="text-lg font-medium mb-4">Credentials</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Account ID:</span>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-secondary px-2 py-1 rounded">{credentials.accountId}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(credentials.accountId, "Account ID")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Username:</span>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-secondary px-2 py-1 rounded">{credentials.username}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(credentials.username, "Username")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Password:</span>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-secondary px-2 py-1 rounded">{credentials.password}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(credentials.password, "Password")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Region:</span>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-secondary px-2 py-1 rounded">{credentials.region}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(credentials.region, "Region")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Access Key ID:</span>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-secondary px-2 py-1 rounded">{credentials.accessKeyId}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(credentials.accessKeyId, "Access Key ID")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Secret Access Key:</span>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-secondary px-2 py-1 rounded">{credentials.secretAccessKey}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(credentials.secretAccessKey, "Secret Access Key")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {credentials.s3BucketName && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">S3 Bucket:</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-secondary px-2 py-1 rounded">{credentials.s3BucketName}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(credentials.s3BucketName, "S3 Bucket Name")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h2 className="text-lg font-medium mb-4">AWS Console</h2>
          <Button onClick={openAWSConsole}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open AWS Console
          </Button>
          {awsConsoleWindow && !awsConsoleWindow.closed && (
            <p className="text-xs text-muted-foreground mt-2">Console window is open.</p>
          )}
        </div>
      </Card>

      <Dialog
        open={showLogoutDialog}
        onOpenChange={(open) => {
          if (!open && destroyedUsername) {
            return
          }
          setShowLogoutDialog(open)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lab Ended Confirmation</DialogTitle>
            <DialogDescription>
              Resources for user <code className="text-sm bg-secondary px-1 rounded">{destroyedUsername || '...'}</code> should be destroyed. Please ensure you have signed out of the AWS console if the window was left open.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={completeLabEnd}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

