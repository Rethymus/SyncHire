"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { Pause, Play, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UploadProgress as UploadProgressType, UploadState } from "@/lib/chunked-upload";
import { formatBytes, formatTime, formatUploadSpeed } from "@/lib/chunked-upload";

interface UploadProgressProps {
  /** Current upload progress */
  progress: UploadProgressType;
  /** File name being uploaded */
  fileName: string;
  /** Callback for pause action */
  onPause?: () => void;
  /** Callback for resume action */
  onResume?: () => void;
  /** Callback for cancel action */
  onCancel?: () => void;
  /** Additional CSS classes */
  className?: string;
}

function UploadProgressComponent({
  progress,
  fileName,
  onPause,
  onResume,
  onCancel,
  className,
}: UploadProgressProps) {
  const [localProgress, setLocalProgress] = useState(progress);

  // Update local progress when prop changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setLocalProgress(progress);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [progress]);

  // Determine if controls should be shown
  const showControls = localProgress.state !== 'completed' && localProgress.state !== 'error' && localProgress.state !== 'cancelled';
  const isPaused = localProgress.state === 'paused';
  const isUploading = localProgress.state === 'uploading';

  // Get status message based on state
  const getStatusMessage = (): string => {
    switch (localProgress.state) {
      case 'idle':
        return 'Preparing upload...';
      case 'uploading':
        return `Uploading chunk ${localProgress.currentChunk} of ${localProgress.totalChunks}...`;
      case 'paused':
        return 'Upload paused';
      case 'completed':
        return 'Upload complete!';
      case 'error':
        return 'Upload failed';
      case 'cancelled':
        return 'Upload cancelled';
      default:
        return 'Initializing...';
    }
  };

  // Get status color based on state
  const getStatusColor = (): string => {
    switch (localProgress.state) {
      case 'uploading':
        return 'text-blue-600';
      case 'paused':
        return 'text-yellow-600';
      case 'completed':
        return 'text-green-600';
      case 'error':
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Get progress bar color based on state
  const getProgressColor = (): string => {
    switch (localProgress.state) {
      case 'uploading':
        return 'bg-blue-600';
      case 'paused':
        return 'bg-yellow-600';
      case 'completed':
        return 'bg-green-600';
      case 'error':
      case 'cancelled':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  // Handle pause
  const handlePause = useCallback(() => {
    onPause?.();
  }, [onPause]);

  // Handle resume
  const handleResume = useCallback(() => {
    onResume?.();
  }, [onResume]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  return (
    <div className={cn(
      "bg-white border border-gray-200 rounded-lg p-4 shadow-sm",
      className
    )}>
      {/* File Name and Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isUploading && (
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin flex-shrink-0" />
          )}
          <p className="font-medium text-gray-900 truncate" title={fileName}>
            {fileName}
          </p>
        </div>
        <p className={cn("text-sm font-medium flex-shrink-0", getStatusColor())}>
          {getStatusMessage()}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
          <span>{localProgress.percentage.toFixed(1)}%</span>
          <span>
            {formatBytes(localProgress.uploadedBytes)} / {formatBytes(localProgress.totalBytes)}
          </span>
        </div>
        <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={cn("h-full transition-all duration-300", getProgressColor())}
            style={{ width: `${localProgress.percentage}%` }}
            role="progressbar"
            aria-valuenow={localProgress.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Upload progress"
          />
        </div>
      </div>

      {/* Upload Statistics */}
      {(isUploading || isPaused) && (
        <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
          <div className="bg-gray-50 rounded p-2 text-center">
            <p className="text-gray-600 text-xs mb-1">Speed</p>
            <p className="font-medium text-gray-900">
              {formatUploadSpeed(localProgress.uploadSpeed)}
            </p>
          </div>
          <div className="bg-gray-50 rounded p-2 text-center">
            <p className="text-gray-600 text-xs mb-1">Time Remaining</p>
            <p className="font-medium text-gray-900">
              {formatTime(localProgress.timeRemaining)}
            </p>
          </div>
          <div className="bg-gray-50 rounded p-2 text-center">
            <p className="text-gray-600 text-xs mb-1">Chunks</p>
            <p className="font-medium text-gray-900">
              {localProgress.currentChunk}/{localProgress.totalChunks}
            </p>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      {showControls && (
        <div className="flex items-center justify-end gap-2">
          {isPaused ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResume}
              className="min-h-[36px] px-3"
              aria-label="Resume upload"
            >
              <Play className="h-4 w-4 mr-1" />
              Resume
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePause}
              disabled={!isUploading}
              className="min-h-[36px] px-3"
              aria-label="Pause upload"
            >
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="min-h-[36px] px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
            aria-label="Cancel upload"
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      )}

      {/* Completion/Error Messages */}
      {localProgress.state === 'completed' && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 font-medium">
            ✓ Upload completed successfully!
          </p>
        </div>
      )}

      {localProgress.state === 'error' && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-medium">
            ✕ Upload failed. Please try again.
          </p>
        </div>
      )}

      {localProgress.state === 'cancelled' && (
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">
            Upload was cancelled.
          </p>
        </div>
      )}
    </div>
  );
}

export const UploadProgress = memo(UploadProgressComponent);
