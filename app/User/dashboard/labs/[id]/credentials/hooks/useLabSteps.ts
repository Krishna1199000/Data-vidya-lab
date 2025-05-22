"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface LabStep {
  title: string;
  description: string;
  content: string;
}

interface LabDetails {
  id: string;
  title: string;
  steps?: {
    setup?: LabStep[];
  };
}

export function useLabSteps() {
  const router = useRouter();
  const [labDetails, setLabDetails] = useState<LabDetails | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepKeys, setStepKeys] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<LabStep | null>(null);

  useEffect(() => {
    console.log("useLabSteps - labDetails changed:", labDetails);

    // Check if steps and the setup array exist and are valid
    if (labDetails?.steps?.setup && Array.isArray(labDetails.steps.setup)) {
      const stepsArray = labDetails.steps.setup;
      console.log("useLabSteps - Found setup array:", stepsArray);

      // Create stepKeys using array indices as strings
      const keys = stepsArray.map((_: LabStep, index: number) => index.toString());
      console.log("useLabSteps - Generated step keys:", keys);
      setStepKeys(keys);

      // Reset to the first step whenever lab details load
      setCurrentStepIndex(0);

    } else {
      // Handle cases where steps or setup array are missing or invalid
      console.log("useLabSteps - Steps or setup array not found/invalid in labDetails");
      setStepKeys([]);
      setCurrentStepIndex(0);
    }

  }, [labDetails]); // Re-run this effect whenever labDetails changes

  // Update currentStep when currentStepIndex or stepKeys change
  useEffect(() => {
    // Access the step directly from the setup array using the index
    const currentStepObject = labDetails?.steps?.setup?.[currentStepIndex];
    console.log("useLabSteps - currentStepIndex or stepKeys changed. Setting current step:", currentStepObject);
    setCurrentStep(currentStepObject || null);

  }, [currentStepIndex, labDetails]); // Depend on index and labDetails

  const handleNextStep = () => {
    // Ensure we have steps to navigate through
    if (stepKeys.length > 0) {
      if (currentStepIndex < stepKeys.length - 1) {
        console.log("useLabSteps - Moving to next step:", currentStepIndex + 1);
        setCurrentStepIndex(currentStepIndex + 1);
      } else {
        // Redirect to dashboard when all steps are completed
        console.log("useLabSteps - Completed last step, redirecting to dashboard");
        router.push("/User/dashboard/labs");
      }
    } else {
      console.warn("useLabSteps - handleNextStep called but no steps available.");
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