# Bulk Delete Operations Implementation

## Overview

This implementation provides comprehensive bulk delete functionality for resumes, job descriptions, and applications in the SyncHire platform. The implementation includes:

- **Backend API endpoints** with partial failure support
- **Frontend UI components** with selection and bulk actions
- **Error handling** with detailed feedback
- **Progress indicators** for better UX
- **Logging** for audit trails

## Backend Implementation

### API Endpoints

#### POST `/api/resumes/bulk-delete`
Delete multiple resumes by IDs.

**Request:**
```json
{
  "ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "success_count": 2,
  "failed_count": 1,
  "errors": [
    {
      "id": "uuid3",
      "error": "Resume not found or access denied"
    }
  ]
}
```

#### POST `/api/jds/bulk-delete`
Delete multiple job descriptions by IDs.

#### POST `/api/applications/bulk-delete`
Delete multiple applications by IDs.

### Features

- **Partial failure support**: If some items fail to delete, successful deletions are still committed
- **Validation**: Maximum 100 items per bulk operation
- **UUID validation**: Ensures all IDs are valid UUIDs
- **User ownership check**: Only items owned by the user can be deleted
- **File cleanup**: For resumes, deletes associated files from storage
- **Transaction safety**: Database rollbacks on failures
- **Comprehensive logging**: All operations are logged for audit trails

## Frontend Implementation

### Components

#### 1. `BulkDeleteActions`
Reusable bulk delete button component with confirmation dialog.

```tsx
import { BulkDeleteActions } from "@/components/bulk-delete-actions";

<BulkDeleteActions
  selectedIds={selectedIds}
  itemType="resume"
  onDelete={handleBulkDelete}
  onDeleteSuccess={() => console.log("Deleted successfully")}
/>
```

**Props:**
- `selectedIds`: Array of selected item IDs
- `itemType`: Type of item ("resume" | "jd" | "application")
- `onDelete`: Function to handle bulk delete
- `onDeleteSuccess`: Callback after successful deletion
- `disabled`: Disable the button
- `className`: Additional CSS classes

#### 2. `SelectableList`
List component with checkbox selection support.

```tsx
import { SelectableList } from "@/components/selectable-list";

<SelectableList
  items={resumes}
  itemIdKey="id"
  renderItem={(resume, isSelected) => (
    <div className={isSelected ? "bg-primary/5" : ""}>
      {resume.name}
    </div>
  )}
  onSelectChange={(ids) => console.log("Selected:", ids)}
/>
```

#### 3. `ResumeListWithBulkActions`
Complete resume list component with bulk delete functionality.

```tsx
import { ResumeListWithBulkActions } from "@/components/resume-list-with-bulk-actions";

<ResumeListWithBulkActions
  resumes={resumes}
  onRefresh={() => fetchResumes()}
/>
```

#### 4. `JDListWithBulkActions`
Complete job description list component with bulk delete functionality.

#### 5. `ApplicationListWithBulkActions`
Complete application list component with bulk delete functionality.

### Features

- **Checkbox selection**: Select individual items or all items
- **Bulk actions bar**: Shows when items are selected
- **Progress indicators**: Visual feedback during deletion
- **Error display**: Shows detailed error messages for failed deletions
- **Confirmation dialogs**: Prevents accidental deletions
- **Auto-refresh**: Updates UI after successful deletions
- **Responsive design**: Works on mobile and desktop

## Usage Examples

### Basic Usage

```tsx
import { useState } from "react";
import { BulkDeleteActions } from "@/components/bulk-delete-actions";
import { resumeAPI } from "@/lib/api-client-consolidated";

function MyResumeList() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleBulkDelete = async (ids: string[]) => {
    const response = await resumeAPI.bulkDelete(ids);
    if (response.success && response.data) {
      const { success_count, failed_count } = response.data;
      console.log(`Deleted ${success_count} items`);
      if (failed_count > 0) {
        console.error(`${failed_count} items failed to delete`);
      }
    }
    return response.data;
  };

  return (
    <div>
      {/* Your resume list with checkboxes */}
      <BulkDeleteActions
        selectedIds={selectedIds}
        itemType="resume"
        onDelete={handleBulkDelete}
        onDeleteSuccess={() => setSelectedIds([])}
      />
    </div>
  );
}
```

### Advanced Usage with Custom UI

```tsx
import { useSelectableList } from "@/components/selectable-list";

function MyCustomList() {
  const {
    selectedIds,
    selectedCount,
    toggleSelection,
    clearSelection,
    isSelected,
  } = useSelectableList();

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2>My Resumes ({selectedCount} selected)</h2>
        {selectedCount > 0 && (
          <BulkDeleteActions
            selectedIds={selectedIds}
            itemType="resume"
            onDelete={handleBulkDelete}
          />
        )}
      </div>

      {resumes.map((resume) => (
        <div key={resume.id}>
          <input
            type="checkbox"
            checked={isSelected(resume.id)}
            onChange={() => toggleSelection(resume.id)}
          />
          <span>{resume.name}</span>
        </div>
      ))}
    </div>
  );
}
```

## Error Handling

### Backend Errors

The backend handles various error scenarios:

1. **Invalid UUIDs**: Returns validation error
2. **Empty list**: Returns validation error
3. **Too many items**: Returns validation error (max 100)
4. **Not found**: Returns 404 for individual items
5. **Access denied**: Returns 403 for items not owned by user
6. **Database errors**: Returns 500 with error details

### Frontend Errors

The frontend provides user-friendly error messages:

1. **Network errors**: Shows "Failed to delete due to network error"
2. **Partial failures**: Shows which items failed and why
3. **Validation errors**: Shows input validation messages
4. **Permission errors**: Shows "Access denied" message

## Testing

### Backend Testing

```python
import pytest
from httpx import AsyncClient

async def test_bulk_delete_resumes(client: AsyncClient, test_token):
    response = await client.post(
        "/api/resumes/bulk-delete",
        json={"ids": ["uuid1", "uuid2"]},
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "success_count" in data
    assert "failed_count" in data
    assert "errors" in data
```

### Frontend Testing

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { BulkDeleteActions } from "@/components/bulk-delete-actions";

test("shows bulk delete button when items are selected", () => {
  const onDelete = jest.fn();
  render(
    <BulkDeleteActions
      selectedIds={["id1", "id2"]}
      itemType="resume"
      onDelete={onDelete}
    />
  );

  const button = screen.getByRole("button", { name: /delete 2/i });
  expect(button).toBeInTheDocument();
});
```

## Performance Considerations

1. **Batch size**: Limited to 100 items per request to prevent timeouts
2. **Database queries**: Uses `WHERE id IN (...)` for efficient querying
3. **Transactions**: Single transaction for all deletions
4. **File cleanup**: Async file deletion doesn't block database operations
5. **Progress feedback**: Simulated progress for better UX

## Security Considerations

1. **Authentication**: All endpoints require valid authentication
2. **Authorization**: Only item owners can delete their items
3. **Input validation**: UUID format validation prevents injection attacks
4. **Rate limiting**: Applies to bulk delete operations
5. **Audit logging**: All deletions are logged with user context

## Accessibility

- **Keyboard navigation**: Full keyboard support for all interactions
- **Screen readers**: Proper ARIA labels and roles
- **Color contrast**: Meets WCAG 2.1 AA standards
- **Focus management**: Proper focus handling in dialogs
- **Error announcements**: Screen reader announcements for errors

## Future Enhancements

Potential improvements for future iterations:

1. **Undo functionality**: Allow users to undo bulk deletions within a time window
2. **Export before delete**: Automatically export data before deletion
3. **Scheduled deletion**: Allow users to schedule bulk deletions
4. **Bulk export**: Add bulk export functionality alongside delete
5. **Advanced filtering**: Add filters to bulk selection (e.g., by date range)
6. **Confirmation templates**: Customizable confirmation messages
7. **Progress details**: Show individual item progress during bulk operations

## Troubleshooting

### Common Issues

1. **Partial failures**: Some items fail to delete
   - Check error details in response
   - Verify item ownership
   - Check for database constraints

2. **Timeout errors**: Large bulk operations timeout
   - Reduce batch size
   - Check database performance
   - Verify network connectivity

3. **Permission errors**: Access denied errors
   - Verify user authentication
   - Check item ownership
   - Verify token validity

## API Documentation

For detailed API documentation, see:

- Resumes: `/api/docs#tag/resumes/POST-/api/resumes/bulk-delete`
- JDs: `/api/docs#tag/jds/POST-/api/jds/bulk-delete`
- Applications: `/api/docs#tag/applications/POST-/api/applications/bulk-delete`

## Support

For issues or questions:

1. Check the error messages in the UI
2. Review the browser console for detailed errors
3. Check the backend logs for server-side errors
4. Contact support with error details and reproduction steps