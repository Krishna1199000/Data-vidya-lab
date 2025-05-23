"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
}

export function useLabSteps() {
  const router = useRouter();
  const [labDetails, setLabDetails] = useState<LabDetails | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Extract step keys from lab details
  const stepKeys = labDetails?.steps?.setup?.map((_, index) => `step-${index}`) || [];
  const currentStep = labDetails?.steps?.setup?.[currentStepIndex] || null;

  const handleNextStep = () => {
    if (stepKeys.length > 0 && currentStepIndex < stepKeys.length - 1) {
      console.log("useLabSteps - Moving to next step:", currentStepIndex + 1);
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      console.log("useLabSteps - Reached last step");
    }
  };

  return {
    labDetails,
    currentStep,
    currentStepIndex,
    stepKeys,
    handleNextStep,
    setLabDetails
  };
}