import { Suspense } from "react";
import MatchAnalysisClient from "./match-analysis-client";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ id: "app-seed-1" }];
}

export default function MatchAnalysisPage() {
  return (
    <Suspense fallback={null}>
      <MatchAnalysisClient />
    </Suspense>
  );
}
