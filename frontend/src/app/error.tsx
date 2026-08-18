"use client";

/**
 * Route-level error boundary (Next.js convention).
 * Renders when any page in this segment throws during render; keeps the
 * global navigation usable and offers retry / return-home actions.
 */

import { useEffect } from "react";
import Link from "next/link";
import { Home, RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLiteCopy } from "@/lib/lite-i18n";
import { logger, LogCategory } from "@/lib/logger";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale, t } = useLiteCopy();
  const copy = t.errorBoundary;

  useEffect(() => {
    logger.error(LogCategory.UI, "Route render error", error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <TriangleAlert className="h-8 w-8 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-foreground">
          {copy.title}
        </h1>
        <p className="mb-6 text-sm leading-6 text-muted-foreground">
          {copy.description}
        </p>
        {error.digest ? (
          <p className="mb-6 font-mono text-xs text-muted-foreground/70">
            {error.digest}
          </p>
        ) : null}
        <div className="flex justify-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <Home className="h-4 w-4" aria-hidden="true" />
              {copy.home}
            </Link>
          </Button>
          <Button onClick={() => reset()}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {copy.retry}
          </Button>
        </div>
        <p className="mt-6 text-xs text-muted-foreground/60">
          SyncHire Lite · {locale}
        </p>
      </div>
    </main>
  );
}
