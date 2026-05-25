"use client";

import { useState, useCallback, memo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BulkDeleteActions } from "@/components/bulk-delete-actions";
import { SelectableList, useSelectableList } from "@/components/selectable-list";
import { resumeAPI } from "@/lib/api-client-consolidated";
import { logger, LogCategory } from "@/lib/logger";
import { useAppStore, type Resume } from "@/lib/store";
import {
  FileText,
  Calendar,
  Trash2,
  Download,
  ExternalLink,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { formatDistanceToNow } from "date-fns";

interface ResumeListWithBulkActionsProps {
  resumes?: Resume[];
  onRefresh?: () => void;
  className?: string;
}

export const ResumeListWithBulkActions = memo<ResumeListWithBulkActionsProps>(
  function ResumeListWithBulkActions({ resumes, onRefresh, className }) {
    const { resumes: storedResumes, setResumes } = useAppStore();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [resumeToDelete, setResumeToDelete] = useState<Resume | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Use provided resumes or fall back to store
    const displayResumes = resumes || storedResumes;

    const {
      selectedIds,
      selectedCount,
      toggleSelection,
      clearSelection,
      isSelected,
    } = useSelectableList();

    const handleSingleDelete = useCallback(async (resume: Resume) => {
      setResumeToDelete(resume);
      setDeleteDialogOpen(true);
    }, []);

    const confirmSingleDelete = useCallback(async () => {
      if (!resumeToDelete) return;

      setIsDeleting(true);
      try {
        const response = await resumeAPI.delete(resumeToDelete.id);
        if (response.success) {
          // Update store to remove deleted resume
          setResumes(storedResumes.filter((r) => r.id !== resumeToDelete.id));
          logger.info(LogCategory.USER_ACTION, `Deleted resume: ${resumeToDelete.id}`);
          onRefresh?.();
        }
      } catch (error) {
        logger.error(LogCategory.API, "Failed to delete resume", error as Error);
      } finally {
        setIsDeleting(false);
        setDeleteDialogOpen(false);
        setResumeToDelete(null);
      }
    }, [resumeToDelete, storedResumes, setResumes, onRefresh]);

    const handleBulkDelete = useCallback(async (ids: string[]) => {
      const response = await resumeAPI.bulkDelete(ids);

      if (response.success && response.data) {
        const { success_count, failed_count, errors } = response.data;

        // Update store to remove successfully deleted resumes
        if (success_count > 0) {
          const deletedIds = new Set(
            ids.filter((id) =>
              !errors.some((error) => error.id === id)
            )
          );
          setResumes(storedResumes.filter((r) => !deletedIds.has(r.id)));
        }

        if (failed_count > 0) {
          logger.warn(
            LogCategory.USER_ACTION,
            `Bulk delete completed with ${failed_count} failures`,
            new Error(errors.map((e) => e.error).join(", "))
          );
        }

        clearSelection();
        onRefresh?.();
      }

      return response.data || {
        success_count: 0,
        failed_count: ids.length,
        errors: ids.map((id) => ({ id, error: "Unknown error" }))
      };
    }, [storedResumes, setResumes, clearSelection, onRefresh]);

    const handleExport = useCallback(async (resume: Resume) => {
      try {
        const response = await resumeAPI.export(resume.id, "minimal", 300);
        if (response.success && response.data?.url) {
          window.open(response.data.url, "_blank");
          logger.info(LogCategory.USER_ACTION, `Exported resume: ${resume.id}`);
        }
      } catch (error) {
        logger.error(LogCategory.API, "Failed to export resume", error as Error);
      }
    }, []);

    const renderResumeItem = useCallback(
      (resume: Resume, isItemSelected: boolean) => (
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="bg-primary/10 p-2 rounded-lg">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm truncate">{resume.name}</h4>
                {isItemSelected && (
                  <Badge variant="secondary" className="text-xs">Selected</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(resume.uploadedAt, {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                {resume.content && (
                  <span className="text-xs">
                    {resume.content.length} characters
                  </span>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport(resume)}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open(`/resume/${resume.id}`, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in editor
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSingleDelete(resume)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      [handleExport, handleSingleDelete]
    );

    if (displayResumes.length === 0) {
      return (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No resumes yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload your first resume to get started
          </p>
          <Button size="sm">Upload Resume</Button>
        </Card>
      );
    }

    return (
      <div className={className}>
        {/* Bulk actions bar */}
        {selectedCount > 0 && (
          <div className="sticky top-0 z-10 p-4 bg-background border-b shadow-sm mb-4">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              <div className="flex items-center gap-4">
                <div className="text-sm font-medium">
                  {selectedCount} resume{selectedCount !== 1 ? "s" : ""} selected
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="h-8"
                >
                  Clear selection
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <BulkDeleteActions
                  selectedIds={selectedIds}
                  itemType="resume"
                  onDelete={handleBulkDelete}
                  onDeleteSuccess={() => {
                    clearSelection();
                    onRefresh?.();
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Selectable list */}
        <SelectableList
          items={displayResumes}
          itemIdKey="id"
          renderItem={renderResumeItem}
          onSelectChange={(ids) => {
            // Update local selection state when parent changes selection
            ids.forEach((id) => {
              if (!selectedIds.includes(id)) {
                toggleSelection(id);
              }
            });
          }}
        />

        {/* Single delete confirmation dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Resume?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{resumeToDelete?.name}&quot;?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmSingleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete Resume"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }
);