/**
 * Error Recovery System - Barrel Export
 * Centralized exports for all error recovery functionality
 */

// Core error handling
export {
  ErrorHandler,
  ErrorLogger,
  ErrorType,
  ErrorSeverity,
} from './error-handler';

export type { AppError } from './error-handler';

// Error recovery strategies and utilities
export {
  calculateBackoff,
  isRetryable,
  retryWithBackoff,
  ErrorRecoveryStrategies,
  ErrorRecoveryManager,
  ErrorContextGenerator,
} from './error-recovery';

export type { RecoveryAction, RecoveryContext, ErrorRecoveryStrategy, RetryConfig } from './error-recovery';

// Error messages (Chinese)
export {
  errorMessages,
  contextErrorMessages,
  getErrorMessageByCode,
  getComprehensiveErrorMessage,
  formatErrorForDisplay,
  actionLabels,
  severityDescriptions,
} from './error-messages';

export type { ErrorMessages } from './error-messages';

// API retry wrapper
export {
  withRetry,
  batchApiCallsWithRetry,
  sequentialApiCallsWithRetry,
  withTimeoutAndRetry,
  debouncedApiCall,
  throttledApiCall,
  cachedApiCall,
  clearApiCache,
} from './api-retry';

export type { ApiRetryConfig } from './api-retry';

// Components
export {
  ErrorRecoveryDialog,
  InlineErrorRecovery,
} from '../components/error-recovery-dialog';

export {
  ErrorRecoveryBoundary,
  ErrorRecoveryWrapper,
} from '../components/error-recovery-boundary';

export {
  ErrorToast,
  useErrorToast,
  ErrorToastContainer,
} from '../components/error-toast';

// Hooks
export {
  useErrorRecovery,
  useApiErrorRecovery,
  useFormErrorRecovery,
} from '../hooks/use-error-recovery';

// Integration examples
export {
  ErrorHandlingExamples,
  errorContexts,
  setupGlobalErrorHandling,
  uploadFileWithRecovery,
} from './error-recovery-integration';
