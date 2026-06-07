"use client";

import { useState, useCallback, memo } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  CheckSquare,
  Square,
  Trash2,
  Download,
  Tag as TagIcon,
  MoreVertical,
  X,
  Loader2,
} from "lucide-react";
import { JobApplication } from "@/lib/store";
import { cn } from "@/lib/utils";
import { interpolate, useLiteCopy } from "@/lib/lite-i18n";

interface BatchOperationsToolbarProps {
  selectedIds: Set<string>;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onSelectionChange: (ids: Set<string>) => void;
  totalApplications: number;
  applications: JobApplication[];
}

const statusColors: Record<string, { color: string }> = {
  draft: { color: "bg-gray-100 text-gray-800" },
  applied: { color: "bg-blue-100 text-blue-800" },
  interview: { color: "bg-purple-100 text-purple-800" },
  offer: { color: "bg-green-100 text-green-800" },
  rejected: { color: "bg-red-100 text-red-800" },
  optimized: { color: "bg-green-100 text-green-800" },
  pending: { color: "bg-yellow-100 text-yellow-800" },
};

export const BatchOperationsToolbar = memo(function BatchOperationsToolbar({
  selectedIds,
  onSelectAll,
  onClearSelection,
  onSelectionChange,
  totalApplications,
  applications,
}: BatchOperationsToolbarProps) {
  const { t } = useLiteCopy();
  const copy = t.batchApplications;
  const statusLabels = t.applicationStatus;
  const { updateApplication, deleteApplication } = useAppStore();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [newTags, setNewTags] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [exportProgress, setExportProgress] = useState(false);

  const selectedCount = selectedIds.size;
  const allSelected = selectedCount === totalApplications && totalApplications > 0;

  const handleBatchStatusUpdate = useCallback(async () => {
    if (!selectedStatus || selectedIds.size === 0) return;

    setProcessing(true);
    try {
      // Update all selected applications
      const updatePromises = Array.from(selectedIds).map((id) =>
        updateApplication(id, { status: selectedStatus as any })
      );

      await Promise.all(updatePromises);

      setStatusDialogOpen(false);
      onClearSelection();
      setSelectedStatus("");
    } catch (error) {
      console.error("Batch status update failed:", error);
    } finally {
      setProcessing(false);
    }
  }, [selectedIds, selectedStatus, updateApplication, onClearSelection]);

  const handleBatchTagsUpdate = useCallback(async () => {
    if (!newTags.trim() || selectedIds.size === 0) return;

    setProcessing(true);
    try {
      const tags = newTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      // Update all selected applications with tags
      const updatePromises = Array.from(selectedIds).map((id) => {
        const app = applications.find((a) => a.id === id);
        const existingTags = (app as any)?.tags || [];
        const mergedTags = [...new Set([...existingTags, ...tags])];

        return updateApplication(id, { tags: mergedTags } as any);
      });

      await Promise.all(updatePromises);

      setTagsDialogOpen(false);
      onClearSelection();
      setNewTags("");
    } catch (error) {
      console.error("Batch tags update failed:", error);
    } finally {
      setProcessing(false);
    }
  }, [selectedIds, newTags, applications, updateApplication, onClearSelection]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setProcessing(true);
    try {
      // Delete all selected applications
      const deletePromises = Array.from(selectedIds).map((id) =>
        deleteApplication(id)
      );

      await Promise.all(deletePromises);

      setDeleteDialogOpen(false);
      onClearSelection();
    } catch (error) {
      console.error("Batch delete failed:", error);
    } finally {
      setProcessing(false);
    }
  }, [selectedIds, deleteApplication, onClearSelection]);

  const handleBatchExport = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setExportProgress(true);
    try {
      const selectedApps = applications.filter((app) =>
        selectedIds.has(app.id)
      );

      // Create CSV content
      const headers = [...copy.csvHeaders];

      const rows = selectedApps.map((app) => {
        const statusLabel = statusLabels[app.status as keyof typeof statusLabels] || app.status;
        const tags = (app as any)?.tags?.join(", ") || "";

        return [
          app.companyName,
          app.position,
          statusLabel,
          app.matchScore?.toString() || "N/A",
          app.createdAt.toLocaleDateString(),
          app.updatedAt.toLocaleDateString(),
          tags,
        ].map((field) => `"${field}"`).join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");

      // Create and trigger download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `applications_export_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onClearSelection();
    } catch (error) {
      console.error("Batch export failed:", error);
    } finally {
      setExportProgress(false);
    }
  }, [selectedIds, applications, onClearSelection, copy.csvHeaders, statusLabels]);

  if (selectedCount === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-4">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onSelectAll}
            aria-label={copy.selectAll}
          />
          <span className="text-sm text-gray-600">
            {copy.selectForBatch}
          </span>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={onSelectAll}>
              <CheckSquare className="h-4 w-4 mr-2" />
              {copy.selectAll}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm border-2 border-blue-200 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onSelectAll}
              aria-label={copy.selectAll}
            />
            <Badge variant="secondary" className="text-sm font-medium">
              {interpolate(copy.selectedCount, { count: selectedCount })}
            </Badge>
          </div>

          <div className="h-6 w-px bg-gray-300" />

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">{copy.batchActions}</span>

            {/* Status Update */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={processing}>
                  {copy.updateStatus}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(["draft", "applied", "interview", "offer", "rejected"] as const).map((status) => (
                  <DropdownMenuItem key={status} onClick={() => setSelectedStatus(status)}>
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full mr-2",
                        status === "draft" && "bg-gray-400",
                        status === "applied" && "bg-blue-400",
                        status === "interview" && "bg-purple-400",
                        status === "offer" && "bg-green-400",
                        status === "rejected" && "bg-red-400"
                      )}
                    />
                    {interpolate(copy.setStatus, {
                      status: statusLabels[status],
                    })}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Tags Management */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTagsDialogOpen(true)}
              disabled={processing}
            >
              <TagIcon className="h-4 w-4 mr-2" />
              {copy.addTags}
            </Button>

            {/* Export */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleBatchExport}
              disabled={exportProgress || processing}
            >
              {exportProgress ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {copy.exportCsv}
            </Button>

            {/* Delete */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={processing}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {copy.delete}
            </Button>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <X className="h-4 w-4 mr-2" />
          {copy.clearSelection}
        </Button>
      </div>

      {/* Status Update Confirmation Dialog */}
      <Dialog
        open={statusDialogOpen || !!selectedStatus}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedStatus("");
          }
          setStatusDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.confirmBatchStatusTitle}</DialogTitle>
            <DialogDescription>
              {selectedStatus
                ? interpolate(copy.confirmBatchStatusDescription, {
                    count: selectedCount,
                    status: statusLabels[selectedStatus as keyof typeof statusLabels] || selectedStatus,
                  })
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedStatus("");
                setStatusDialogOpen(false);
              }}
              disabled={processing}
            >
              {copy.cancel}
            </Button>
            <Button
              onClick={handleBatchStatusUpdate}
              disabled={processing || !selectedStatus}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {copy.processing}
                </>
              ) : (
                copy.confirmUpdate
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tags Management Dialog */}
      <Dialog open={tagsDialogOpen} onOpenChange={setTagsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.batchTagsTitle}</DialogTitle>
            <DialogDescription>
              {interpolate(copy.batchTagsDescription, { count: selectedCount })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder={copy.tagsPlaceholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={processing}
            />
            <p className="text-xs text-gray-500 mt-2">
              {copy.tagsHelp}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewTags("");
                setTagsDialogOpen(false);
              }}
              disabled={processing}
            >
              {copy.cancel}
            </Button>
            <Button
              onClick={handleBatchTagsUpdate}
              disabled={processing || !newTags.trim()}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {copy.processing}
                </>
              ) : (
                copy.confirmAddTags
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {interpolate(copy.confirmDeleteDescription, { count: selectedCount })}
              <br />
              <span className="text-red-600 font-medium">
                {copy.destructiveWarning}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {copy.deleting}
                </>
              ) : (
                copy.confirmDelete
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
