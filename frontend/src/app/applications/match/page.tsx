import { Suspense } from "react";
import MatchAnalysisClient from "../[id]/match/match-analysis-client";

function MatchAnalysisFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-600">正在分析匹配度...</p>
    </div>
  );
}

export default function MatchAnalysisQueryPage() {
  return (
    <Suspense fallback={<MatchAnalysisFallback />}>
      <MatchAnalysisClient />
    </Suspense>
  );
}
