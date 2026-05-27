/**
 * Chunked Upload Service
 *
 * Handles large file uploads by splitting them into manageable chunks,
 * uploading sequentially with progress tracking, retry logic, and
 * pause/resume/cancel capabilities.
 */

export interface ChunkedUploadOptions {
  /** Size of each chunk in bytes (default: 1MB) */
  chunkSize?: number;
  /** Maximum number of retry attempts for failed chunks (default: 3) */
  maxRetries?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number;
  /** Upload type ('resume' or 'jd') */
  uploadType?: 'resume' | 'jd';
  /** Callback for progress updates */
  onProgress?: (progress: UploadProgress) => void;
  /** Callback for chunk completion */
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  /** Callback for upload completion */
  onComplete?: (response: UploadResponse) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
}

export interface UploadProgress {
  /** Overall progress percentage (0-100) */
  percentage: number;
  /** Number of bytes uploaded */
  uploadedBytes: number;
  /** Total file size in bytes */
  totalBytes: number;
  /** Current chunk being uploaded */
  currentChunk: number;
  /** Total number of chunks */
  totalChunks: number;
  /** Upload speed in bytes per second */
  uploadSpeed: number;
  /** Estimated time remaining in seconds */
  timeRemaining: number;
  /** Upload state */
  state: UploadState;
}

export interface UploadResponse {
  /** ID of the uploaded file */
  id: string;
  /** Title/name of the file */
  title: string;
  /** Content/text extracted from file */
  content: string;
  /** File path/URL */
  file_path: string;
  /** Creation timestamp */
  created_at: string;
}

export type UploadState = 'idle' | 'uploading' | 'paused' | 'completed' | 'error' | 'cancelled';

export interface ChunkedUploadInstance {
  /** Start the upload */
  start: () => Promise<UploadResponse>;
  /** Pause the upload */
  pause: () => void;
  /** Resume the upload */
  resume: () => Promise<UploadResponse>;
  /** Cancel the upload */
  cancel: () => void;
  /** Get current progress */
  getProgress: () => UploadProgress;
}

/**
 * Creates a chunked upload instance for large file uploads
 */
export function createChunkedUpload(
  file: File,
  uploadEndpoint: string,
  options: ChunkedUploadOptions = {}
): ChunkedUploadInstance {
  const {
    chunkSize = 1024 * 1024, // 1MB default
    maxRetries = 3,
    retryDelay = 1000,
    uploadType = 'resume',
    onProgress,
    onChunkComplete,
    onComplete,
    onError,
  } = options;

  // Calculate total chunks
  const totalChunks = Math.ceil(file.size / chunkSize);

  // Upload state
  let state: UploadState = 'idle';
  let currentChunk = 0;
  let uploadedBytes = 0;
  let aborted = false;
  let paused = false;

  // Progress tracking
  let startTime = 0;
  let lastProgressUpdate = 0;
  let progressUpdateInterval: NodeJS.Timeout | null = null;

  /**
   * Calculate upload progress
   */
  const calculateProgress = (): UploadProgress => {
    const percentage = (uploadedBytes / file.size) * 100;
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const uploadSpeed = elapsedSeconds > 0 ? uploadedBytes / elapsedSeconds : 0;
    const remainingBytes = file.size - uploadedBytes;
    const timeRemaining = uploadSpeed > 0 ? remainingBytes / uploadSpeed : 0;

    return {
      percentage: Math.min(100, Math.max(0, percentage)),
      uploadedBytes,
      totalBytes: file.size,
      currentChunk,
      totalChunks,
      uploadSpeed,
      timeRemaining,
      state,
    };
  };

  /**
   * Notify progress with throttling
   */
  const notifyProgress = () => {
    const now = Date.now();
    if (now - lastProgressUpdate < 100) return; // Throttle to 10fps

    lastProgressUpdate = now;
    const progress = calculateProgress();
    onProgress?.(progress);
  };

  /**
   * Start progress updates interval
   */
  const startProgressUpdates = () => {
    if (progressUpdateInterval) return;

    progressUpdateInterval = setInterval(() => {
      if (!paused && !aborted && state !== 'completed') {
        notifyProgress();
      }
    }, 100);
  };

  /**
   * Stop progress updates interval
   */
  const stopProgressUpdates = () => {
    if (progressUpdateInterval) {
      clearInterval(progressUpdateInterval);
      progressUpdateInterval = null;
    }
  };

  /**
   * Split file into chunks
   */
  const createChunk = (chunkIndex: number): Blob => {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    return file.slice(start, end);
  };

  /**
   * Upload a single chunk with retry logic
   */
  const uploadChunk = async (
    chunkIndex: number,
    retryCount = 0
  ): Promise<{ chunkIndex: number; etag: string }> => {
    const chunk = createChunk(chunkIndex);

    // Create form data for chunk upload
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('fileId', `${file.name}-${file.size}-${Date.now()}`);
    formData.append('fileName', file.name);
    formData.append('fileSize', file.size.toString());
    formData.append('fileType', file.type);

    try {
      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
        signal: aborted ? AbortSignal.timeout(0) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Update progress
      uploadedBytes += chunk.size;
      currentChunk = chunkIndex + 1;
      notifyProgress();
      onChunkComplete?.(chunkIndex, totalChunks);

      return { chunkIndex, etag: data.etag };

    } catch (error) {
      if (aborted) {
        throw new Error('Upload cancelled');
      }

      if (retryCount < maxRetries) {
        // Retry with exponential backoff
        const delay = retryDelay * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return uploadChunk(chunkIndex, retryCount + 1);
      }

      throw error;
    }
  };

  /**
   * Complete the upload by triggering file recombination
   */
  const completeUpload = async (fileId: string): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('fileId', fileId);
    formData.append('fileName', file.name);
    formData.append('totalChunks', totalChunks.toString());
    formData.append('title', file.name.replace(/\.[^/.]+$/, '')); // Remove extension
    formData.append('uploadType', uploadType);

    const response = await fetch(`${uploadEndpoint}/complete`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  };

  /**
   * Start the chunked upload process
   */
  const start = async (): Promise<UploadResponse> => {
    try {
      state = 'uploading';
      startTime = Date.now();
      startProgressUpdates();

      const fileId = `${file.name}-${file.size}-${Date.now()}`;
      const chunks: { chunkIndex: number; etag: string }[] = [];

      // Upload all chunks sequentially
      for (let i = 0; i < totalChunks; i++) {
        if (aborted) {
          throw new Error('Upload cancelled');
        }

        while (paused) {
          if (aborted) {
            throw new Error('Upload cancelled');
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const result = await uploadChunk(i);
        chunks.push(result);
      }

      // Complete the upload
      const response = await completeUpload(fileId);

      state = 'completed';
      uploadedBytes = file.size;
      notifyProgress();
      stopProgressUpdates();

      onComplete?.(response);
      return response;

    } catch (error) {
      state = 'error';
      stopProgressUpdates();
      const uploadError = error instanceof Error ? error : new Error('Upload failed');
      onError?.(uploadError);
      throw uploadError;
    }
  };

  /**
   * Pause the upload
   */
  const pause = () => {
    if (state === 'uploading') {
      paused = true;
      state = 'paused';
      notifyProgress();
    }
  };

  /**
   * Resume the upload
   */
  const resume = async (): Promise<UploadResponse> => {
    if (state === 'paused') {
      paused = false;
      state = 'uploading';
      notifyProgress();
      // Resume happens automatically in the upload loop
      return await new Promise((resolve, reject) => {
        // The existing upload loop will continue
        const checkCompletion = setInterval(() => {
          if (state === 'completed') {
            clearInterval(checkCompletion);
            onComplete?.({} as UploadResponse); // Will be replaced with actual response
            resolve({} as UploadResponse);
          } else if (state === 'error') {
            clearInterval(checkCompletion);
            reject(new Error('Upload failed'));
          } else if (aborted) {
            clearInterval(checkCompletion);
            reject(new Error('Upload cancelled'));
          }
        }, 100);
      });
    }
    return await start();
  };

  /**
   * Cancel the upload
   */
  const cancel = () => {
    aborted = true;
    state = 'cancelled';
    stopProgressUpdates();
    notifyProgress();
  };

  /**
   * Get current progress
   */
  const getProgress = (): UploadProgress => {
    return calculateProgress();
  };

  return {
    start,
    pause,
    resume,
    cancel,
    getProgress,
  };
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format seconds to human-readable time string
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Format upload speed to human-readable string
 */
export function formatUploadSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}
