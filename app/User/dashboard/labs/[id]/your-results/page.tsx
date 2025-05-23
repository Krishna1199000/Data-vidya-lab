"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface LabSession {
  id: string;
  startedAt: string;
  completionPercentage: number;
  timeSpent: number;
  status: 'ACTIVE' | 'ENDED';
  checksPassed: number;
  checksFailed: number;
  checkAttempts: number;
}

interface StepProgress {
  stepId: string;
  status: "UNCHECKED" | "CHECKED" | "FAILED";
}


interface LabProgress {
  completionPercentage: number;
  progress: StepProgress[];
}


interface Lab {
  title: string;
steps: {
    title: string;
    description: string;
    id: string;
}[];
  progress: LabProgress;
  sessions: LabSession[];
}
import { BookmarkIcon, ArrowUpIcon as ArrowPathIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { ResultsHeader } from "./components/ResultsHeader";
import { ValidationOverview } from "./components/ValidationOverview";
import { SessionHistory } from "./components/SessionHistory";
import { RecommendationsList } from "./components/RecommendationList";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

export default function LabResultsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [labData, setLabData] = useState<Lab | null >(null);
  const [activeTab, setActiveTab] = useState("validation");

  useEffect(() => {
    if (params.id) {
      fetchLabData();
      checkBookmarkStatus();
    }
  }, [params.id]);

  const fetchLabData = async () => {
    setLoading(true);
    try {
      const [labResponse, progressResponse, sessionsResponse] = await Promise.all([
        fetch(`/api/labs/${params.id}`),
        fetch(`/api/labs/${params.id}/progress`),
        fetch(`/api/labs/${params.id}/sessions`)
      ]);

      if (!labResponse.ok || !progressResponse.ok || !sessionsResponse.ok) {
        throw new Error("Failed to fetch lab data");
      }

      const [lab, progress, sessions] = await Promise.all([
        labResponse.json(),
        progressResponse.json(),
        sessionsResponse.json()
      ]);

      console.log("Progress data received:", progress);
      console.log("Structure of received progress.progress:", progress.progress);

      setLabData({
        ...lab,
        progress,
        sessions
      });
    } catch (error) {
      console.error("Error fetching lab data:", error);
      toast({
        title: "Error",
        description: "Failed to load lab data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkBookmarkStatus = async () => {
    try {
      const response = await fetch(`/api/labs/${params.id}/bookmark`);
      if (response.ok) {
        const { isBookmarked } = await response.json();
        setIsBookmarked(isBookmarked);
      }
    } catch (error) {
      console.error("Error checking bookmark status:", error);
    }
  };

  const handleRestartLab = () => {
    router.push(`/User/dashboard/labs/${params.id}/credentials`);
  };

  const toggleBookmark = async () => {
    try {
      const method = isBookmarked ? "DELETE" : "POST";
      const response = await fetch(`/api/labs/${params.id}/bookmark`, {
        method,
      });

      if (response.ok) {
        setIsBookmarked(!isBookmarked);
        toast({
          title: isBookmarked ? "Lab removed from bookmarks" : "Lab bookmarked",
          description: isBookmarked ? "The lab has been removed from your bookmarks." : "The lab has been added to your bookmarks.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      toast({
        title: "Error",
        description: "Failed to update bookmark status. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        <p className="ml-4 text-gray-600">Loading lab results...</p>
      </div>
    );
  }

  if (!labData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-md text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Results Not Found</h2>
          <p className="text-gray-600 mb-6">The lab results you&apos;re looking for could not be found.</p>
          <Button onClick={() => router.push("/User/dashboard/labs")}>
            Return to Labs
          </Button>
        </div>
      </div>
    );
  }

  const currentSession = labData.sessions[0]; // Most recent session
  const completionPercentage = labData.progress.completionPercentage;
  const timeSpent = currentSession?.timeSpent || 0;
  const status = currentSession?.status || "not_started";

  console.log("Completion percentage being passed to ResultsHeader:", completionPercentage);
  console.log("Steps data being passed to ValidationOverview:", labData.steps);
  console.log("Progress data being passed to ValidationOverview:", labData.progress.progress);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-2 text-sm">
            <Link href="/User/dashboard/labs" className="text-gray-600 hover:text-gray-900">
  Training Library
</Link>
            <ChevronRightIcon className="h-4 w-4 text-gray-600" />
            <a href={`/User/dashboard/labs/${params.id}`} className="text-gray-600 hover:text-gray-900">
              {labData.title}
            </a>
            <ChevronRightIcon className="h-4 w-4 text-gray-600" />
            <span className="text-gray-900">Your Results</span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="text-xs font-semibold tracking-[3px] text-emerald-700 mb-4">HANDS-ON LAB RESULTS</div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{labData.title}</h1>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                  ${!currentSession ? 'bg-gray-100 text-gray-800' : 
                    status === 'ENDED' ? 'bg-green-100 text-green-800' : 
                    'bg-yellow-100 text-yellow-800'}`}>
                  {!currentSession ? 'Not Started' : 
                   status === 'ENDED' ? 'Completed' : 
                   'In Progress'}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={toggleBookmark} className="gap-2">
                <BookmarkIcon className={`h-5 w-5 ${isBookmarked ? 'fill-emerald-600 text-emerald-600' : 'text-gray-600'}`} />
                {isBookmarked ? 'Bookmarked' : 'Bookmark'}
              </Button>
              <Button onClick={handleRestartLab} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                <ArrowPathIcon className="h-5 w-5" />
                Restart Lab
              </Button>
            </div>
          </div>
        </div>

        <ResultsHeader 
          completionPercentage={completionPercentage}
          timeSpent={timeSpent}
          checksPassed={currentSession?.checksPassed || 0}
          checksFailed={currentSession?.checksFailed || 0}
          checkAttempts={currentSession?.checkAttempts || 0}
        />

        <div className="mt-8 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <Tabs defaultValue="validation" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="border-b border-b-gray-200 w-full justify-start rounded-none h-auto p-0 bg-white text-gray-700">
              <TabsTrigger
                value="validation"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-gray-900 px-6 py-4 data-[state=active]:bg-white"
              >
                Validation overview
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-gray-900 px-6 py-4 data-[state=active]:bg-white"
              >
                Session history
              </TabsTrigger>
              <TabsTrigger
                value="recommendations"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-gray-900 px-6 py-4 data-[state=active]:bg-white"
              >
                Recommendations
              </TabsTrigger>
            </TabsList>
            <TabsContent value="validation" className="p-6">
              <ValidationOverview 
                steps={labData.steps} 
                progress={labData.progress.progress}
              />
            </TabsContent>
            <TabsContent value="history" className="p-6">
              <SessionHistory sessions={labData.sessions} />
            </TabsContent>
            <TabsContent value="recommendations" className="p-6">
              <RecommendationsList labId={params.id as string} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}