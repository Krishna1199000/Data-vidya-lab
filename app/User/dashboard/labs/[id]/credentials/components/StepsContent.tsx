"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LabStep, LabDetails } from "../page"; // Import interfaces

interface StepsContentProps {
  labDetails: LabDetails | null;
  stepKeys: string[];
  currentStep: LabStep | null;
  currentStepIndex: number;
  handleNextStep: () => void;
  loading: boolean;
  error: string | null;
  className?: string;
}

export function StepsContent({
  labDetails,
  stepKeys,
  currentStep,
  currentStepIndex,
  handleNextStep,
  loading,
  error
}: StepsContentProps) {
  return (
    <Card className="flex-grow shadow-lg border-gray-200 p-6 overflow-hidden bg-white">
      <h2 className="text-2xl font-bold mb-4 text-teal-600">Lab Steps</h2>

      {labDetails && stepKeys.length > 0 && currentStep && (
        <div className="bg-gray-50 rounded-lg shadow-sm p-6 mb-6 text-gray-900">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-medium">
                  Step {currentStepIndex + 1} of {stepKeys.length}: {currentStep.title}
                </h3>
                <p className="text-gray-600 mt-1">{currentStep.description}</p>
                
                <div 
                  className="mt-4 prose prose-gray max-w-none"
                  dangerouslySetInnerHTML={{ __html: currentStep.content }}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleNextStep}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {currentStepIndex < stepKeys.length - 1 ? "Next Step" : "Complete Lab"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Display all steps */}
      {labDetails && stepKeys.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-semibold text-teal-600 mb-4">All Steps</h3>
          {stepKeys.map((key, index) => {
            const step = labDetails.steps?.setup?.[index];

            if (!step) return null;

            return (
              <div
                key={key}
                className={`p-4 rounded-lg ${index === currentStepIndex ? "bg-teal-50 border border-teal-200" : "bg-gray-50"} text-gray-900`}
              >
                <h4 className="font-medium text-gray-900">
                  Step {index + 1}: {step.title}
                </h4>
                <p className="text-gray-600 mt-1">{step.description}</p>
              </div>
            );
          })}
        </div>
      )}

      {labDetails && stepKeys.length === 0 && !error && (
        <p className="text-gray-600">No steps available for this lab.</p>
      )}

      {!labDetails && !error && !loading && (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          <p className="ml-4 text-gray-600">Loading steps...</p>
        </div>
      )}

      {error && (
        <div className="text-red-500">Error loading lab steps: {error}</div>
      )}
    </Card>
  );
}