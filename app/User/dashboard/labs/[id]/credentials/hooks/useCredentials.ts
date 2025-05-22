"use client";

import { useState } from "react";

interface Credentials {
  accountId: string;
  username: string;
  password: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  consoleUrl: string;
}

export function useCredentials() {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [awsConsoleWindow, setAwsConsoleWindow] = useState<Window | null>(null);

  const openAWSConsole = () => {
    if (credentials?.consoleUrl) {
      const newWindow = window.open(credentials.consoleUrl, "_blank");
      setAwsConsoleWindow(newWindow);
    }
  };

  return {
    credentials,
    sessionId,
    awsConsoleWindow,
    setCredentials,
    setSessionId,
    openAWSConsole
  };
}