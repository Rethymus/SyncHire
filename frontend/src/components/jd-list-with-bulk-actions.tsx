"use client";

import { useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BulkDeleteActions } from "@/components/bulk-delete-actions";
import { SelectableList, useSelectableList } from "@/components/selectable-list";
import { jdAPI } from "@/lib/api-client-consolidated";
import { logger, LogCategory } from "@/lib/logger";
import { useAppStore } from "@/lib/store";
import {
  Briefcase,
  Building2,
  Calendar,
  Trash2,
  ExternalLink,
  MoreVertical,
  MapPin,
  DollarSign,
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

interface JobDescription {
  id: string;
  title: string;
  company?: string;
  description?: string;
  requirements?: string[];
  skills?: string[];
  createdAt: Date;
}

interface JDListWithBulkActionsProps {
  jobDescriptions?: JobDescription[];
  onRefresh?: () => void;
  className?: string;
}

export const JDListWithBulkActions = memo<JDListWithBulkActionsProps>(
  function JDListWithBulkActions({ jobDescriptions, onRefresh, className }) {
    const { jobDescriptions: storedJDs, setJobDescriptions } = useAppStore();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [jdToDelete, setJdToDelete] = useState<JobDescription | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Use provided JDs or fall back to store
    const displayJDs = jobDescriptions || storedJDs;

    const {
      selectedIds,
      selectedCount,
      toggleSelection,
      clearSelection,
      isSelected,
    } = useSelectableList();

    const handleSingleDelete = useCallback(async (jd: JobDescription) => {
      setJdToDelete(jd);
      setDeleteDialogOpen(true);
    }, []);

    const confirmSingleDelete = useCallback(async () => {
      if (!jdToDelete) return;

      setIsDeleting(true);
      try {
        const response = await jdAPI.delete(jdToDelete.id);
        if (response.success) {
          // Update store to remove deleted JD
          setJobDescriptions(storedJDs.filter((j) => j.id !== jdToDelete.id));
          logger.info(LogCategory.USER_ACTION, `Deleted JD: ${jdToDelete.id}`);
          onRefresh?.();
        }
      } catch (error) {
        logger.error(LogCategory.API, "Failed to delete JD", error as Error);
      } finally {
        setIsDeleting(false);
        setDeleteDialogOpen(false);
        setJdToDelete(null);
      }
    }, [jdToDelete, storedJDs, setJobDescriptions, onRefresh]);

    const handleBulkDelete = useCallback(async (ids: string[]) => {
      const response = await jdAPI.bulkDelete(ids);

      if (response.success && response.data) {
        const { success_count, failed_count, errors } = response.data;

        // Update store to remove successfully deleted JDs
        if (success_count > 0) {
          const deletedIds = new Set(
            ids.filter((id) =>
              !errors.some((error) => error.id === id)
            )
          );
          setJobDescriptions(storedJDs.filter((j) => !deletedIds.has(j.id)));
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
    }, [storedJDs, setJobDescriptions, clearSelection, onRefresh]);

    const renderJDItem = useCallback(
      (jd: JobDescription, isItemSelected: boolean) => (
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Briefcase className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4 className="font-medium text-sm truncate">{jd.title}</h4>
                {isItemSelected && (
                  <Badge variant="secondary" className="text-xs">Selected</Badge>
                )}
                {jd.company && (
                  <Badge variant="outline" className="text-xs">
                    <Building2 className="h-3 w-3 mr-1" />
                    {jd.company}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(jd.createdAt, {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                {jd.skills && jd.skills.length > 0 && (
                  <span className="text-xs">
                    {jd.skills.length} skill{jd.skills.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {jd.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {jd.description}
                </p>
              )}
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
              <DropdownMenuItem
                onClick={() => window.open(`/jd/${jd.id}`, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSingleDelete(jd)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      [handleSingleDelete]
    );

    if (displayJDs.length === 0) {
      return (
        <Card className="p-8 text-center">
          <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No job descriptions yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add your first job description to start matching
          </p>
          <Button size="sm">Add Job Description</Button>
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
                  {selectedCount} job description{selectedCount !== 1 ? "s" : ""} selected
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
                  itemType="jd"
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
          items={displayJDs}
          itemIdKey="id"
          renderItem={renderJDItem}
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
              <AlertDialogTitle>Delete Job Description?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{jdToDelete?.title}&quot;?
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
                {isDeleting ? "Deleting..." : "Delete Job Description"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }
);