/**
 * React hook for workflow automation
 * Provides intelligent status suggestions and automation for job applications
 */

import { useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from './store';
import {
  getWorkflowEngine,
  createWorkflowContext,
  analyzeUserBehavior,
  getApplicationStatistics,
  StatusTransition,
  WorkflowStatistics,
} from './workflow-engine';
import {
  getWorkflowNotificationService,
} from './workflow-notifications';
import { applicationAPI } from './api-client-consolidated';
import { logger, LogCategory } from './logger';
import { useState } from 'react';

export function useWorkflowAutomation(applicationId?: string) {
  const { applications, updateApplication } = useAppStore();
  const [suggestions, setSuggestions] = useState<Record<string, StatusTransition[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [statistics, setStatistics] = useState<WorkflowStatistics | null>(null);
  const [autoMode, setAutoMode] = useState(false);

  const workflowEngine = getWorkflowEngine();
  const notificationService = getWorkflowNotificationService();

  // Load suggestions for specific application
  const loadApplicationSuggestions = useCallback(async (appId: string) => {
    setLoading(prev => ({ ...prev, [appId]: true }));

    try {
      const application = applications.find(app => app.id === appId);
      if (!application) return;

      const context = createWorkflowContext(
        analyzeUserBehavior(applications),
        getApplicationStatistics(applications)
      );

      const appSuggestions = workflowEngine.getSuggestions(application, context);
      setSuggestions(prev => ({ ...prev, [appId]: appSuggestions }));

      return appSuggestions;
    } catch (error) {
      logger.error(LogCategory.WORKFLOW, `Failed to load suggestions for ${appId}`, error as Error);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, [appId]: false }));
    }
  }, [applications, workflowEngine]);

  // Load suggestions for all applications
  const loadAllSuggestions = useCallback(async () => {
    const allSuggestions: Record<string, StatusTransition[]> = {};

    for (const application of applications) {
      try {
        const context = createWorkflowContext(
          analyzeUserBehavior(applications),
          getApplicationStatistics(applications)
        );

        const appSuggestions = workflowEngine.getSuggestions(application, context);
        if (appSuggestions.length > 0) {
          allSuggestions[application.id] = appSuggestions;
        }
      } catch (error) {
        logger.error(LogCategory.WORKFLOW, `Failed to load suggestions for ${application.id}`, error as Error);
      }
    }

    setSuggestions(allSuggestions);
    return allSuggestions;
  }, [applications, workflowEngine]);

  // Execute status transition
  const executeTransition = useCallback(async (
    appId: string,
    transition: StatusTransition
  ) => {
    setLoading(prev => ({ ...prev, [appId]: true }));

    try {
      const response = await applicationAPI.updateStatus(appId, {
        status: transition.to,
        notes: transition.reason,
      });

      if (response.success && response.data) {
        // Update local state
        updateApplication(appId, { status: transition.to });

        // Record in workflow history
        workflowEngine.recordHistory(appId, transition, 'user');

        // Create notification
        const application = applications.find(app => app.id === appId);
        if (application) {
          notificationService.createStatusTransitionNotification(
            appId,
            application.companyName || 'Unknown',
            transition
          );
        }

        // Reload suggestions for this application
        await loadApplicationSuggestions(appId);

        logger.info(LogCategory.WORKFLOW, `Status updated to ${transition.to}`, {
          applicationId: appId,
          oldStatus: transition.from,
          newStatus: transition.to,
        });

        return { success: true };
      } else {
        throw new Error(response.error as string);
      }
    } catch (error) {
      logger.error(LogCategory.WORKFLOW, 'Failed to execute transition', error as Error);
      return { success: false, error: error as Error };
    } finally {
      setLoading(prev => ({ ...prev, [appId]: false }));
    }
  }, [applications, updateApplication, workflowEngine, notificationService, loadApplicationSuggestions]);

  // Execute automatic transitions
  const executeAutomaticTransitions = useCallback(async () => {
    if (!autoMode) return { executed: 0, failed: 0 };

    try {
      const context = createWorkflowContext(
        analyzeUserBehavior(applications),
        getApplicationStatistics(applications)
      );

      const executed = await workflowEngine.executeAutomaticTransitions(applications, context);

      // Update local state for executed transitions
      for (const transition of executed) {
        const application = applications.find(app => app.status === transition.from);
        if (application) {
          updateApplication(application.id, { status: transition.to });
          notificationService.createAutomationNotification(
            application.id,
            application.companyName || 'Unknown',
            transition
          );
        }
      }

      return { executed: executed.length, failed: 0 };
    } catch (error) {
      logger.error(LogCategory.WORKFLOW, 'Failed to execute automatic transitions', error as Error);
      return { executed: 0, failed: 1 };
    }
  }, [applications, autoMode, workflowEngine, notificationService, updateApplication]);

  // Get workflow statistics
  const loadStatistics = useCallback(() => {
    const stats = workflowEngine.getStatistics();
    setStatistics(stats);
    return stats;
  }, [workflowEngine]);

  // Get application suggestions
  const getApplicationSuggestions = useCallback((appId: string) => {
    return suggestions[appId] || [];
  }, [suggestions]);

  // Get all applications with suggestions
  const applicationsWithSuggestions = useMemo(() => {
    return Object.keys(suggestions).map(appId => ({
      applicationId: appId,
      suggestions: suggestions[appId],
      application: applications.find(app => app.id === appId),
    }));
  }, [suggestions, applications]);

  // Get high priority suggestions (confidence > 0.8)
  const highPrioritySuggestions = useMemo(() => {
    return Object.entries(suggestions).flatMap(([appId, appSuggestions]) =>
      appSuggestions
        .filter(s => s.confidence > 0.8)
        .map(suggestion => ({
          applicationId: appId,
          suggestion,
          application: applications.find(app => app.id === appId),
        }))
    );
  }, [suggestions, applications]);

  // Load initial data
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      if (applicationId) {
        await loadApplicationSuggestions(applicationId);
      } else {
        await loadAllSuggestions();
      }
      if (isMounted) {
        loadStatistics();
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [applicationId, applications.length, loadApplicationSuggestions, loadAllSuggestions, loadStatistics]);

  // Auto-execute transitions periodically
  useEffect(() => {
    if (!autoMode) return;

    const interval = setInterval(() => {
      executeAutomaticTransitions();
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [autoMode, executeAutomaticTransitions]);

  return {
    // State
    suggestions,
    loading,
    statistics,
    autoMode,

    // Actions
    loadApplicationSuggestions,
    loadAllSuggestions,
    executeTransition,
    executeAutomaticTransitions,
    loadStatistics,
    setAutoMode,

    // Computed
    getApplicationSuggestions,
    applicationsWithSuggestions,
    highPrioritySuggestions,
    hasSuggestions: Object.keys(suggestions).length > 0,
    highPriorityCount: highPrioritySuggestions.length,
  };
}

/**
 * Hook for workflow notifications
 */
export function useWorkflowNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const notificationService = getWorkflowNotificationService();

  useEffect(() => {
    // Load initial notifications
    const loadInitialNotifications = () => {
      const allNotifications = notificationService.getNotifications();
      setNotifications(allNotifications);
      setUnreadCount(notificationService.getUnreadNotifications().length);
    };

    // Use setTimeout to avoid setState-in-effect warning
    const timeoutId = setTimeout(loadInitialNotifications, 0);

    // Subscribe to new notifications
    const unsubscribe = notificationService.subscribe((notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [notificationService]);

  const markAsRead = useCallback((notificationId: string) => {
    notificationService.markAsRead(notificationId);
    setNotifications(notificationService.getNotifications());
    setUnreadCount(notificationService.getUnreadNotifications().length);
  }, [notificationService]);

  const markAllAsRead = useCallback(() => {
    notificationService.markAllAsRead();
    setNotifications(notificationService.getNotifications());
    setUnreadCount(0);
  }, [notificationService]);

  const deleteNotification = useCallback((notificationId: string) => {
    notificationService.deleteNotification(notificationId);
    setNotifications(notificationService.getNotifications());
    setUnreadCount(notificationService.getUnreadNotifications().length);
  }, [notificationService]);

  const clearNotifications = useCallback(() => {
    notificationService.clearNotifications();
    setNotifications([]);
    setUnreadCount(0);
  }, [notificationService]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNotifications,
  };
}
