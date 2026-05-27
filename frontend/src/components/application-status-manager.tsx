"use client";

import { useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Save, History } from "lucide-react";
import { applicationAPI } from "@/lib/api-client";
import { logger, LogCategory } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface StatusHistoryEntry {
  id: string;
  old_status: string | null;
  new_status: string;
  notes: string | null;
  changed_at: string;
}

interface ApplicationStatusManagerProps {
  applicationId: string;
  currentStatus: string;
  onStatusUpdate: (newStatus: string) => void;
  className?: string;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "待处理", color: "text-gray-600" },
  { value: "optimized", label: "已优化", color: "text-blue-600" },
  { value: "applied", label: "已申请", color: "text-green-600" },
  { value: "interview", label: "面试中", color: "text-purple-600" },
  { value: "offer", label: "已录用", color: "text-emerald-600" },
  { value: "rejected", label: "已拒绝", color: "text-red-600" },
];

const STATUS_LABELS: Record<string, string> = STATUS_OPTIONS.reduce(
  (acc, option) => ({ ...acc, [option.value]: option.label }),
  {}
);

export const ApplicationStatusManager = memo(function ApplicationStatusManager({
  applicationId,
  currentStatus,
  onStatusUpdate,
  className,
}: ApplicationStatusManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [notes, setNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      setIsUpdating(true);
      try {
        const response = await applicationAPI.updateStatus(
          applicationId,
          newStatus,
          notes || undefined
        );

        if (response.error) {
          throw new Error(response.error);
        }

        logger.info(
          LogCategory.API,
          "Application status updated",
          { applicationId, oldStatus: currentStatus, newStatus }
        );

        onStatusUpdate(newStatus);
        setIsDialogOpen(false);
        setNotes("");
      } catch (error) {
        logger.error(
          LogCategory.API,
          "Failed to update application status",
          error instanceof Error ? error : new Error(String(error))
        );
        // You could add a toast notification here
      } finally {
        setIsUpdating(false);
      }
    },
    [applicationId, currentStatus, notes, onStatusUpdate]
  );

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const response = await applicationAPI.getStatusHistory(applicationId);

      if (response.error) {
        throw new Error(response.error);
      }

      setHistory((response.data || []) as StatusHistoryEntry[]);
    } catch (error) {
      logger.error(
        LogCategory.API,
        "Failed to load status history",
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      setIsLoadingHistory(false);
    }
  }, [applicationId]);

  const handleOpenHistory = useCallback(() => {
    setShowHistory(true);
    loadHistory();
  }, [loadHistory]);

  const currentLabel = STATUS_LABELS[currentStatus] || currentStatus;

  return (
    <>
      <div className={cn("flex items-center gap-2", className)}>
        <Select
          value={currentStatus}
          onValueChange={(value) => {
            setSelectedStatus(value);
            setIsDialogOpen(true);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={currentLabel} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenHistory}
          disabled={isLoadingHistory}
        >
          <History className="h-4 w-4 mr-2" />
          历史
        </Button>
      </div>

      {/* Status Change Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>更新申请状态</DialogTitle>
            <DialogDescription>
              将申请状态从 &ldquo;{STATUS_LABELS[currentStatus]}&rdquo; 更新为 &ldquo;
              {STATUS_LABELS[selectedStatus]}&rdquo;
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">备注 (可选)</Label>
              <Textarea
                id="notes"
                placeholder="添加关于此状态变更的备注..."
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setNotes("");
              }}
              disabled={isUpdating}
            >
              取消
            </Button>
            <Button
              onClick={() => handleStatusChange(selectedStatus)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  更新中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  确认更新
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>状态变更历史</DialogTitle>
            <DialogDescription>
              查看此申请的所有状态变更记录
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无状态变更历史
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="border-l-2 border-gray-200 pl-4 pb-4 last:pb-0"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {entry.old_status && (
                          <>
                            <span className="text-sm font-medium text-gray-600">
                              {STATUS_LABELS[entry.old_status]}
                            </span>
                            <span className="text-gray-400">→</span>
                          </>
                        )}
                        <span className="text-sm font-semibold text-gray-900">
                          {STATUS_LABELS[entry.new_status]}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.changed_at).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowHistory(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
