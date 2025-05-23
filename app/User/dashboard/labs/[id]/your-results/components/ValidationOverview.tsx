import React from "react";
import { XCircle, CheckCircle2, AlertCircle } from "lucide-react";

// type StepStatus = "completed" | "failed" | "unchecked";

interface Step {
  id: string;
  title: string;
  substeps?: Step[];
}

interface Progress {
  stepId: string;
  status: "UNCHECKED" | "CHECKED" | "FAILED";
}

interface ValidationOverviewProps {
  steps: Step[] | string;
  progress: Progress[];
}

export function ValidationOverview({ steps, progress }: ValidationOverviewProps) {
//   const [, setExpandedSteps] = React.useState<Record<string, boolean>>({});

  // Parse steps if it's a string
  const parsedSteps: Step[] = React.useMemo(() => {
    if (!steps) return [];
    
    if (typeof steps === 'string') {
      try {
        const parsed = JSON.parse(steps);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error('Error parsing steps:', error);
        return [];
      }
    }
    
    return Array.isArray(steps) ? steps : [];
  }, [steps]);

//   const toggleStep = (stepId: string) => {
//     setExpandedSteps(prev => ({
//       ...prev,
//       [stepId]: !prev[stepId]
//     }));
//   };

  const getStepStatus = (stepId: string) => {
    const stepProgress = progress.find(p => p.stepId === stepId);
    return stepProgress?.status || "UNCHECKED";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "CHECKED":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case "FAILED":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CHECKED":
        return "text-emerald-600 bg-emerald-50";
      case "FAILED":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const renderStep = (step: Step, level: number = 0) => {
    const status = getStepStatus(step.id);
    const hasSubsteps = step.substeps && step.substeps.length > 0;

    return (
      <div key={step.id} className={`${level > 0 ? "ml-6" : ""}`}>
        <div className="flex items-start gap-3 py-3">
          <div className={`p-1 rounded-lg ${getStatusColor(status)}`}>
            {getStatusIcon(status)}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">{step.title}</h3>
            {hasSubsteps && (
              <div className="mt-2 space-y-2">
                {step.substeps?.map(substep => renderStep(substep, level + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!parsedSteps || parsedSteps.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Validation Steps</h2>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500">
          No validation steps available
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Validation Steps</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-gray-600">Passed</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-gray-600">Failed</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Not Started</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
        {parsedSteps.map(step => renderStep(step))}
      </div>
    </div>
  );
}