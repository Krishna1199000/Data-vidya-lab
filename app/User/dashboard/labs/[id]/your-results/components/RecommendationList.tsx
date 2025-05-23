import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Lab {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  duration: number;
  objectives: string[];
}

interface RecommendationListProps {
  labId: string;
}

export function RecommendationsList({ labId }: RecommendationListProps) {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [labId]);

  const fetchRecommendations = async () => {
    try {
      const response = await fetch(`/api/labs?exclude=${labId}&limit=4`);
      if (!response.ok) {
        throw new Error("Failed to fetch recommendations");
      }
      const data = await response.json();
      setRecommendations(data);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Recommended Labs</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Recommended Labs</h2>
        <p className="text-gray-600">No recommendations available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Recommended Labs</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {recommendations.map((lab) => (
          <Card
            key={lab.id}
            className="overflow-hidden bg-white border border-gray-200 hover:border-emerald-500 transition-colors cursor-pointer hover:-translate-y-1 duration-200 shadow-sm"
            onClick={() => router.push(`/User/dashboard/labs/${lab.id}`)}
          >
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{lab.title}</h3>
                <div className="text-sm text-gray-600 line-clamp-2" dangerouslySetInnerHTML={{ __html: lab.description }} />
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {lab.difficulty.charAt(0) + lab.difficulty.slice(1).toLowerCase()}
                  </span>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Up to {lab.duration}m</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{lab.objectives.length} Lab steps</span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}