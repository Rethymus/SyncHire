"use client";

import { useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Trash2, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { logger, LogCategory } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface BulkDeleteActionsProps {
  selectedIds: string[];
  itemType: "resume" | "jd" | "application";
  onDelete: (ids: string[]) => Promise<{
    success_count: number;
    failed_count: number;
    errors: Array<{ id: string; error: string }>;
  }>;
  onDeleteSuccess?: () => void;
  disabled?: boolean;
  className?: string;
}

export const BulkDeleteActions = memo<BulkDeleteActionsProps>(function BulkDeleteActions({
  selectedIds,
  itemType,
  onDelete,
  onDeleteSuccess,
  disabled = false,
  className,
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    success_count: number;
    failed_count: number;
    errors: Array<{ id: string; error: string }>;
  } | null>(null);

  const getItemTypeName = useCallback(() => {
    switch (itemType) {
      case "resume":
        return "resume";
      case "jd":
        return "job description";
      case "application":
        return "application";
      default:
        return "item";
    }
  }, [itemType]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;

    setIsDeleting(true);
    setProgress(0);
    setResult(null);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const deleteResult = await onDelete(selectedIds);

      clearInterval(progressInterval);
      setProgress(100);
      setResult(deleteResult);

      logger.info(LogCategory.USER_ACTION, `Bulk deleted ${deleteResult.success_count} ${getItemTypeName()}(s)`);

      // Call success callback if provided
      if (deleteResult.success_count > 0 && onDeleteSuccess) {
        onDeleteSuccess();
      }

      // Auto-close dialog after showing results
      setTimeout(() => {
        setDialogOpen(false);
        setResult(null);
        setProgress(0);
      }, 3000);
    } catch (error) {
      logger.error(LogCategory.API, `Bulk delete failed for ${itemType}`, error as Error);
      setResult({
        success_count: 0,
        failed_count: selectedIds.length,
        errors: selectedIds.map((id) => ({
          id,
          error: "Failed to delete due to network error",
        })),
      });
    } finally {
      setIsDeleting(false);
    }
  }, [selectedIds, itemType, onDelete, onDeleteSuccess, getItemTypeName]);

  const isDisabled = disabled || selectedIds.length === 0;

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setDialogOpen(true)}
        disabled={isDisabled}
        className={cn(className)}
        aria-label={`Delete ${selectedIds.length} selected ${getItemTypeName()}(s)`}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete {selectedIds.length > 0 && `(${selectedIds.length})`}
      </Button>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {result ? "Delete Results" : `Confirm Bulk Delete`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {result ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {result.failed_count === 0 ? (
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    ) : result.success_count === 0 ? (
                      <XCircle className="h-8 w-8 text-red-600" />
                    ) : (
                      <AlertCircle className="h-8 w-8 text-yellow-600" />
                    )}
                    <div>
                      <p className="font-medium">
                        {result.success_count} {getItemTypeName()}(s) deleted successfully
                      </p>
                      {result.failed_count > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {result.failed_count} deletion(s) failed
                        </p>
                      )}
                    </div>
                  </div>

                  {result.errors.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Failed deletions:</p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {result.errors.map((error, idx) => (
                          <div
                            key={idx}
                            className="text-xs p-2 bg-muted rounded"
                          >
                            <span className="font-mono">{error.id}</span>: {error.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  Are you sure you want to delete <strong>{selectedIds.length} {getItemTypeName()}(s)</strong>?
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {isDeleting && (
            <div className="py-4">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-center mt-2 text-muted-foreground">
                Deleting {getItemTypeName()}(s)... {progress}%
              </p>
            </div>
          )}

          {!result && (
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  handleBulkDelete();
                }}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete {selectedIds.length} {getItemTypeName()}(s)
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          )}

          {result && (
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setDialogOpen(false)}>
                Close
              </AlertDialogAction>
            </AlertDialogFooter>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});