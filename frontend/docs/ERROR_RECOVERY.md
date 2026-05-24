# Error Recovery System

Comprehensive error recovery system for SyncHire application with user-friendly Chinese error messages, automatic retry with exponential backoff, and contextual recovery actions.

## Features

- **Automatic Retry**: Exponential backoff retry for transient errors
- **User-Friendly Messages**: All error messages in Chinese
- **Contextual Recovery**: Smart recovery strategies based on error type
- **Multiple UI Components**: Toast notifications, inline errors, and modal dialogs
- **React Hooks**: Easy integration with React components
- **Type Safety**: Full TypeScript support
- **Accessibility**: WCAG 2.1 AA compliant error UIs

## Installation

The error recovery system is already integrated into the SyncHire frontend. No additional installation required.

## Quick Start

### Using the Error Recovery Hook

```typescript
import { useErrorRecovery } from '@/hooks/use-error-recovery';

function MyComponent() {
  const { error, isError, executeWithRetry, clearError } = useErrorRecovery({
    enableAutoRetry: true,
    onRecovery: () => console.log('Recovered!'),
  });

  const fetchData = async () => {
    try {
      const data = await executeWithRetry(async () => {
        const response = await fetch('/api/data');
        if (!response.ok) throw new Error('Failed to fetch');
        return response.json();
      });
      return data;
    } catch (err) {
      // Error is automatically handled by the hook
    }
  };

  return (
    <div>
      {isError && (
        <InlineErrorRecovery
          strategy={ErrorRecoveryStrategies.getStrategy(error!)}
          onAction={() => clearError()}
        />
      )}
    </div>
  );
}
```

### Using Error Recovery Boundary

```typescript
import { ErrorRecoveryBoundary } from '@/components/error-recovery-boundary';

function MyPage() {
  return (
    <ErrorRecoveryBoundary
      recoveryContextId="my-page"
      onError={(error, errorInfo) => {
        console.error('Page error:', error, errorInfo);
      }}
    >
      <MyComponent />
    </ErrorRecoveryBoundary>
  );
}
```

### Wrapping API Calls with Retry

```typescript
import { withRetry } from '@/lib/api-retry';

const apiCall = withRetry(
  async (userId: string) => {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) throw new Error('Failed');
    return response.json();
  },
  {
    maxAttempts: 3,
    initialDelay: 1000,
    onRetry: (attempt, error) => {
      console.log(`Retry ${attempt}:`, error);
    },
  }
);

// Usage
const userData = await apiCall('user-123');
```

## Core Concepts

### Error Types

The system categorizes errors into types:

- `NETWORK_ERROR`: Network connectivity issues
- `VALIDATION_ERROR`: Input validation failures
- `AUTH_ERROR`: Authentication/authorization failures
- `NOT_FOUND`: Resource not found (404)
- `SERVER_ERROR`: Server-side errors (5xx)
- `UNKNOWN_ERROR`: Unexpected errors

### Error Severity

- `LOW`: Minor issues (validation warnings)
- `MEDIUM`: User-recoverable errors
- `HIGH`: Significant errors affecting functionality
- `CRITICAL`: Severe errors requiring immediate attention

### Recovery Strategies

Each error type has a dedicated recovery strategy with:

- User-friendly Chinese messages
- Suggested actions
- Recovery buttons
- Contextual help links

## Components

### ErrorRecoveryDialog

Modal dialog for critical errors requiring user attention.

```typescript
<ErrorRecoveryDialog
  strategy={strategy}
  isOpen={true}
  onClose={() => {}}
  onAction={(action) => {}}
  showTechnicalDetails={false}
/>
```

### InlineErrorRecovery

Inline error display for less critical errors.

```typescript
<InlineErrorRecovery
  strategy={strategy}
  onAction={(action) => {}}
  compact={false}
/>
```

### ErrorToast

Non-intrusive toast notifications.

```typescript
import { useErrorToast } from '@/components/error-toast';

function MyComponent() {
  const { showToast, ToastContainer } = useErrorToast();

  const handleError = (error: AppError) => {
    showToast(error, () => console.log('Retrying...'));
  };

  return (
    <>
      {/* Your component */}
      <ToastContainer />
    </>
  );
}
```

## Hooks

### useErrorRecovery

Main hook for error recovery.

```typescript
const {
  error,           // Current error
  isError,         // Is there an error?
  isRecovering,    // Is recovery in progress?
  retryCount,      // Number of retry attempts
  setError,        // Set error manually
  clearError,      // Clear current error
  retry,           // Retry last operation
  recover,         // Execute recovery action
  executeWithRetry // Execute function with retry
} = useErrorRecovery(options);
```

### useApiErrorRecovery

Specialized hook for API errors.

```typescript
const { handleApiError } = useApiErrorRecovery({
  showNotification: true,
});

try {
  await apiCall();
} catch (error) {
  handleApiError(error); // Automatically handles and displays error
}
```

### useFormErrorRecovery

Hook for form validation errors.

```typescript
const {
  fieldErrors,
  hasErrors,
  setFieldError,
  clearFieldError,
  clearAllErrors,
  getError,
} = useFormErrorRecovery();
```

## API Reference

### ErrorRecoveryManager

Manage recovery callbacks across the application.

```typescript
// Register a recovery callback
ErrorRecoveryManager.registerRecoveryCallback('context-id', () => {
  console.log('Recovering...');
});

// Execute a recovery callback
ErrorRecoveryManager.executeRecovery('context-id');

// Unregister a callback
ErrorRecoveryManager.unregisterRecoveryCallback('context-id');

// Get all registered contexts
const contexts = ErrorRecoveryManager.getRegisteredContexts();

// Clear all callbacks
ErrorRecoveryManager.clearAllCallbacks();
```

### Retry Configuration

```typescript
interface RetryConfig {
  maxAttempts: number;          // Maximum retry attempts (default: 3)
  initialDelay: number;         // Initial delay in ms (default: 1000)
  maxDelay: number;             // Maximum delay in ms (default: 10000)
  backoffMultiplier: number;    // Backoff multiplier (default: 2)
  retryableErrors: ErrorType[]; // Retryable error types
}
```

### Error Recovery Strategy

```typescript
interface ErrorRecoveryStrategy {
  error: AppError;
  userMessage: string;
  context: RecoveryContext;
  actions: RecoveryAction[];
  technicalDetails?: string;
}

interface RecoveryAction {
  id: string;
  label: string;
  icon?: string;
  action: () => void | Promise<void>;
  primary?: boolean;
}
```

## Best Practices

### 1. Use Error Boundaries for Component Errors

Wrap major page components with `ErrorRecoveryBoundary`:

```typescript
<ErrorRecoveryBoundary recoveryContextId="dashboard">
  <Dashboard />
</ErrorRecoveryBoundary>
```

### 2. Implement Retry for Network Requests

Use `withRetry` for all API calls:

```typescript
const apiCall = withRetry(async () => {
  const response = await fetch('/api/data');
  if (!response.ok) throw new Error('Failed');
  return response.json();
});
```

### 3. Provide Contextual Recovery Actions

Register recovery callbacks for specific contexts:

```typescript
useEffect(() => {
  ErrorRecoveryManager.registerRecoveryCallback('form-submit', () => {
    resetForm();
    setFocus();
  });

  return () => {
    ErrorRecoveryManager.unregisterRecoveryCallback('form-submit');
  };
}, []);
```

### 4. Use Appropriate Error Types

Create errors with proper types:

```typescript
const error = ErrorHandler.createError(
  ErrorType.VALIDATION,
  'Email is required',
  ErrorSeverity.LOW,
  { field: 'email' }
);
```

### 5. Display User-Friendly Messages

Always show Chinese messages to users:

```typescript
const messages = getComprehensiveErrorMessage(error);
// Returns: { title, message, suggestions }
```

## Examples

### File Upload with Error Recovery

```typescript
export async function uploadFileWithRecovery(file: File) {
  // Validate file
  if (file.size > 5 * 1024 * 1024) {
    throw ErrorHandler.createError(
      ErrorType.VALIDATION,
      '文件过大，请上传小于5MB的文件',
      ErrorSeverity.MEDIUM
    );
  }

  // Upload with retry
  return withRetry(
    async () => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    { maxAttempts: 3 }
  )();
}
```

### Form Validation with Error Recovery

```typescript
function MyForm() {
  const { setFieldError, getError, clearAllErrors } = useFormErrorRecovery();

  const validateEmail = (email: string) => {
    if (!email.includes('@')) {
      setFieldError('email', '请输入有效的邮箱地址');
    } else {
      clearFieldError('email');
    }
  };

  return (
    <form>
      <input
        type="email"
        aria-invalid={!!getError('email')}
        aria-describedby={getError('email') ? 'email-error' : undefined}
        onChange={(e) => validateEmail(e.target.value)}
      />
      {getError('email') && (
        <span id="email-error" role="alert">
          {getError('email')}
        </span>
      )}
    </form>
  );
}
```

### React Query Integration

```typescript
import { useMutation } from '@tanstack/react-query';
import { useErrorRecovery } from '@/hooks/use-error-recovery';

function useCreateUser() {
  const { executeWithRetry } = useErrorRecovery();

  return useMutation({
    mutationFn: (data: CreateUserInput) =>
      executeWithRetry(async () => {
        const response = await fetch('/api/users', {
          method: 'POST',
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Failed to create user');
        return response.json();
      }),
  });
}
```

## Testing

The error recovery system includes comprehensive tests:

```bash
# Run error recovery tests
npm test -- error-recovery.test.ts
```

## Accessibility

All error UI components are WCAG 2.1 AA compliant:

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader announcements
- High contrast error indicators
- Clear error messages and recovery paths

## Performance

- Lazy loading of error components
- Debounced toast notifications
- Optimized retry calculations
- Minimal bundle size impact

## Future Enhancements

- [ ] Offline detection and handling
- [ ] Error analytics and reporting
- [ ] Custom error themes
- [ ] Multi-language support (beyond Chinese)
- [ ] Error recovery suggestions based on ML

## Support

For issues or questions about the error recovery system, please refer to the main project documentation or contact the development team.
