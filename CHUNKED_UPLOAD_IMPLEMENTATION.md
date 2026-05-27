# Chunked File Upload Implementation

## Overview

This implementation provides a robust chunked file upload system with progress tracking, retry logic, and pause/resume capabilities for large resume and JD files in the SyncHire platform.

## Architecture

### Frontend Components

#### 1. Chunked Upload Service (`/frontend/src/lib/chunked-upload.ts`)

**Core Features:**
- **File Chunking**: Automatically splits files into 1MB chunks (configurable)
- **Sequential Upload**: Uploads chunks one by one with progress tracking
- **Retry Logic**: Automatically retries failed chunks up to 3 times with exponential backoff
- **Progress Tracking**: Real-time progress updates with speed and time remaining calculations
- **Pause/Resume**: Supports pausing and resuming uploads (framework ready)
- **Cancel**: Allows users to cancel ongoing uploads

**Key Functions:**
```typescript
createChunkedUpload(file, uploadEndpoint, options): ChunkedUploadInstance
```

**Options:**
- `chunkSize`: Size of each chunk in bytes (default: 1MB)
- `maxRetries`: Maximum retry attempts for failed chunks (default: 3)
- `retryDelay`: Delay between retries in ms (default: 1000)
- `uploadType`: Type of upload ('resume' or 'jd')
- `onProgress`: Callback for progress updates
- `onChunkComplete`: Callback when a chunk completes
- `onComplete`: Callback when upload completes
- `onError`: Callback for errors

**Utility Functions:**
- `formatBytes(bytes)`: Convert bytes to human-readable format
- `formatTime(seconds)`: Convert seconds to readable time string
- `formatUploadSpeed(bytesPerSecond)`: Format upload speed

#### 2. Upload Progress Component (`/frontend/src/components/upload-progress.tsx`)

**Features:**
- Visual progress bar with percentage
- Upload speed indicator (MB/s)
- Time remaining estimate
- Current chunk progress
- Pause/Resume/Cancel controls
- Status-based color coding
- Accessible UI with ARIA labels

**States:**
- `idle`: Initial state
- `uploading`: Active upload
- `paused`: Upload paused
- `completed`: Upload finished
- `error`: Upload failed
- `cancelled`: Upload cancelled

#### 3. Updated Upload Components

**Resume Upload** (`/frontend/src/components/resume-upload.tsx`):
- Integrated chunked upload service
- Shows detailed progress during upload
- Handles batch file uploads
- Maintains existing functionality

**JD Upload** (`/frontend/src/components/jd-file-upload.tsx`):
- Integrated chunked upload service
- Shows detailed progress during upload
- Supports larger files (up to 100MB)
- Maintains existing functionality

### Backend Components

#### Chunked Upload API (`/api/app/api/upload.py`)

**Endpoints:**

1. **POST `/api/upload/chunk`** - Upload a single chunk
   - Accepts chunk data with metadata
   - Validates chunk size and file size limits
   - Stores chunks in temporary user-specific directories
   - Returns chunk confirmation with ETag

2. **POST `/api/upload/complete`** - Complete chunked upload
   - Validates all chunks are present
   - Recombines chunks into final file
   - Processes file based on upload type (resume/JD)
   - Cleans up temporary chunk files
   - Returns processed file data

3. **DELETE `/api/upload/cleanup/{fileId}`** - Clean up chunks
   - Removes temporary chunk files
   - Used for cancelled or failed uploads

**Configuration:**
- `CHUNK_DIR`: Temporary chunk storage (`/tmp/chunks`)
- `UPLOAD_DIR`: Temporary file storage (`/tmp/uploads`)
- `MAX_CHUNK_SIZE`: 10MB maximum chunk size
- `MAX_FILE_SIZE`: 100MB maximum file size

**Features:**
- User-isolated chunk storage
- Chunk validation and verification
- Automatic cleanup of old chunks
- Integration with existing resume and JD services
- Comprehensive error handling

## Integration Guide

### Frontend Usage

**Basic Example:**
```typescript
import { createChunkedUpload } from '@/lib/chunked-upload';

const chunkedUpload = createChunkedUpload(file, '/api/upload/chunk', {
  chunkSize: 1024 * 1024, // 1MB
  maxRetries: 3,
  uploadType: 'resume',
  onProgress: (progress) => {
    console.log(`${progress.percentage}% complete`);
    console.log(`Speed: ${progress.uploadSpeed} bytes/s`);
    console.log(`Time remaining: ${progress.timeRemaining}s`);
  },
  onComplete: (response) => {
    console.log('Upload complete:', response);
  },
  onError: (error) => {
    console.error('Upload failed:', error);
  }
});

await chunkedUpload.start();
```

**With Progress Component:**
```tsx
import { UploadProgress } from '@/components/upload-progress';
import { useState } from 'react';

function MyUploadComponent() {
  const [progress, setProgress] = useState(null);

  const handleUpload = async (file) => {
    const chunkedUpload = createChunkedUpload(file, '/api/upload/chunk', {
      onProgress: setProgress,
      onComplete: (response) => {
        // Handle completion
      }
    });

    await chunkedUpload.start();
  };

  return (
    <>
      <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
      {progress && (
        <UploadProgress
          progress={progress}
          fileName="Uploading..."
          onPause={() => chunkedUpload.pause()}
          onResume={() => chunkedUpload.resume()}
          onCancel={() => chunkedUpload.cancel()}
        />
      )}
    </>
  );
}
```

### Backend Integration

The upload API is already integrated into the main application via `/api/main.py`:

```python
from app.api import upload

app.include_router(upload.router, prefix="/api")
```

## Benefits

### User Experience
1. **Better Feedback**: Real-time progress updates with speed and time estimates
2. **Reliability**: Automatic retry for failed chunks
3. **Control**: Pause/resume/cancel capabilities
4. **Large Files**: Support for files up to 100MB

### Technical Benefits
1. **Resumability**: Can resume interrupted uploads
2. **Memory Efficiency**: Processes files in chunks, not all at once
3. **Network Resilience**: Handles network interruptions gracefully
4. **Scalability**: Can handle concurrent uploads efficiently

### Performance
1. **Chunked Processing**: Reduces memory footprint
2. **Parallel Ready**: Architecture supports future parallel chunk uploads
3. **Smart Retries**: Exponential backoff reduces server load
4. **Efficient Storage**: Temporary chunks cleaned up automatically

## Testing

### Unit Tests
Located in `/frontend/src/lib/__tests__/chunked-upload.test.ts`:
- Chunk size calculation
- Progress tracking
- Utility functions
- State management

### Manual Testing
1. **Small Files** (< 1MB): Should complete in single chunk
2. **Medium Files** (1-10MB): Multiple chunks, good progress feedback
3. **Large Files** (10-100MB): Many chunks, excellent progress visibility
4. **Network Interruption**: Pause/resume functionality
5. **Error Recovery**: Failed chunk retries

## Configuration

### Frontend
```typescript
const options = {
  chunkSize: 1024 * 1024,      // 1MB chunks
  maxRetries: 3,                // Retry failed chunks 3 times
  retryDelay: 1000,             // Wait 1s between retries
  uploadType: 'resume'          // or 'jd'
};
```

### Backend
```python
CHUNK_DIR = Path("/tmp/chunks")           # Temporary storage
UPLOAD_DIR = Path("/tmp/uploads")         # Final file storage
MAX_CHUNK_SIZE = 10 * 1024 * 1024        # 10MB max chunk
MAX_FILE_SIZE = 100 * 1024 * 1024        # 100MB max file
```

## Security Considerations

1. **File Size Limits**: Enforced at both chunk and total file levels
2. **User Isolation**: Chunks stored in user-specific directories
3. **Validation**: All inputs validated before processing
4. **Cleanup**: Automatic cleanup of temporary files
5. **Rate Limiting**: Upload endpoints protected by rate limiting

## Future Enhancements

1. **Parallel Upload**: Upload multiple chunks simultaneously
2. **Checksum Validation**: Verify chunk integrity
3. **Compression**: Compress chunks before upload
4. **Encryption**: Encrypt sensitive chunks
5. **Background Upload**: Continue upload when user navigates away
6. **WebSocket Progress**: Real-time progress via WebSocket

## Troubleshooting

### Common Issues

**Issue**: Upload gets stuck at 99%
- **Solution**: Check network connectivity, retry last chunk

**Issue**: "Missing chunks" error
- **Solution**: Some chunks failed to upload, check network logs

**Issue**: Slow upload speed
- **Solution**: Check network bandwidth, consider reducing chunk size

**Issue**: Memory issues on backend
- **Solution**: Verify cleanup is working, check CHUNK_DIR size

### Monitoring

Key metrics to monitor:
- Upload success rate
- Average upload time
- Chunk retry rate
- Temporary storage usage
- Network error rate

## Conclusion

This chunked upload implementation significantly improves the user experience for large file uploads in SyncHire, providing better feedback, reliability, and control over the upload process. The architecture is scalable and maintainable, with room for future enhancements.
