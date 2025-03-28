import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

interface LabControlsProps {
  labId: string;
}

export function LabControls({ labId }: LabControlsProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{
    accountId: string;
    accountName: string;
    password: string;
    loginUrl: string;
  } | null>(null);

  const startLab = async () => {
    try {
      setIsStarting(true);
      setError(null);

      const response = await fetch(`/api/labs/${labId}/session`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start lab');
      }

      setCredentials(data);
      setShowCredentials(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start lab');
    } finally {
      setIsStarting(false);
    }
  };

  const endLab = async () => {
    try {
      setIsEnding(true);
      setError(null);

      const response = await fetch(`/api/labs/${labId}/session`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to end lab');
      }

      setCredentials(null);
      setShowCredentials(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end lab');
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <>
      <div className="flex gap-4">
        <Button
          size="lg"
          onClick={startLab}
          disabled={isStarting || isEnding || showCredentials}
        >
          {isStarting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Start Lab
        </Button>
        
        <Button
          size="lg"
          variant="destructive"
          onClick={endLab}
          disabled={isEnding || !showCredentials}
        >
          {isEnding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          End Lab
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AWS Lab Credentials</DialogTitle>
            <DialogDescription>
              Use these credentials to access your AWS environment
            </DialogDescription>
          </DialogHeader>

          {credentials && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Account ID:</label>
                <div className="mt-1 p-2 bg-muted rounded">{credentials.accountId}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Account Name:</label>
                <div className="mt-1 p-2 bg-muted rounded">{credentials.accountName}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Password:</label>
                <div className="mt-1 p-2 bg-muted rounded">{credentials.password}</div>
              </div>

              <Button 
                className="w-full"
                onClick={() => window.open(credentials.loginUrl, '_blank')}
              >
                Open AWS Console
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}