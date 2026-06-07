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
import { formatLiteDate, interpolate, useLiteCopy } from "@/lib/lite-i18n";

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
  { value: "pending", color: "text-gray-600" },
  { value: "optimized", color: "text-blue-600" },
  { value: "applied", color: "text-green-600" },
  { value: "interview", color: "text-purple-600" },
  { value: "offer", color: "text-emerald-600" },
  { value: "rejected", color: "text-red-600" },
] as const;

export const ApplicationStatusManager = memo(function ApplicationStatusManager({
  applicationId,
  currentStatus,
  onStatusUpdate,
  className,
}: ApplicationStatusManagerProps) {
  const { locale, t } = useLiteCopy();
  const copy = t.applicationStatus;
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

  const currentLabel = copy[currentStatus as keyof typeof copy] || currentStatus;

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
                {copy[option.value]}
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
          {copy.history}
        </Button>
      </div>

      {/* Status Change Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.updateTitle}</DialogTitle>
            <DialogDescription>
              {interpolate(copy.updateDescription, {
                from: copy[currentStatus as keyof typeof copy] || currentStatus,
                to: copy[selectedStatus as keyof typeof copy] || selectedStatus,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">{copy.notes}</Label>
              <Textarea
                id="notes"
                placeholder={copy.notesPlaceholder}
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
              {copy.cancel}
            </Button>
            <Button
              onClick={() => handleStatusChange(selectedStatus)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {copy.updating}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {copy.confirm}
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
            <DialogTitle>{copy.historyTitle}</DialogTitle>
            <DialogDescription>
              {copy.historyDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {copy.emptyHistory}
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
                              {copy[entry.old_status as keyof typeof copy] || entry.old_status}
                            </span>
                            <span className="text-gray-400">→</span>
                          </>
                        )}
                        <span className="text-sm font-semibold text-gray-900">
                          {copy[entry.new_status as keyof typeof copy] || entry.new_status}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatLiteDate(entry.changed_at, locale)}
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
            <Button onClick={() => setShowHistory(false)}>{copy.close}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
