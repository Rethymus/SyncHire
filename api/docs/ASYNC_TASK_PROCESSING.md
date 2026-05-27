# Async Task Processing System

## Overview

The SyncHire API now includes a comprehensive async task processing system for handling resource-intensive AI operations like resume optimization, JD parsing, and interview preparation. This system ensures API responsiveness by processing heavy operations in the background.

## Architecture

### Components

1. **Task Model** (`app/models/task.py`)
   - Database model for storing task information
   - Supports multiple task types and statuses
   - Includes error handling and progress tracking

2. **Task Service** (`app/services/task_service.py`)
   - Core business logic for task management
   - Task submission, processing, and result retrieval
   - Background worker implementation

3. **Task API** (`app/api/tasks.py`)
   - REST endpoints for task management
   - Status checking and result retrieval
   - Task statistics and cleanup

4. **Background Worker** (`app/workers/task_worker.py`)
   - Standalone process for processing tasks
   - Priority-based task queue
   - Error handling and retry logic

### Task Types

- `resume_optimization`: Optimize resume for specific job description
- `jd_parsing`: Parse and extract structured data from job descriptions
- `resume_parsing`: Parse and extract structured data from resumes
- `interview_prep`: Generate interview preparation materials
- `match_analysis`: Analyze resume-JD compatibility and match score

### Task Statuses

- `pending`: Task is queued and waiting to be processed
- `processing`: Task is currently being processed
- `completed`: Task completed successfully
- `failed`: Task failed with error details

## Usage

### 1. Submit a Task

Submit a task for async processing:

```python
from app.services.task_service import TaskService

# Submit resume optimization task
task = await TaskService.submit_task(
    db=db,
    user_id=user_id,
    task_type="resume_optimization",
    input_data={
        "resume_content": "Resume text here...",
        "jd_content": "Job description here...",
        "parsed_jd": {...}
    },
    priority="high"
)

print(f"Task submitted: {task.id}")
```

### 2. Check Task Status

Poll for task completion:

```python
# Get current status
task = await TaskService.get_task_status(
    db=db,
    task_id=task_id,
    user_id=user_id
)

print(f"Status: {task.status}")

if task.status == "completed":
    print("Task completed!")
elif task.status == "failed":
    print(f"Task failed: {task.error_message}")
```

### 3. Get Task Results

Retrieve results from completed tasks:

```python
# Get task results
result = await TaskService.get_task_result(
    db=db,
    task_id=task_id,
    user_id=user_id
)

print(f"Optimization result: {result}")
```

## API Endpoints

### POST /api/tasks/submit

Submit a new task for async processing.

**Request:**
```json
{
  "task_type": "resume_optimization",
  "input_data": {
    "resume_content": "Resume text...",
    "jd_content": "Job description..."
  },
  "priority": "high"
}
```

**Response:**
```json
{
  "task_id": "uuid-here",
  "task_type": "resume_optimization",
  "status": "pending",
  "created_at": "2026-05-26T14:30:00Z",
  "message": "Task submitted successfully"
}
```

### GET /api/tasks/{task_id}/status

Check the current status of a task.

**Response:**
```json
{
  "task_id": "uuid-here",
  "task_type": "resume_optimization",
  "status": "processing",
  "created_at": "2026-05-26T14:30:00Z",
  "started_at": "2026-05-26T14:30:05Z",
  "updated_at": "2026-05-26T14:30:10Z"
}
```

### GET /api/tasks/{task_id}/result

Get the result of a completed task.

**Response:**
```json
{
  "task_id": "uuid-here",
  "status": "completed",
  "result": {
    "optimized_content": "...",
    "changes_made": [...],
    "keywords_added": [...]
  }
}
```

### GET /api/tasks/

Get all tasks for the current user.

**Query Parameters:**
- `status_filter`: Filter by task status
- `task_type_filter`: Filter by task type
- `limit`: Maximum number of tasks (default: 50)

### GET /api/tasks/stats

Get statistics about user's tasks.

**Response:**
```json
{
  "by_status": {
    "pending": 5,
    "processing": 2,
    "completed": 150,
    "failed": 3
  },
  "by_type": {
    "resume_optimization": 80,
    "jd_parsing": 60,
    "interview_prep": 20
  },
  "total": 160
}
```

## Running the Background Worker

Start the task worker process:

```bash
# From the api directory
python -m app.workers.task_worker
```

The worker will:
1. Connect to Redis and the database
2. Continuously poll for pending tasks
3. Process tasks in priority order
4. Handle errors gracefully

### Deployment

For production, run the worker as a separate service:

**Systemd Service:**
```ini
[Unit]
Description=SyncHire Task Worker
After=network.target redis.service postgresql.service

[Service]
Type=simple
User=synchire
WorkingDirectory=/path/to/SyncHire/api
ExecStart=/usr/bin/python3 -m app.workers.task_worker
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Docker Compose:**
```yaml
services:
  task-worker:
    build: ./api
    command: python -m app.workers.task_worker
    depends_on:
      - redis
      - postgres
    environment:
      - DATABASE_URL=postgresql+asyncpg://...
      - REDIS_URL=redis://redis:6379/0
    restart: unless-stopped
```

## Integration with Existing Services

### JD Service

The JD service now supports async processing:

```python
# Create JD with async parsing
result = await JDService.create_jd(
    db=db,
    user_id=user_id,
    jd_data=jd_create,
    async_processing=True  # Enable async processing
)

jd = result["jd"]
task_id = result["task_id"]

# Check parsing status later
task = await TaskService.get_task_status(db, task_id, user_id)
```

### Application Service

Resume optimization can be processed asynchronously:

```python
# Submit optimization task
result = await ApplicationService.optimize_resume(
    db=db,
    application_id=app_id,
    user_id=user_id,
    async_processing=True  # Returns task_id immediately
)

task_id = result["task_id"]

# Poll for completion
while True:
    task = await TaskService.get_task_status(db, task_id, user_id)
    if task.status in ["completed", "failed"]:
        break
    await asyncio.sleep(2)

# Get results
if task.status == "completed":
    result = await TaskService.get_task_result(db, task_id, user_id)
    print(f"Optimized resume: {result}")
```

## Task Priority

Tasks are processed in priority order:

- **high**: Processed first (e.g., user-initiated optimizations)
- **normal**: Default priority (e.g., background parsing)
- **low**: Processed when no higher priority tasks exist

## Error Handling

Tasks that fail include detailed error information:

```python
if task.status == "failed":
    print(f"Error: {task.error_message}")
    print(f"Details: {task.error_details}")

    # Retry logic
    if should_retry(task.error_details):
        new_task = await TaskService.submit_task(
            db=db,
            user_id=user_id,
            task_type=task.task_type,
            input_data=task.input_data,
            priority="high"  # Retry with higher priority
        )
```

## Performance Considerations

### Concurrency

The worker processes up to 3 tasks concurrently by default. Adjust based on your resources:

```python
worker = TaskWorker(max_concurrent=5)  # Process 5 tasks at once
```

### Task Cleanup

Old completed/failed tasks are automatically cleaned up:

```python
# Clean up tasks older than 7 days
await TaskService.cleanup_old_tasks(db=db, days=7)
```

### Database Indexes

The task table includes optimized indexes for:
- `user_id`: Fast user task lookup
- `status`: Efficient status filtering
- `task_type`: Type-based queries
- `created_at`: Temporal ordering
- Composite index on `(user_id, status)`: Optimized user status queries

## Monitoring

Monitor task processing health:

```python
# Get task statistics
stats = await TaskService.get_task_stats(db=db, user_id=user_id)

# Monitor worker health
- Check Redis queue lengths
- Monitor database connection pool
- Track task processing times
- Monitor error rates
```

## Security

- Tasks are isolated per user (authorization checks)
- Input validation prevents malicious task injection
- Error messages don't expose sensitive information
- Tasks timeout after 5 minutes to prevent hanging
- Rate limiting applies to task submission

## Best Practices

1. **Always use async processing** for heavy operations
2. **Implement proper polling** with exponential backoff
3. **Handle task failures** gracefully with user feedback
4. **Clean up old tasks** regularly to maintain performance
5. **Monitor task queues** to prevent backlogs
6. **Set appropriate priorities** based on user experience needs
7. **Cache results** when appropriate to reduce re-processing

## Troubleshooting

### Tasks stuck in "pending" status

1. Check if worker is running
2. Verify Redis connectivity
3. Check database connection pool
4. Review worker logs for errors

### Tasks failing repeatedly

1. Check error details in task records
2. Verify AI service availability
3. Check MCP server connectivity
4. Review input data quality

### Performance issues

1. Reduce concurrent task processing
2. Optimize database queries
3. Add caching for repeated operations
4. Scale worker processes

## Migration

To migrate existing synchronous operations to async:

1. Add `async_processing` parameter to existing methods
2. Submit task instead of processing directly
3. Return task_id to frontend
4. Implement polling logic in frontend
5. Update UI to show processing status

See `JDService.create_jd()` and `ApplicationService.optimize_resume()` for examples.
