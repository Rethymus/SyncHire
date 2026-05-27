/**
 * Workflow Notification Service
 * Handles sending notifications for workflow events
 */

import { ApplicationStatus, StatusTransition } from './workflow-engine';

export interface NotificationMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  applicationId?: string;
  applicationName?: string;
  status?: ApplicationStatus;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export interface EmailNotificationData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

export class WorkflowNotificationService {
  private notifications: NotificationMessage[] = [];
  private listeners: Set<(notification: NotificationMessage) => void> = new Set();

  constructor() {
    this.loadNotifications();
  }

  /**
   * Subscribe to new notifications
   */
  subscribe(listener: (notification: NotificationMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notify(notification: NotificationMessage): void {
    this.listeners.forEach(listener => listener(notification));
  }

  /**
   * Add a notification
   */
  addNotification(notification: Omit<NotificationMessage, 'id' | 'timestamp' | 'read'>): NotificationMessage {
    const newNotification: NotificationMessage = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };

    this.notifications.unshift(newNotification);
    this.saveNotifications();
    this.notify(newNotification);

    return newNotification;
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveNotifications();
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.saveNotifications();
  }

  /**
   * Get all notifications
   */
  getNotifications(): NotificationMessage[] {
    return [...this.notifications];
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications(): NotificationMessage[] {
    return this.notifications.filter(n => !n.read);
  }

  /**
   * Clear all notifications
   */
  clearNotifications(): void {
    this.notifications = [];
    this.saveNotifications();
  }

  /**
   * Delete a notification
   */
  deleteNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotifications();
  }

  /**
   * Create notification for status transition
   */
  createStatusTransitionNotification(
    applicationId: string,
    applicationName: string,
    transition: StatusTransition,
    userEmail?: string
  ): NotificationMessage {
    const statusLabels: Record<ApplicationStatus, string> = {
      draft: '草稿',
      applied: '已申请',
      interview: '面试中',
      offer: '已录用',
      rejected: '已拒绝',
      optimized: '已优化',
      pending: '处理中',
    };

    let type: NotificationMessage['type'] = 'info';
    let title = '状态变更通知';
    let message = '';

    switch (transition.to) {
      case 'offer':
        type = 'success';
        title = '🎉 恭喜！您收到了录用通知！';
        message = `${applicationName} 已经向您发出录用通知。这是您努力的成果！`;
        break;
      case 'interview':
        type = 'success';
        title = '面试邀请';
        message = `${applicationName} 邀请您参加面试。请查看详情并准备面试。`;
        break;
      case 'rejected':
        type = 'error';
        title = '申请结果';
        message = `${applicationName} 很遗憾地通知您，您的申请未通过。`;
        break;
      case 'applied':
        type = 'info';
        title = '申请已提交';
        message = `${applicationName} 的申请已成功提交。`;
        break;
      case 'optimized':
        type = 'info';
        title = '简历优化完成';
        message = `${applicationName} 的简历优化已完成。`;
        break;
      default:
        message = `${applicationName} 的状态已从 "${statusLabels[transition.from]}" 变更为 "${statusLabels[transition.to]}"`;
    }

    const notification = this.addNotification({
      type,
      title,
      message,
      applicationId,
      applicationName,
      status: transition.to,
      actionUrl: `/applications/${applicationId}`,
      actionLabel: '查看详情',
    });

    // Send email if user email is provided
    if (userEmail) {
      this.sendStatusTransitionEmail(userEmail, applicationName, transition);
    }

    return notification;
  }

  /**
   * Create notification for workflow suggestion
   */
  createSuggestionNotification(
    applicationId: string,
    applicationName: string,
    transition: StatusTransition
  ): NotificationMessage {
    const notification = this.addNotification({
      type: 'info',
      title: '智能建议',
      message: `${applicationName}: ${transition.reason}`,
      applicationId,
      applicationName,
      status: transition.to,
      actionUrl: `/applications/${applicationId}`,
      actionLabel: '查看建议',
    });

    return notification;
  }

  /**
   * Create notification for workflow automation
   */
  createAutomationNotification(
    applicationId: string,
    applicationName: string,
    transition: StatusTransition
  ): NotificationMessage {
    const statusLabels: Record<ApplicationStatus, string> = {
      draft: '草稿',
      applied: '已申请',
      interview: '面试中',
      offer: '已录用',
      rejected: '已拒绝',
      optimized: '已优化',
      pending: '处理中',
    };

    const notification = this.addNotification({
      type: 'info',
      title: '自动化工作流',
      message: `${applicationName} 的状态已自动从 "${statusLabels[transition.from]}" 更新为 "${statusLabels[transition.to]}"`,
      applicationId,
      applicationName,
      status: transition.to,
      actionUrl: `/applications/${applicationId}`,
      actionLabel: '查看详情',
    });

    return notification;
  }

  /**
   * Create notification for weekly digest
   */
  createWeeklyDigestNotification(stats: {
    totalApplications: number;
    newApplications: number;
    interviews: number;
    offers: number;
    averageMatchScore: number;
  }): NotificationMessage {
    const message = `
本周求职进展：
• 新增申请：${stats.newApplications} 份
• 总申请数：${stats.totalApplications} 份
• 面试邀请：${stats.interviews} 个
• 录用通知：${stats.offers} 个
• 平均匹配度：${Math.round(stats.averageMatchScore)}%
    `.trim();

    const notification = this.addNotification({
      type: 'info',
      title: '本周求职进展摘要',
      message,
      actionUrl: '/analytics',
      actionLabel: '查看详细分析',
    });

    return notification;
  }

  /**
   * Create notification for high-priority workflow suggestions
   */
  createHighPrioritySuggestionNotification(
    applicationId: string,
    applicationName: string,
    suggestions: Array<{
      reason: string;
      confidence: number;
      urgency: 'high' | 'medium' | 'low';
    }>
  ): NotificationMessage {
    const highPrioritySuggestions = suggestions.filter(s => s.urgency === 'high');
    const message = highPrioritySuggestions.length > 0
      ? `${applicationName}: ${highPrioritySuggestions.length} 个高优先级建议需要关注`
      : `${applicationName}: 有新的工作流建议`;

    const notification = this.addNotification({
      type: 'warning',
      title: '🔔 高优先级建议',
      message,
      applicationId,
      applicationName,
      actionUrl: `/applications/${applicationId}`,
      actionLabel: '查看建议',
    });

    return notification;
  }

  /**
   * Create notification for application milestones
   */
  createMilestoneNotification(
    applicationId: string,
    applicationName: string,
    milestone: 'first_application' | 'first_interview' | 'first_offer' | 'streak',
    details?: {
      streak?: number;
      total?: number;
    }
  ): NotificationMessage {
    let title = '求职里程碑';
    let message = '';
    let type: NotificationMessage['type'] = 'success';

    switch (milestone) {
      case 'first_application':
        title = '🎯 第一个申请';
        message = `恭喜！您提交了第一个职位申请 ${applicationName}。这是求职之旅的第一步！`;
        break;
      case 'first_interview':
        title = '🎉 第一个面试';
        message = `太棒了！您收到了 ${applicationName} 的面试邀请。继续加油！`;
        break;
      case 'first_offer':
        title = '🏆 第一个录用';
        message = `恭喜！您收到了 ${applicationName} 的录用通知。这是您努力的成果！`;
        type = 'success';
        break;
      case 'streak':
        title = '📈 申请连续记录';
        message = `连续 ${details?.streak} 周保持活跃申请，总计 ${details?.total} 份申请。保持这个势头！`;
        break;
    }

    const notification = this.addNotification({
      type,
      title,
      message,
      applicationId,
      applicationName,
      actionUrl: `/applications/${applicationId}`,
      actionLabel: '查看详情',
    });

    return notification;
  }

  /**
   * Create notification for workflow insights
   */
  createInsightNotification(
    insightType: 'improvement' | 'achievement' | 'reminder',
    data: {
      title: string;
      message: string;
      actionable?: boolean;
      actionUrl?: string;
    }
  ): NotificationMessage {
    let type: NotificationMessage['type'] = 'info';

    switch (insightType) {
      case 'improvement':
        type = 'warning';
        break;
      case 'achievement':
        type = 'success';
        break;
      case 'reminder':
        type = 'info';
        break;
    }

    const notification = this.addNotification({
      type,
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl,
      actionLabel: data.actionable ? '查看详情' : undefined,
    });

    return notification;
  }

  /**
   * Create batch notification for multiple applications
   */
  createBatchNotification(
    applications: Array<{
      id: string;
      name: string;
      status: string;
    }>,
    batchType: 'status_update' | 'reminder' | 'deadline'
  ): NotificationMessage {
    let title = '批量通知';
    let message = '';
    let type: NotificationMessage['type'] = 'info';

    switch (batchType) {
      case 'status_update':
        title = '批量状态更新';
        message = `${applications.length} 个申请的状态已更新`;
        type = 'info';
        break;
      case 'reminder':
        title = '批量提醒';
        message = `${applications.length} 个申请需要关注`;
        type = 'warning';
        break;
      case 'deadline':
        title = '截止日期提醒';
        message = `${applications.length} 个申请即将到达截止日期`;
        type = 'error';
        break;
    }

    const notification = this.addNotification({
      type,
      title,
      message,
      actionUrl: '/applications',
      actionLabel: '查看全部',
    });

    return notification;
  }

  /**
   * Get notifications by type
   */
  getNotificationsByType(type: NotificationMessage['type']): NotificationMessage[] {
    return this.notifications.filter(n => n.type === type);
  }

  /**
   * Get notifications by application
   */
  getNotificationsByApplication(applicationId: string): NotificationMessage[] {
    return this.notifications.filter(n => n.applicationId === applicationId);
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(): {
    total: number;
    unread: number;
    byType: Record<NotificationMessage['type'], number>;
    oldest: Date | null;
    newest: Date | null;
  } {
    const byType: Record<NotificationMessage['type'], number> = {
      info: 0,
      success: 0,
      warning: 0,
      error: 0,
    };

    let oldest: Date | null = null;
    let newest: Date | null = null;

    for (const notification of this.notifications) {
      byType[notification.type]++;

      if (!oldest || notification.timestamp < oldest) {
        oldest = notification.timestamp;
      }
      if (!newest || notification.timestamp > newest) {
        newest = notification.timestamp;
      }
    }

    return {
      total: this.notifications.length,
      unread: this.getUnreadNotifications().length,
      byType,
      oldest,
      newest,
    };
  }

  /**
   * Clean old notifications (older than specified days)
   */
  cleanOldNotifications(daysToKeep: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const beforeCount = this.notifications.length;
    this.notifications = this.notifications.filter(n => n.timestamp >= cutoffDate);
    const cleanedCount = beforeCount - this.notifications.length;

    if (cleanedCount > 0) {
      this.saveNotifications();
    }

    return cleanedCount;
  }

  /**
   * Send email notification for status transition
   */
  private async sendStatusTransitionEmail(
    email: string,
    applicationName: string,
    transition: StatusTransition
  ): Promise<void> {
    const statusLabels: Record<ApplicationStatus, string> = {
      draft: '草稿',
      applied: '已申请',
      interview: '面试中',
      offer: '已录用',
      rejected: '已拒绝',
      optimized: '已优化',
      pending: '处理中',
    };

    const emailData: EmailNotificationData = {
      to: email,
      subject: `[SyncHire] ${applicationName} 状态更新`,
      template: 'status-transition',
      data: {
        applicationName,
        oldStatus: statusLabels[transition.from],
        newStatus: statusLabels[transition.to],
        reason: transition.reason,
        timestamp: new Date().toISOString(),
      },
    };

    try {
      // In a real implementation, this would call your email API
      const response = await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        console.error('Failed to send email notification:', await response.text());
      }
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  /**
   * Save notifications to localStorage
   */
  private saveNotifications(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('workflow-notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }

  /**
   * Load notifications from localStorage
   */
  private loadNotifications(): void {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem('workflow-notifications');
      if (saved) {
        this.notifications = JSON.parse(saved).map((n: NotificationMessage) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }
}

// Singleton instance
let notificationServiceInstance: WorkflowNotificationService | null = null;

export function getWorkflowNotificationService(): WorkflowNotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new WorkflowNotificationService();
  }
  return notificationServiceInstance;
}

/**
 * React hook for using workflow notifications
 */
export function useWorkflowNotifications() {
  const [notifications, setNotifications] = React.useState<NotificationMessage[]>([]);
  const service = getWorkflowNotificationService();

  React.useEffect(() => {
    // Load initial notifications
    const loadInitialNotifications = () => {
      setNotifications(service.getNotifications());
    };

    // Use setTimeout to avoid setState-in-effect warning
    const timeoutId = setTimeout(loadInitialNotifications, 0);

    // Subscribe to new notifications
    const unsubscribe = service.subscribe((notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [service]);

  return {
    notifications,
    unreadCount: service.getUnreadNotifications().length,
    markAsRead: (id: string) => service.markAsRead(id),
    markAllAsRead: () => service.markAllAsRead(),
    deleteNotification: (id: string) => {
      service.deleteNotification(id);
      setNotifications(service.getNotifications());
    },
    clearNotifications: () => {
      service.clearNotifications();
      setNotifications([]);
    },
  };
}

// Import React for the hook
import React from 'react';
