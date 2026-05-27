"use client";

/**
 * Centralized Toast Notification Hook
 *
 * Provides convenient methods for showing toast notifications
 * for CRUD operations and other user feedback.
 */

import { useToast as useToastContext, useToastMessage as useToastMessageBase } from "@/components/ui/toast";

// Re-export useToastMessage for backward compatibility
export const useToastMessage = useToastMessageBase;

export function useToast() {
  const { toast } = useToastContext();
  const { success, error, info, warning } = useToastMessageBase();

  return {
    // Basic toast method
    toast,

    // Convenience methods for CRUD operations
    success: (title: string, description?: string) => {
      success(title, description);
    },

    error: (title: string, description?: string) => {
      error(title, description);
    },

    info: (title: string, description?: string) => {
      info(title, description);
    },

    warning: (title: string, description?: string) => {
      warning(title, description);
    },

    // CRUD-specific convenience methods
    crud: {
      create: {
        success: (entityName: string, entityDetails?: string) => {
          success(
            `${entityName} created successfully`,
            entityDetails || `Your ${entityName.toLowerCase()} has been created.`
          );
        },
        error: (entityName: string, errorMessage?: string) => {
          error(
            `Failed to create ${entityName}`,
            errorMessage || `Could not create ${entityName.toLowerCase()}. Please try again.`
          );
        },
      },

      update: {
        success: (entityName: string, entityDetails?: string) => {
          success(
            `${entityName} updated successfully`,
            entityDetails || `Your ${entityName.toLowerCase()} has been updated.`
          );
        },
        error: (entityName: string, errorMessage?: string) => {
          error(
            `Failed to update ${entityName}`,
            errorMessage || `Could not update ${entityName.toLowerCase()}. Please try again.`
          );
        },
      },

      delete: {
        success: (entityName: string, count?: number) => {
          success(
            `${entityName} deleted${count && count > 1 ? ` (${count} items)` : ""}`,
            count && count > 1
              ? `${count} ${entityName.toLowerCase()}s have been deleted.`
              : `Your ${entityName.toLowerCase()} has been deleted.`
          );
        },
        error: (entityName: string, errorMessage?: string) => {
          error(
            `Failed to delete ${entityName}`,
            errorMessage || `Could not delete ${entityName.toLowerCase()}. Please try again.`
          );
        },
      },

      bulk: {
        success: (entityName: string, successCount: number, failCount?: number) => {
          if (failCount && failCount > 0) {
            warning(
              `Bulk ${entityName} update completed`,
              `${successCount} succeeded, ${failCount} failed. Check individual items for details.`
            );
          } else {
            success(
              `${successCount} ${entityName}${successCount > 1 ? "s" : ""} updated`,
              `All selected ${entityName.toLowerCase()}${successCount > 1 ? "s were" : " was"} successfully updated.`
            );
          }
        },
        delete: {
          success: (entityName: string, successCount: number, failCount?: number) => {
            if (failCount && failCount > 0) {
              warning(
                `Bulk delete completed`,
                `${successCount} ${entityName.toLowerCase()}${successCount > 1 ? "s" : ""} deleted, ${failCount} failed.`
              );
            } else {
              success(
                `${successCount} ${entityName}${successCount > 1 ? "s" : ""} deleted`,
                `All selected ${entityName.toLowerCase()}${successCount > 1 ? "s were" : " was"} successfully deleted.`
              );
            }
          },
          error: (entityName: string, errorMessage?: string) => {
            error(
              `Bulk delete failed`,
              errorMessage || `Could not delete ${entityName.toLowerCase()}. Please try again.`
            );
          },
        },
      },
    },

    // API operation convenience methods
    api: {
      success: (operation: string, details?: string) => {
        success(operation, details);
      },
      error: (operation: string, err?: Error | string) => {
        const errorMessage = err instanceof Error ? err.message : err;
        error(
          `${operation} failed`,
          errorMessage || "An unexpected error occurred. Please try again."
        );
      },
      network: (action: string) => {
        error(
          "Network error",
          `Could not ${action}. Please check your connection and try again.`
        );
      },
    },

    // Form validation methods
    form: {
      error: (fieldName: string, message?: string) => {
        error(
          `Invalid ${fieldName}`,
          message || `Please check your ${fieldName.toLowerCase()} and try again.`
        );
      },
      success: (formName: string) => {
        success(
          `${formName} saved`,
          `Your ${formName.toLowerCase()} has been saved successfully.`
        );
      },
    },
  };
}
