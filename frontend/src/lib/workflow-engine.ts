/**
 * Workflow Automation Engine
 * Provides intelligent status transition suggestions, automation rules, and tracking
 */

import { JobApplication } from './store';

export type ApplicationStatus = 'draft' | 'applied' | 'interview' | 'offer' | 'rejected' | 'optimized' | 'pending';

export interface StatusTransition {
  from: ApplicationStatus;
  to: ApplicationStatus;
  reason: string;
  confidence: number;
  autoExecute: boolean;
}

export interface StatusHistoryEntry {
  id: string;
  applicationId: string;
  oldStatus: ApplicationStatus | null;
  newStatus: ApplicationStatus;
  notes?: string;
  changedAt: Date;
  changedBy: 'user' | 'system' | 'automation';
  trigger?: string;
}

export interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  condition: (application: JobApplication, context: WorkflowContext) => boolean;
  action: (application: JobApplication) => StatusTransition | null;
  priority: number;
  enabled: boolean;
}

export interface WorkflowContext {
  currentTime: Date;
  userBehavior?: {
    lastLoginDate?: Date;
    applicationFrequency?: number; // applications per week
    averageMatchScore?: number;
    preferredStatuses?: ApplicationStatus[];
  };
  applicationStats?: {
    totalApplications: number;
    activeApplications: number;
    interviewRate: number;
    offerRate: number;
    averageMatchScore: number;
  };
}

export interface NotificationConfig {
  enabled: boolean;
  email: boolean;
  inApp: boolean;
  timing: 'immediate' | 'daily' | 'weekly';
}

export interface WorkflowStatistics {
  totalTransitions: number;
  automatedTransitions: number;
  manualTransitions: number;
  averageTransitionTime: number; // in hours
  statusDistribution: Record<ApplicationStatus, number>;
  mostCommonTransitions: Array<{
    from: ApplicationStatus;
    to: ApplicationStatus;
    count: number;
  }>;
  // New analytics fields
  conversionRates: Record<string, number>;
  averageTimeInStatus: Record<ApplicationStatus, number>;
  dropoffPoints: Array<{
    from: ApplicationStatus;
    dropoffCount: number;
    dropoffRate: number;
  }>;
  successMetrics: {
    interviewRate: number;
    offerRate: number;
    averageMatchToOffer: number;
    optimalApplicationCount: number;
  };
}

/**
 * Workflow Engine Class
 */
export class WorkflowEngine {
  private rules: WorkflowRule[] = [];
  private history: Map<string, StatusHistoryEntry[]> = new Map();
  private statistics: WorkflowStatistics = this.initializeStatistics();
  private notificationConfig: NotificationConfig = {
    enabled: true,
    email: true,
    inApp: true,
    timing: 'immediate',
  };

  constructor() {
    this.initializeDefaultRules();
    this.loadHistory();
  }

  /**
   * Initialize default workflow rules
   */
  private initializeDefaultRules(): void {
    // Rule 1: Auto-move from draft to applied after 1 hour if match score > 70
    this.addRule({
      id: 'auto-apply-high-match',
      name: 'Auto-apply High Match',
      description: 'Suggest moving to applied status for high match scores after review',
      priority: 1,
      enabled: true,
      condition: (app, ctx) => {
        const hoursSinceCreation = (ctx.currentTime.getTime() - new Date(app.createdAt).getTime()) / (1000 * 60 * 60);
        const hasGoodMatchScore = (app.matchScore || 0) > 70;
        const userHasHighAverage = ctx.userBehavior?.averageMatchScore && ctx.userBehavior.averageMatchScore > 60;

        return app.status === 'draft' &&
               hasGoodMatchScore &&
               hoursSinceCreation > 1 &&
               (!userHasHighAverage || hoursSinceCreation > 24); // For users with high averages, wait 24 hours
      },
      action: (app) => {
        const matchScore = app.matchScore || 0;
        let confidence = 0.85;
        let reason = 'Good match score detected. Ready to apply?';

        if (matchScore > 85) {
          confidence = 0.95;
          reason = 'Excellent match! This position fits your profile perfectly. Apply now!';
        } else if (matchScore > 80) {
          confidence = 0.9;
          reason = 'Great match score! Your skills align well with this role.';
        }

        return {
          from: app.status,
          to: 'applied',
          reason,
          confidence,
          autoExecute: false,
        };
      },
    });

    // Rule 2: Suggest optimization for low match scores
    this.addRule({
      id: 'suggest-optimization',
      name: 'Suggest Resume Optimization',
      description: 'Suggest resume optimization for low match scores',
      priority: 2,
      enabled: true,
      condition: (app, ctx) => {
        const matchScore = app.matchScore || 0;
        const hasLowScore = matchScore < 50 && matchScore > 0;
        const recentlyCreated = (ctx.currentTime.getTime() - new Date(app.createdAt).getTime()) / (1000 * 60 * 60) < 48;

        return app.status === 'draft' && hasLowScore && recentlyCreated;
      },
      action: (app) => {
        const matchScore = app.matchScore || 0;
        let confidence = 0.8;
        let reason = `Match score is ${matchScore}%. Consider optimizing your resume first.`;

        if (matchScore < 30) {
          confidence = 0.9;
          reason = 'Low match score detected. Strongly recommend optimizing your resume before applying.';
        }

        return {
          from: app.status,
          to: 'optimized',
          reason,
          confidence,
          autoExecute: false,
        };
      },
    });

    // Rule 3: High match score interview prediction
    this.addRule({
      id: 'high-match-interview',
      name: 'High Match Interview',
      description: 'High probability of interview with excellent match score',
      priority: 3,
      enabled: true,
      condition: (app, ctx) => {
        const daysSinceApplied = (ctx.currentTime.getTime() - new Date(app.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        const hasExcellentMatch = (app.matchScore || 0) > 80;
        const reasonableTimePassed = daysSinceApplied > 3;
        const notTooLong = daysSinceApplied < 14;

        return app.status === 'applied' && hasExcellentMatch && reasonableTimePassed && notTooLong;
      },
      action: (app) => {
        const daysSinceApplied = Math.floor((Date.now() - new Date(app.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        const matchScore = app.matchScore || 0;
        let confidence = 0.7 + (matchScore - 80) * 0.015; // 0.7-0.85 based on score
        let reason = `Applied ${daysSinceApplied} days ago with ${matchScore}% match. Have you heard back?`;

        if (matchScore > 90) {
          confidence = 0.85;
          reason = `Outstanding match! ${daysSinceApplied} days since application. Expected interview response soon.`;
        }

        return {
          from: app.status,
          to: 'interview',
          reason,
          confidence: Math.min(confidence, 0.9),
          autoExecute: false,
        };
      },
    });

    // Rule 4: Follow up on old applications
    this.addRule({
      id: 'follow-up-old-applications',
      name: 'Follow Up Old Applications',
      description: 'Suggest following up on applications older than 2 weeks',
      priority: 4,
      enabled: true,
      condition: (app, ctx) => {
        const daysSinceApplied = (ctx.currentTime.getTime() - new Date(app.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        const weeksSinceApplied = Math.floor(daysSinceApplied / 7);
        const hasGoodMatch = (app.matchScore || 0) > 60;

        return app.status === 'applied' &&
               weeksSinceApplied >= 2 &&
               weeksSinceApplied < 6 &&
               hasGoodMatch;
      },
      action: (app) => {
        const weeksSinceApplied = Math.floor((Date.now() - new Date(app.updatedAt).getTime()) / (1000 * 60 * 60 * 24 * 7));
        const matchScore = app.matchScore || 0;
        let confidence = 0.65;
        let reason = `Application pending for ${weeksSinceApplied} weeks. Consider following up.`;

        if (weeksSinceApplied >= 3 && matchScore > 75) {
          confidence = 0.8;
          reason = `Strong application pending for ${weeksSinceApplied} weeks. Time to follow up!`;
        }

        return {
          from: app.status,
          to: 'pending',
          reason,
          confidence,
          autoExecute: false,
        };
      },
    });

    // Rule 5: Celebrate offers with analytics
    this.addRule({
      id: 'celebrate-offer',
      name: 'Celebrate Offer',
      description: 'Special notification for received offers',
      priority: 5,
      enabled: true,
      condition: (app, ctx) => {
        return app.status === 'offer' && (app.matchScore ?? 0) > 0;
      },
      action: (app) => {
        const matchScore = app.matchScore || 0;
        const daysToOffer = Math.floor((Date.now() - new Date(app.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        let reason = `🎉 Congratulations! You received an offer!`;

        if (daysToOffer < 14) {
          reason += ` Quick process - only ${daysToOffer} days from application to offer.`;
        }

        if (matchScore > 80) {
          reason += ` High match score (${matchScore}%) proved to be accurate!`;
        }

        return {
          from: app.status,
          to: 'offer',
          reason,
          confidence: 1.0,
          autoExecute: false,
        };
      },
    });

    // Rule 6: Analyze rejections for patterns
    this.addRule({
      id: 'analyze-rejection',
      name: 'Analyze Rejection',
      description: 'Provide insights on rejection patterns',
      priority: 6,
      enabled: true,
      condition: (app, ctx) => {
        return app.status === 'rejected' && (app.matchScore ?? 0) > 0;
      },
      action: (app) => {
        const matchScore = app.matchScore || 0;
        let confidence = 0.7;
        let reason = 'Application rejected. Consider analyzing feedback and improving match score.';

        if (matchScore < 50) {
          confidence = 0.85;
          reason = `Low match score (${matchScore}%) may have contributed to rejection. Focus on skill alignment.`;
        } else if (matchScore > 70) {
          confidence = 0.75;
          reason = `Despite good match score (${matchScore}%), application was rejected. Other factors may be involved.`;
        }

        return {
          from: app.status,
          to: 'rejected',
          reason,
          confidence,
          autoExecute: false,
        };
      },
    });

    // Rule 7: Medium match score strategic application
    this.addRule({
      id: 'medium-match-strategy',
      name: 'Medium Match Strategy',
      description: 'Provide strategic advice for medium match scores',
      priority: 7,
      enabled: true,
      condition: (app, ctx) => {
        const matchScore = app.matchScore || 0;
        const isMediumMatch = matchScore >= 50 && matchScore <= 70;
        const recentlyCreated = (ctx.currentTime.getTime() - new Date(app.createdAt).getTime()) / (1000 * 60 * 60) < 72;

        return app.status === 'draft' && isMediumMatch && recentlyCreated;
      },
      action: (app) => {
        const matchScore = app.matchScore || 0;
        let confidence = 0.7;
        let reason = `Medium match score (${matchScore}%). Consider customizing your resume for this role.`;

        if (matchScore >= 65) {
          confidence = 0.75;
          reason = `Good potential match (${matchScore}%). A little customization could make this a strong application.`;
        }

        return {
          from: app.status,
          to: 'optimized',
          reason,
          confidence,
          autoExecute: false,
        };
      },
    });

    // Rule 8: Interview preparation reminder
    this.addRule({
      id: 'interview-prep-reminder',
      name: 'Interview Preparation',
      description: 'Remind to prepare for upcoming interviews',
      priority: 8,
      enabled: true,
      condition: (app, ctx) => {
        const daysSinceUpdate = (ctx.currentTime.getTime() - new Date(app.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        const recentlyScheduled = daysSinceUpdate < 7;

        return app.status === 'interview' && recentlyScheduled;
      },
      action: (app) => {
        const daysSinceUpdate = Math.floor((Date.now() - new Date(app.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        let reason = `Interview scheduled! Don't forget to prepare.`;

        if (daysSinceUpdate < 2) {
          reason = `Interview scheduled recently! Start preparing by researching the company and practicing common questions.`;
        }

        return {
          from: app.status,
          to: 'interview',
          reason,
          confidence: 0.85,
          autoExecute: false,
        };
      },
    });

    // Rule 9: Stale application detection
    this.addRule({
      id: 'stale-application',
      name: 'Stale Application',
      description: 'Detect and flag applications that have not been updated',
      priority: 9,
      enabled: true,
      condition: (app, ctx) => {
        const daysSinceUpdate = (ctx.currentTime.getTime() - new Date(app.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        const isStale = daysSinceUpdate > 30;
        const notFinalStatus = !['offer', 'rejected'].includes(app.status);

        return isStale && notFinalStatus;
      },
      action: (app) => {
        const daysSinceUpdate = Math.floor((Date.now() - new Date(app.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        let confidence = 0.6;
        let reason = `Application not updated for ${daysSinceUpdate} days. Consider following up or closing.`;

        if (daysSinceUpdate > 60) {
          confidence = 0.75;
          reason = `Very old application (${daysSinceUpdate} days). Recommended to follow up or mark as closed.`;
        }

        return {
          from: app.status,
          to: 'pending',
          reason,
          confidence,
          autoExecute: false,
        };
      },
    });
  }

  /**
   * Add a custom workflow rule
   */
  addRule(rule: WorkflowRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Remove a workflow rule
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }

  /**
   * Enable/disable a rule
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Get all rules
   */
  getRules(): WorkflowRule[] {
    return [...this.rules];
  }

  /**
   * Get status transition suggestions for an application
   */
  getSuggestions(
    application: JobApplication,
    context: WorkflowContext
  ): StatusTransition[] {
    const suggestions: StatusTransition[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      try {
        if (rule.condition(application, context)) {
          const transition = rule.action(application);
          if (transition) {
            suggestions.push(transition);
          }
        }
      } catch (error) {
        console.error(`Error executing rule ${rule.id}:`, error);
      }
    }

    // Sort by confidence and return top suggestions
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3); // Return top 3 suggestions
  }

  /**
   * Execute automatic status transitions
   */
  async executeAutomaticTransitions(
    applications: JobApplication[],
    context: WorkflowContext
  ): Promise<StatusTransition[]> {
    const executedTransitions: StatusTransition[] = [];

    for (const application of applications) {
      const suggestions = this.getSuggestions(application, context);

      for (const suggestion of suggestions) {
        if (suggestion.autoExecute) {
          // In a real implementation, this would call the API
          executedTransitions.push(suggestion);
          this.recordHistory(application.id, suggestion, 'automation');
        }
      }
    }

    return executedTransitions;
  }

  /**
   * Record status change in history
   */
  recordHistory(
    applicationId: string,
    transition: StatusTransition,
    changedBy: 'user' | 'system' | 'automation',
    notes?: string
  ): void {
    const entry: StatusHistoryEntry = {
      id: `${applicationId}-${Date.now()}`,
      applicationId,
      oldStatus: transition.from,
      newStatus: transition.to,
      notes: notes || transition.reason,
      changedAt: new Date(),
      changedBy,
      trigger: transition.reason,
    };

    const appHistory = this.history.get(applicationId) || [];
    appHistory.push(entry);
    this.history.set(applicationId, appHistory);

    // Update statistics
    this.updateStatistics(transition, changedBy);

    // Save to localStorage for persistence
    this.saveHistory();
  }

  /**
   * Get history for an application
   */
  getHistory(applicationId: string): StatusHistoryEntry[] {
    return this.history.get(applicationId) || [];
  }

  /**
   * Get all history
   */
  getAllHistory(): Map<string, StatusHistoryEntry[]> {
    return new Map(this.history);
  }

  /**
   * Clear history for an application
   */
  clearHistory(applicationId: string): void {
    this.history.delete(applicationId);
    this.saveHistory();
  }

  /**
   * Get workflow statistics
   */
  getStatistics(): WorkflowStatistics {
    return { ...this.statistics };
  }

  /**
   * Update notification configuration
   */
  updateNotificationConfig(config: Partial<NotificationConfig>): void {
    this.notificationConfig = { ...this.notificationConfig, ...config };
    this.saveNotificationConfig();
  }

  /**
   * Get notification configuration
   */
  getNotificationConfig(): NotificationConfig {
    return { ...this.notificationConfig };
  }

  /**
   * Initialize statistics
   */
  private initializeStatistics(): WorkflowStatistics {
    return {
      totalTransitions: 0,
      automatedTransitions: 0,
      manualTransitions: 0,
      averageTransitionTime: 0,
      statusDistribution: {
        draft: 0,
        applied: 0,
        interview: 0,
        offer: 0,
        rejected: 0,
        optimized: 0,
        pending: 0,
      },
      mostCommonTransitions: [],
      conversionRates: {},
      averageTimeInStatus: {
        draft: 0,
        applied: 0,
        interview: 0,
        offer: 0,
        rejected: 0,
        optimized: 0,
        pending: 0,
      },
      dropoffPoints: [],
      successMetrics: {
        interviewRate: 0,
        offerRate: 0,
        averageMatchToOffer: 0,
        optimalApplicationCount: 0,
      },
    };
  }

  /**
   * Update statistics based on transition
   */
  private updateStatistics(
    transition: StatusTransition,
    changedBy: 'user' | 'system' | 'automation'
  ): void {
    this.statistics.totalTransitions++;

    if (changedBy === 'automation') {
      this.statistics.automatedTransitions++;
    } else {
      this.statistics.manualTransitions++;
    }

    // Update status distribution
    this.statistics.statusDistribution[transition.to]++;

    // Update most common transitions
    const existingTransition = this.statistics.mostCommonTransitions.find(
      t => t.from === transition.from && t.to === transition.to
    );

    if (existingTransition) {
      existingTransition.count++;
    } else {
      this.statistics.mostCommonTransitions.push({
        from: transition.from,
        to: transition.to,
        count: 1,
      });
    }

    // Sort by count
    this.statistics.mostCommonTransitions.sort((a, b) => b.count - a.count);

    // Update advanced analytics
    this.updateConversionRates();
    this.updateDropoffAnalysis();
  }

  /**
   * Update conversion rates between statuses
   */
  private updateConversionRates(): void {
    const totalApps = Object.values(this.statistics.statusDistribution).reduce((sum, count) => sum + count, 0);

    if (totalApps === 0) return;

    // Calculate conversion rates for key transitions
    const appliedToInterview = this.getTransitionRate('applied', 'interview');
    const interviewToOffer = this.getTransitionRate('interview', 'offer');
    const appliedToOffer = this.getTransitionRate('applied', 'offer');

    this.statistics.conversionRates = {
      'applied_to_interview': appliedToInterview,
      'interview_to_offer': interviewToOffer,
      'applied_to_offer': appliedToOffer,
      'overall_success_rate': (this.statistics.statusDistribution.offer / totalApps) * 100,
    };
  }

  /**
   * Get transition rate between two statuses
   */
  private getTransitionRate(from: ApplicationStatus, to: ApplicationStatus): number {
    const transition = this.statistics.mostCommonTransitions.find(
      t => t.from === from && t.to === to
    );

    if (!transition) return 0;

    const fromCount = this.statistics.statusDistribution[from];
    return fromCount > 0 ? (transition.count / fromCount) * 100 : 0;
  }

  /**
   * Update dropoff analysis
   */
  private updateDropoffAnalysis(): void {
    const dropoffPoints: Array<{
      from: ApplicationStatus;
      dropoffCount: number;
      dropoffRate: number;
    }> = [];

    const statuses: ApplicationStatus[] = ['draft', 'applied', 'interview', 'pending', 'optimized'];

    for (const status of statuses) {
      const statusCount = this.statistics.statusDistribution[status];

      // Find transitions that lead to rejection
      const rejections = this.statistics.mostCommonTransitions.filter(
        t => t.from === status && t.to === 'rejected'
      );

      const dropoffCount = rejections.reduce((sum, t) => sum + t.count, 0);
      const dropoffRate = statusCount > 0 ? (dropoffCount / statusCount) * 100 : 0;

      if (dropoffCount > 0) {
        dropoffPoints.push({
          from: status,
          dropoffCount,
          dropoffRate,
        });
      }
    }

    this.statistics.dropoffPoints = dropoffPoints.sort((a, b) => b.dropoffRate - a.dropoffRate);
  }

  /**
   * Calculate advanced analytics from all history
   */
  calculateAdvancedAnalytics(applications: JobApplication[]): void {
    if (applications.length === 0) return;

    // Calculate success metrics
    const totalApplications = applications.length;
    const interviewCount = applications.filter(app => app.status === 'interview').length;
    const offerCount = applications.filter(app => app.status === 'offer').length;

    this.statistics.successMetrics = {
      interviewRate: totalApplications > 0 ? (interviewCount / totalApplications) * 100 : 0,
      offerRate: totalApplications > 0 ? (offerCount / totalApplications) * 100 : 0,
      averageMatchToOffer: this.calculateAverageMatchForOffers(applications),
      optimalApplicationCount: this.calculateOptimalApplicationCount(applications),
    };

    // Calculate average time in each status
    this.calculateAverageTimeInStatus();
  }

  /**
   * Calculate average match score for applications that received offers
   */
  private calculateAverageMatchForOffers(applications: JobApplication[]): number {
    const offerApps = applications.filter(app => app.status === 'offer' && app.matchScore);

    if (offerApps.length === 0) return 0;

    const totalMatchScore = offerApps.reduce((sum, app) => sum + (app.matchScore || 0), 0);
    return totalMatchScore / offerApps.length;
  }

  /**
   * Calculate optimal number of applications per week based on success rates
   */
  private calculateOptimalApplicationCount(applications: JobApplication[]): number {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentApplications = applications.filter(app => new Date(app.createdAt) >= oneWeekAgo);

    const recentInterviewCount = recentApplications.filter(app => app.status === 'interview').length;
    const recentOfferCount = recentApplications.filter(app => app.status === 'offer').length;

    // Calculate success rate
    const successRate = recentApplications.length > 0
      ? (recentInterviewCount + recentOfferCount) / recentApplications.length
      : 0;

    // Optimal is typically 5-10 applications per week, adjust based on success rate
    if (successRate > 0.3) return Math.max(5, recentApplications.length);
    if (successRate > 0.2) return Math.max(7, recentApplications.length + 2);
    return Math.max(10, recentApplications.length + 5);
  }

  /**
   * Calculate average time spent in each status
   */
  private calculateAverageTimeInStatus(): void {
    const allHistory = this.getAllHistory();
    const timeInStatus: Record<ApplicationStatus, number[]> = {
      draft: [],
      applied: [],
      interview: [],
      offer: [],
      rejected: [],
      optimized: [],
      pending: [],
    };

    // Calculate time spent in each status for each application
    for (const [applicationId, history] of allHistory) {
      for (let i = 0; i < history.length; i++) {
        const entry = history[i];
        const nextEntry = history[i + 1];

        if (nextEntry) {
          const timeSpent = (nextEntry.changedAt.getTime() - entry.changedAt.getTime()) / (1000 * 60 * 60); // hours
          timeInStatus[entry.newStatus].push(timeSpent);
        }
      }
    }

    // Calculate averages
    for (const status of Object.keys(timeInStatus) as ApplicationStatus[]) {
      const times = timeInStatus[status];
      if (times.length > 0) {
        this.statistics.averageTimeInStatus[status] = times.reduce((sum, time) => sum + time, 0) / times.length;
      }
    }
  }

  /**
   * Save history to localStorage
   */
  private saveHistory(): void {
    if (typeof window === 'undefined') return;

    try {
      const historyObject = Object.fromEntries(this.history);
      localStorage.setItem('workflow-history', JSON.stringify(historyObject));
    } catch (error) {
      console.error('Failed to save workflow history:', error);
    }
  }

  /**
   * Load history from localStorage
   */
  private loadHistory(): void {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem('workflow-history');
      if (saved) {
        const historyObject = JSON.parse(saved);
        this.history = new Map(
          Object.entries(historyObject).map(([key, value]) => [
            key,
            (value as StatusHistoryEntry[]).map(entry => ({
              ...entry,
              changedAt: new Date(entry.changedAt),
            })),
          ])
        );
      }
    } catch (error) {
      console.error('Failed to load workflow history:', error);
    }
  }

  /**
   * Save notification configuration to localStorage
   */
  private saveNotificationConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('notification-config', JSON.stringify(this.notificationConfig));
    } catch (error) {
      console.error('Failed to save notification config:', error);
    }
  }

  /**
   * Load notification configuration from localStorage
   */
  private loadNotificationConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem('notification-config');
      if (saved) {
        this.notificationConfig = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load notification config:', error);
    }
  }
}

// Singleton instance
let workflowEngineInstance: WorkflowEngine | null = null;

export function getWorkflowEngine(): WorkflowEngine {
  if (!workflowEngineInstance) {
    workflowEngineInstance = new WorkflowEngine();
  }
  return workflowEngineInstance;
}

/**
 * Helper function to create workflow context
 */
export function createWorkflowContext(
  userBehavior?: WorkflowContext['userBehavior'],
  applicationStats?: WorkflowContext['applicationStats']
): WorkflowContext {
  return {
    currentTime: new Date(),
    userBehavior,
    applicationStats,
  };
}

/**
 * Helper function to get user behavior insights
 */
export function analyzeUserBehavior(applications: JobApplication[]): WorkflowContext['userBehavior'] {
  if (applications.length === 0) return undefined;

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentApplications = applications.filter(app =>
    new Date(app.createdAt) >= oneWeekAgo
  );

  const applicationFrequency = recentApplications.length;

  const totalMatchScore = applications.reduce((sum, app) =>
    sum + (app.matchScore || 0), 0
  );
  const averageMatchScore = totalMatchScore / applications.length;

  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const preferredStatuses = Object.entries(statusCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([status]) => status as ApplicationStatus);

  return {
    applicationFrequency,
    averageMatchScore,
    preferredStatuses,
  };
}

/**
 * Helper function to get application statistics
 */
export function getApplicationStatistics(applications: JobApplication[]): WorkflowContext['applicationStats'] {
  if (applications.length === 0) return undefined;

  const totalApplications = applications.length;
  const activeApplications = applications.filter(app =>
    ['draft', 'applied', 'interview', 'pending'].includes(app.status)
  ).length;

  const interviewCount = applications.filter(app => app.status === 'interview').length;
  const offerCount = applications.filter(app => app.status === 'offer').length;

  const interviewRate = totalApplications > 0 ? (interviewCount / totalApplications) * 100 : 0;
  const offerRate = totalApplications > 0 ? (offerCount / totalApplications) * 100 : 0;

  const totalMatchScore = applications.reduce((sum, app) =>
    sum + (app.matchScore || 0), 0
  );
  const averageMatchScore = totalApplications > 0 ? totalMatchScore / totalApplications : 0;

  return {
    totalApplications,
    activeApplications,
    interviewRate,
    offerRate,
    averageMatchScore,
  };
}
