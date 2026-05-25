"use client";

import { useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BulkDeleteActions } from "@/components/bulk-delete-actions";
import { SelectableList, useSelectableList } from "@/components/selectable-list";
import { applicationAPI } from "@/lib/api-client-consolidated";
import { logger, LogCategory } from "@/lib/logger";
import { useAppStore } from "@/lib/store";
import {
  FileText,
  Briefcase,
  Calendar,
  Trash2,
  ExternalLink,
  MoreVertical,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
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

interface Application {
  id: string;
  resume_id: string;
  jd_id: string;
  status: string;
  match_score?: number;
  created_at: Date;
  updated_at: Date;
  notes?: string;
  resume?: {
    id: string;
    title: string;
  };
  jd?: {
    id: string;
    title: string;
    company?: string;
  };
}

interface ApplicationListWithBulkActionsProps {
  applications?: Application[];
  onRefresh?: () => void;
  className?: string;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "applied":
      return "default";
    case "screening":
      return "secondary";
    case "interview":
      return "outline";
    case "offer":
      return "default";
    case "rejected":
      return "destructive";
    default:
      return "secondary";
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case "applied":
      return Clock;
    case "interview":
      return Calendar;
    case "offer":
      return CheckCircle2;
    case "rejected":
      return XCircle;
    default:
      return Clock;
  }
};

export const ApplicationListWithBulkActions = memo<ApplicationListWithBulkActionsProps>(
  function ApplicationListWithBulkActions({ applications, onRefresh, className }) {
    const { applications: storedApplications, deleteApplication } = useAppStore();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [applicationToDelete, setApplicationToDelete] = useState<Application | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Use provided applications or fall back to store
    // Convert stored applications to match the expected Application interface
    const displayApplications = applications || storedApplications.map(app => ({
      id: app.id,
      resume_id: app.resumeId,
      jd_id: app.jobId,
      status: app.status,
      match_score: app.matchScore,
      created_at: app.createdAt,
      updated_at: app.updatedAt,
      resume: {
        id: app.resumeId,
        title: `Resume ${app.resumeId}`
      },
      jd: {
        id: app.jobId,
        title: `Job ${app.jobId}`,
        company: ''
      }
    }));

    const {
      selectedIds,
      selectedCount,
      toggleSelection,
      clearSelection,
      isSelected,
    } = useSelectableList();

    const handleSingleDelete = useCallback(async (application: Application) => {
      setApplicationToDelete(application);
      setDeleteDialogOpen(true);
    }, []);

    const confirmSingleDelete = useCallback(async () => {
      if (!applicationToDelete) return;

      setIsDeleting(true);
      try {
        const response = await applicationAPI.delete(applicationToDelete.id);
        if (response.success) {
          // Update store to remove deleted application
          deleteApplication(applicationToDelete.id);
          logger.info(LogCategory.USER_ACTION, `Deleted application: ${applicationToDelete.id}`);
          onRefresh?.();
        }
      } catch (error) {
        logger.error(LogCategory.API, "Failed to delete application", error as Error);
      } finally {
        setIsDeleting(false);
        setDeleteDialogOpen(false);
        setApplicationToDelete(null);
      }
    }, [applicationToDelete, deleteApplication, onRefresh]);

    const handleBulkDelete = useCallback(async (ids: string[]) => {
      const response = await applicationAPI.bulkDelete(ids);

      if (response.success && response.data) {
        const { success_count, failed_count, errors } = response.data;

        // Update store to remove successfully deleted applications
        if (success_count > 0) {
          const deletedIds = new Set(
            ids.filter((id) =>
              !errors.some((error) => error.id === id)
            )
          );
          // Note: Store will be updated via onRefresh callback
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
    }, [clearSelection, onRefresh]);

    const renderApplicationItem = useCallback(
      (application: Application, isItemSelected: boolean) => {
        const StatusIcon = getStatusIcon(application.status);

        return (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="bg-primary/10 p-2 rounded-lg">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="font-medium text-sm">
                    {application.jd?.title || "Unknown Position"}
                  </h4>
                  {isItemSelected && (
                    <Badge variant="secondary" className="text-xs">Selected</Badge>
                  )}
                  <Badge variant={getStatusColor(application.status)} className="text-xs">
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {application.status}
                  </Badge>
                  {application.match_score !== undefined && application.match_score > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {application.match_score}% match
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">
                      {application.resume?.title || "Unknown Resume"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(application.created_at, {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
                {application.notes && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {application.notes}
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
                  onClick={() => window.open(`/application/${application.id}`, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSingleDelete(application)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      [handleSingleDelete]
    );

    if (displayApplications.length === 0) {
      return (
        <Card className="p-8 text-center">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first application to start tracking
          </p>
          <Button size="sm">Create Application</Button>
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
                  {selectedCount} application{selectedCount !== 1 ? "s" : ""} selected
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
                  itemType="application"
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
          items={displayApplications}
          itemIdKey="id"
          renderItem={renderApplicationItem}
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
              <AlertDialogTitle>Delete Application?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this application?
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
                {isDeleting ? "Deleting..." : "Delete Application"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }
);