import { format } from "date-fns";
import { CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";

interface Session {
  id: string;
  startedAt: string;
  endedAt?: string;
  status: "ACTIVE" | "ENDED";
  completionPercentage: number;
  timeSpent: number;
  checksPassed: number;
  checksFailed: number;
  checkAttempts: number;
}

interface SessionHistoryProps {
  sessions: Session[];
}

export function SessionHistory({ sessions }: SessionHistoryProps) {
  const formatTimeSpent = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ENDED":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case "ACTIVE":
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ENDED":
        return "text-emerald-600 bg-emerald-50";
      case "ACTIVE":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-red-600 bg-red-50";
    }
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage === 100) return "text-emerald-600 bg-emerald-50";
    if (percentage >= 75) return "text-blue-600 bg-blue-50";
    if (percentage >= 50) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Session History</h2>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
        {sessions.map((session) => (
          <div key={session.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-1 rounded-lg ${getStatusColor(session.status)}`}>
                  {getStatusIcon(session.status)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-900">
                      {format(new Date(session.startedAt), "MMM d, yyyy")}
                    </h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(session.status)}`}>
                      {session.status === "ENDED" ? "Completed" : "In Progress"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {format(new Date(session.startedAt), "h:mm a")}
                    {session.endedAt && ` - ${format(new Date(session.endedAt), "h:mm a")}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Completion</p>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-semibold ${getCompletionColor(session.completionPercentage)}`}>
                    {session.completionPercentage}%
                  </span>
                  {session.completionPercentage === 100 && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Time Spent</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <p className="text-lg font-semibold text-gray-900">
                    {formatTimeSpent(session.timeSpent)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Checks Passed</p>
                <p className="text-lg font-semibold text-gray-900">{session.checksPassed}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Checks Failed</p>
                <p className="text-lg font-semibold text-gray-900">{session.checksFailed}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}