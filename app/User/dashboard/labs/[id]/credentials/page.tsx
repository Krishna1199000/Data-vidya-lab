"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { CredentialsCard } from "./components/CredentialsCard";
import { StepsContent } from "./components/StepsContent";
import { ActionBar } from "./components/ActionBar";
import { LogoutDialog } from "./components/LogoutDialog";
import { endLabSession, startLabSession } from "./utils/labApi";
import { useLabTimer } from "./hooks/useLabTimer";
import { useCredentials } from "./hooks/useCredentials";
import { useLabSteps } from "./hooks/useLabSteps";
import { useToast } from "@/components/ui/use-toast";

export interface LabStep {
  title: string;
  description: string;
  content: string;
}

export interface LabDetails {
  id: string;
  title: string;
  steps?: {
    setup?: LabStep[];
  } | null;
  activeLabSession?: {
    id: string;
    awsAccountId: string;
    awsUsername: string;
    password?: string | null;
    aws_access_key_id?: string | null;
    aws_secret_access_key?: string | null;
    expiresAt: string;
  } | null;
}

const LabPage: React.FC = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showCredentials, setShowCredentials] = useState(true);
  const { credentials, sessionId, awsConsoleWindow, openAWSConsole, setCredentials, setSessionId } = useCredentials();
  const { labDetails, currentStep, currentStepIndex, stepKeys, handleNextStep: originalHandleNextStep, setLabDetails } = useLabSteps();
  const { timeRemaining, progressValue, setExpiresAt } = useLabTimer();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLabCompleted, setIsLabCompleted] = useState(false);
  const { toast } = useToast();

  const hasInitiated = useRef(false);

  const initiateLabSession = useCallback(async () => {
    if (!params.id) {
      setError("Lab ID is missing.");
      setLoading(false);
      return;
    }

    if (hasInitiated.current) {
        console.log("Lab session initiation already attempted.");
        return;
    }
    hasInitiated.current = true;

    try {
      setLoading(true);
      setError(null);

      const initialResponse = await fetch(`/api/labs/${params.id}`);
      if (!initialResponse.ok) throw new Error("Failed to fetch initial lab details");
      const initialData = await initialResponse.json();

      if (initialData.activeLabSession) {
        console.log("Found existing active lab session:", initialData.activeLabSession.id);
        setSessionId(initialData.activeLabSession.id);
        setCredentials({
          accountId: initialData.activeLabSession.awsAccountId,
          username: initialData.activeLabSession.awsUsername,
          password: initialData.activeLabSession.password || '',
          accessKeyId: initialData.activeLabSession.aws_access_key_id || '',
          secretAccessKey: initialData.activeLabSession.aws_secret_access_key || '',
          region: 'ap-south-1',
          consoleUrl: `https://${initialData.activeLabSession.awsAccountId}.signin.aws.amazon.com/console`,
        });
        setLabDetails(initialData);

        if (initialData.activeLabSession.expiresAt) {
            setExpiresAt(new Date(initialData.activeLabSession.expiresAt));
        }

        setLoading(false);
      } else {
        console.log("No active session found, starting a new one...");
        const sessionData = await startLabSession(params.id as string);

        setCredentials(sessionData.credentials);
        setSessionId(sessionData.sessionId);

        const updatedResponse = await fetch(`/api/labs/${params.id}`);
        if (!updatedResponse.ok) throw new Error("Failed to fetch updated lab details after starting session");
        const updatedData = await updatedResponse.json();
        setLabDetails(updatedData);

        if (updatedData.activeLabSession?.expiresAt) {
            setExpiresAt(new Date(updatedData.activeLabSession.expiresAt));
        }

        setLoading(false);
        toast({
          title: "Lab Session Started",
          description: "Your AWS environment is ready!",
          variant: "default"
        });
      }

    } catch (err) {
      console.error("Error initiating lab session:", err);
      setError(err instanceof Error ? err.message : "Failed to start lab environment");
      setLoading(false);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to start lab environment",
        variant: "destructive"
      });
    }
  }, [params.id, setCredentials, setSessionId, setLabDetails, setExpiresAt, toast]);

  useEffect(() => {
    if (params.id && !hasInitiated.current) {
      initiateLabSession();
    }

    return () => {
      if (awsConsoleWindow && !awsConsoleWindow.closed) {
        awsConsoleWindow.close();
      }
    };
  }, [params.id, awsConsoleWindow, initiateLabSession]);

  const endLab = async (isCompletion = false) => {
    if (!sessionId) {
      console.warn("Attempted to end lab with no active session ID");
      if (isCompletion) {
        setIsLabCompleted(true);
        toast({
          title: "Lab Completed!",
          description: "Yahoo, you completed the lab! No active session found to clean up.",
        });
        completeLabEnd();
      } else {
        toast({
          title: "Lab Ended",
          description: "No active session found to end.",
        });
        setShowLogoutDialog(true);
      }
      return;
    }

    try {
      console.log("Ending lab session with ID:", sessionId);
      await endLabSession(params.id as string, sessionId);

      if (awsConsoleWindow && !awsConsoleWindow.closed) {
        awsConsoleWindow.close();
      }

      if (isCompletion) {
        setIsLabCompleted(true);
        toast({
          title: "Lab Completed! 💪",
          description: "Yahoo, you completed the lab! Your AWS environment is being cleaned up.",
        });
        completeLabEnd();
      } else {
        setIsLabCompleted(false);
        toast({
          title: "Lab Ended",
          description: "Your lab session has been ended.",
        });
        setShowLogoutDialog(true);
      }

    } catch (err) {
      console.error("Error ending lab:", err);
      setError(err instanceof Error ? err.message : "An error occurred while ending the lab");
      setShowLogoutDialog(true);
      setIsLabCompleted(false);
      toast({
        title: "Error Ending Lab",
        description: err instanceof Error ? err.message : "An error occurred while trying to end the lab.",
        variant: "destructive"
      });
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex === stepKeys.length - 1) {
      endLab(true);
    } else {
      originalHandleNextStep();
    }
  };

  const completeLabEnd = () => {
    console.log("Lab session end process completed.");
    if (isLabCompleted) {
      router.push(`/User/dashboard/labs`);
    } else {
      router.push(`/User/dashboard/labs/${params.id}`);
    }
    setSessionId(null);
    setCredentials(null);
    hasInitiated.current = false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        <p className="ml-4 text-gray-600">Starting lab session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-4">
            <button onClick={() => { hasInitiated.current = false; initiateLabSession(); }} className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700">Retry</button>
            <button onClick={() => router.back()} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">Go Back</button>
          </div>
        </div>
      </div>
    );
  }

  if (!credentials || !labDetails || !sessionId) {
    console.error("Credentials, lab details, or session ID not available after loading.");
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-600">
          <p>Something went wrong. Please try again from the lab details page.</p>
          <button onClick={() => router.push(`/User/dashboard/labs/${params.id}`)} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700">Go to Lab Details</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="flex items-start justify-between gap-4 w-full max-w-7xl mx-auto">
        {showCredentials && (
          <CredentialsCard
            credentials={credentials}
            progressValue={progressValue}
            openAWSConsole={openAWSConsole}
            endLab={() => endLab(false)}
            onClose={() => setShowCredentials(false)}
          />
        )}

        <StepsContent
          labDetails={labDetails}
          stepKeys={stepKeys}
          currentStep={currentStep}
          currentStepIndex={currentStepIndex}
          handleNextStep={handleNextStep}
          loading={loading}
          error={error}
          className={showCredentials ? "flex-grow" : "flex-grow lg:col-span-2"}
        />

        <ActionBar
          timeRemaining={timeRemaining}
          endLab={() => endLab(false)}
          onShowCredentials={() => setShowCredentials(true)}
        />

        <LogoutDialog
          showLogoutDialog={showLogoutDialog}
          setShowLogoutDialog={setShowLogoutDialog}
          completeLabEnd={completeLabEnd}
        />
      </div>
    </div>
  );
};

export default LabPage;