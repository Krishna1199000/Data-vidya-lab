import React from "react";
import { 
  Clock,
  CheckCircle2,
  XCircle,

} from "lucide-react";

interface ResultsHeaderProps {
  completionPercentage: number;
  timeSpent: number;
  checksPassed: number;
  checksFailed: number;
  checkAttempts: number;
}

export function ResultsHeader({
  completionPercentage,
  timeSpent,
  checksPassed,
  checksFailed,

}: ResultsHeaderProps) {
  const formatTimeSpent = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Completion</p>
            <p className="text-2xl font-semibold text-gray-900">{completionPercentage}%</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Clock className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Time Spent</p>
            <p className="text-2xl font-semibold text-gray-900">{formatTimeSpent(timeSpent)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Checks Passed</p>
            <p className="text-2xl font-semibold text-gray-900">{checksPassed}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-lg">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Checks Failed</p>
            <p className="text-2xl font-semibold text-gray-900">{checksFailed}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Example usage
export default function App() {
  const sampleData = {
    completionPercentage: 0,
    timeSpent: 43,
    checksPassed: 0,
    checksFailed: 0,
    checkAttempts: 0
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-6">
          <XCircle className="w-6 h-6 text-red-500" />
          <span className="text-lg font-medium text-gray-900">Lab aborted</span>
        </div>
      </div>
      <ResultsHeader {...sampleData} />
    </div>
  );
}