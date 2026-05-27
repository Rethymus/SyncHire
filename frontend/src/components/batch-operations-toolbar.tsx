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

interface BatchOperationsToolbarProps {
  selectedIds: Set<string>;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onSelectionChange: (ids: Set<string>) => void;
  totalApplications: number;
  applications: JobApplication[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-800" },
  applied: { label: "已申请", color: "bg-blue-100 text-blue-800" },
  interview: { label: "面试中", color: "bg-purple-100 text-purple-800" },
  offer: { label: "已录用", color: "bg-green-100 text-green-800" },
  rejected: { label: "已拒绝", color: "bg-red-100 text-red-800" },
  optimized: { label: "已优化", color: "bg-green-100 text-green-800" },
  pending: { label: "处理中", color: "bg-yellow-100 text-yellow-800" },
};

export const BatchOperationsToolbar = memo(function BatchOperationsToolbar({
  selectedIds,
  onSelectAll,
  onClearSelection,
  onSelectionChange,
  totalApplications,
  applications,
}: BatchOperationsToolbarProps) {
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
      const headers = [
        "公司",
        "职位",
        "状态",
        "匹配度",
        "创建时间",
        "更新时间",
        "标签",
      ];

      const rows = selectedApps.map((app) => {
        const statusInfo = statusConfig[app.status] || { label: app.status };
        const tags = (app as any)?.tags?.join(", ") || "";

        return [
          app.companyName,
          app.position,
          statusInfo.label,
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
  }, [selectedIds, applications, onClearSelection]);

  if (selectedCount === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-4">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onSelectAll}
            aria-label="Select all applications"
          />
          <span className="text-sm text-gray-600">
            选择申请进行批量操作
          </span>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={onSelectAll}>
              <CheckSquare className="h-4 w-4 mr-2" />
              全选
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
              aria-label="Select all applications"
            />
            <Badge variant="secondary" className="text-sm font-medium">
              {selectedCount} 个已选择
            </Badge>
          </div>

          <div className="h-6 w-px bg-gray-300" />

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">批量操作:</span>

            {/* Status Update */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={processing}>
                  更新状态
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setSelectedStatus("draft")}>
                  <span className={cn("w-2 h-2 rounded-full mr-2 bg-gray-400")} />
                  设为草稿
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedStatus("applied")}>
                  <span className={cn("w-2 h-2 rounded-full mr-2 bg-blue-400")} />
                  设为已申请
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedStatus("interview")}>
                  <span className={cn("w-2 h-2 rounded-full mr-2 bg-purple-400")} />
                  设为面试中
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedStatus("offer")}>
                  <span className={cn("w-2 h-2 rounded-full mr-2 bg-green-400")} />
                  设为已录用
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedStatus("rejected")}>
                  <span className={cn("w-2 h-2 rounded-full mr-2 bg-red-400")} />
                  设为已拒绝
                </DropdownMenuItem>
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
              添加标签
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
              导出CSV
            </Button>

            {/* Delete */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={processing}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除
            </Button>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <X className="h-4 w-4 mr-2" />
          取消选择
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
            <DialogTitle>确认批量更新状态</DialogTitle>
            <DialogDescription>
              您确定要将 {selectedCount} 个申请的状态更新为{" "}
              <strong>
                {selectedStatus && statusConfig[selectedStatus]?.label}
              </strong>{" "}
              吗？
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
              取消
            </Button>
            <Button
              onClick={handleBatchStatusUpdate}
              disabled={processing || !selectedStatus}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                "确认更新"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tags Management Dialog */}
      <Dialog open={tagsDialogOpen} onOpenChange={setTagsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量添加标签</DialogTitle>
            <DialogDescription>
              为 {selectedCount} 个申请添加标签。多个标签用逗号分隔。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="例如: 高优先级, 待跟进, 已联系"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={processing}
            />
            <p className="text-xs text-gray-500 mt-2">
              标签将添加到现有标签中，不会覆盖已有标签
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
              取消
            </Button>
            <Button
              onClick={handleBatchTagsUpdate}
              disabled={processing || !newTags.trim()}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                "添加标签"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除 <strong>{selectedCount}</strong> 个申请吗？
              <br />
              <span className="text-red-600 font-medium">
                此操作无法撤销，所有相关数据将被永久删除。
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  删除中...
                </>
              ) : (
                "确认删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
