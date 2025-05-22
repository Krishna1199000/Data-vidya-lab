"use client";

import { Button } from "@/components/ui/button";
// import { Progress } from "@/components/ui/progress";
import { Copy, Info,  CheckCircle, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";

interface Credentials {
  accountId: string;
  username: string;
  password: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  consoleUrl: string;
}

interface CredentialsCardProps {
  credentials: Credentials;
  progressValue: number;
  openAWSConsole: () => void;
  endLab: () => void;
  onClose: () => void;
}

export function CredentialsCard({ 
  credentials, 
  // progressValue, 
  openAWSConsole, 
  onClose 
}: CredentialsCardProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  // const getProgressColor = (): string => {
  //   if (progressValue > 50) return "bg-emerald-500";
  //   if (progressValue > 20) return "bg-amber-500";
  //   return "bg-red-500";
  // };

  return (
    <Card className="w-full max-w-sm shadow-lg border-gray-200 border-opacity-70 p-0 overflow-hidden bg-white text-gray-900">
      {/* Top Open/Status section */}
      <div className="flex items-center justify-between p-4 bg-white">
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={openAWSConsole}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            Open
          </Button>
          <div className="flex items-center text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4 mr-1" /> Ready to log in
          </div>
        </div>

        {/* <Button
          variant="destructive"
          size="sm"
          onClick={endLab}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          End Lab
        </Button> */}

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="flex items-center gap-2 ml-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress Bar */}
      {/* <div className="w-full px-4 pt-2">
        <div className="text-xs text-gray-700 mb-1">{Math.round(progressValue)}%</div>
        <Progress
          value={progressValue}
          className="h-2 w-full transition-all duration-500"
          indicatorClassName={`transition-all duration-500 ${getProgressColor()}`}
        />
      </div> */}

      {/* Credentials Section */}
      <div className="p-4 space-y-4 border-t border-gray-200 mt-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
          Credentials
        </h2>

        {/* Account ID */}
        <div>
          <p className="text-sm text-gray-700 flex items-center gap-1">
            Account ID <Info className="h-3 w-3" />
          </p>
          <div className="flex items-center gap-2 mt-1 bg-white rounded-md pr-2">
            <code className="font-mono text-sm px-2 py-1 flex-grow overflow-auto text-gray-900">
              {credentials.accountId}
            </code>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-700 hover:text-gray-900"
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

        {/* Username */}
        <div>
          <p className="text-sm text-gray-700 flex items-center gap-1">
            Username <Info className="h-3 w-3" />
          </p>
          <div className="flex items-center gap-2 mt-1 bg-white rounded-md pr-2">
            <code className="font-mono text-sm px-2 py-1 flex-grow overflow-auto text-gray-900">
              {credentials.username}
            </code>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-700 hover:text-gray-900"
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

        {/* Password */}
        <div>
          <p className="text-sm text-gray-700 flex items-center gap-1">
            Password <Info className="h-3 w-3" />
          </p>
          <div className="flex items-center gap-2 mt-1 bg-white rounded-md pr-2">
            <code className="font-mono text-sm px-2 py-1 flex-grow overflow-auto text-gray-900">
              {credentials.password}
            </code>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-700 hover:text-gray-900"
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

        {/* Region */}
        <div>
          <p className="text-sm text-gray-700">Region</p>
          <div className="flex items-center gap-2 mt-1 bg-white rounded-md pr-2">
            <code className="font-mono text-sm px-2 py-1 flex-grow overflow-auto text-gray-900">
              {credentials.region}
            </code>
          </div>
        </div>
      </div>
    </Card>
  );
}