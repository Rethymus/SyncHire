import { Suspense } from "react";
import MatchAnalysisClient from "../[id]/match/match-analysis-client";

function MatchAnalysisFallback() {
  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center">
      <p className="text-muted-foreground">正在分析匹配度...</p>
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
