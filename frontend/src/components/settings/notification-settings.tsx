"use client";

/**
 * Notification Settings Component
 *
 * Allows users to manage their email notification preferences
 */

import { useState, useEffect, useId } from "react";
import { useLiteCopy } from "@/lib/lite-i18n";

interface NotificationPreferences {
  email_enabled: boolean;
  application_status_updates: boolean;
  interview_reminders: boolean;
  weekly_digest: boolean;
  job_recommendations: boolean;
  profile_views: boolean;
  notification_frequency: "immediate" | "daily" | "weekly" | "never";
}

interface NotificationStatus {
  email_enabled: boolean;
  email_unsubscribed: boolean;
  email_bounced: boolean;
  notification_frequency: string;
  application_status_updates: boolean;
  interview_reminders: boolean;
  weekly_digest: boolean;
  job_recommendations: boolean;
  profile_views: boolean;
  email_address: string;
}

const LOCAL_NOTIFICATION_PREFERENCES_KEY = "synchire-notification-preferences";

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email_enabled: true,
  application_status_updates: true,
  interview_reminders: true,
  weekly_digest: false,
  job_recommendations: true,
  profile_views: true,
  notification_frequency: "immediate",
};

const COPY = {
  "en-US": {
    title: "Notification Settings",
    subtitle: "Manage how and when you receive local job-search notifications",
    emailNotifications: "Email Notifications",
    emailDescription: "Enable or disable all email notifications",
    notificationTypes: "Notification Types",
    applicationStatus: "Application Status Updates",
    applicationStatusDescription: "Get notified when your application status changes",
    interviewReminders: "Interview Reminders",
    interviewRemindersDescription: "Receive reminders before your scheduled interviews",
    weeklyDigest: "Weekly Digest",
    weeklyDigestDescription: "Receive a weekly summary of your job search activity",
    jobRecommendations: "Job Recommendations",
    jobRecommendationsDescription: "Get notified about new job matches based on your profile",
    profileViews: "Profile Views",
    profileViewsDescription: "Get notified when recruiters view your profile",
    frequency: "Notification Frequency",
    frequencyDescription: "Choose how often you want to receive email notifications",
    immediate: "Immediate (as they happen)",
    daily: "Daily digest",
    weekly: "Weekly digest",
    never: "Never",
    unsubscribe: "Unsubscribe from all emails",
    saving: "Saving...",
    save: "Save Changes",
    testTitle: "Test Notifications",
    testDescription: "Record test notifications locally to verify your settings.",
    testStatus: "Test Status Update",
    testInterview: "Test Interview Reminder",
    testWeekly: "Test Weekly Digest",
    saved: "Notification preferences updated successfully",
    saveFailed: "Failed to update notification preferences",
    confirmUnsubscribe: "Are you sure you want to unsubscribe from all email notifications?",
    unsubscribed: "You have been unsubscribed from all email notifications",
    unsubscribeFailed: "Failed to unsubscribe",
    resubscribed: "You have been resubscribed to email notifications",
    resubscribeFailed: "Failed to resubscribe",
    currentUnsubscribed: "You are currently unsubscribed from all email notifications.",
    resubscribeCta: "Click here to resubscribe",
    bounced: "Previous emails have bounced. Please update your email address or contact support.",
    testRecorded: "Test notification recorded locally",
    testFailed: "Failed to send test notification",
  },
  "zh-CN": {
    title: "通知设置",
    subtitle: "管理本地求职提醒的接收方式和频率",
    emailNotifications: "邮件通知",
    emailDescription: "启用或关闭所有邮件通知",
    notificationTypes: "通知类型",
    applicationStatus: "申请状态更新",
    applicationStatusDescription: "当申请状态变化时提醒你",
    interviewReminders: "面试提醒",
    interviewRemindersDescription: "在已安排的面试前提醒你",
    weeklyDigest: "每周摘要",
    weeklyDigestDescription: "每周汇总你的求职活动",
    jobRecommendations: "岗位推荐",
    jobRecommendationsDescription: "根据角色卡提醒新的岗位匹配",
    profileViews: "资料浏览",
    profileViewsDescription: "当招聘方查看你的资料时提醒你",
    frequency: "通知频率",
    frequencyDescription: "选择接收邮件通知的频率",
    immediate: "立即通知",
    daily: "每日摘要",
    weekly: "每周摘要",
    never: "从不",
    unsubscribe: "取消订阅所有邮件",
    saving: "保存中...",
    save: "保存更改",
    testTitle: "测试通知",
    testDescription: "在本地记录测试通知，用于验证当前设置。",
    testStatus: "测试状态更新",
    testInterview: "测试面试提醒",
    testWeekly: "测试每周摘要",
    saved: "通知偏好已更新",
    saveFailed: "更新通知偏好失败",
    confirmUnsubscribe: "确定要取消订阅所有邮件通知吗？",
    unsubscribed: "已取消订阅所有邮件通知",
    unsubscribeFailed: "取消订阅失败",
    resubscribed: "已重新订阅邮件通知",
    resubscribeFailed: "重新订阅失败",
    currentUnsubscribed: "你当前已取消订阅所有邮件通知。",
    resubscribeCta: "点击这里重新订阅",
    bounced: "之前的邮件发生退信，请更新邮箱或联系支持。",
    testRecorded: "测试通知已在本地记录",
    testFailed: "发送测试通知失败",
  },
} as const;

export function NotificationSettings() {
  const { locale } = useLiteCopy();
  const copy = COPY[locale];
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Generate unique IDs for form elements
  const emailEnabledId = useId();
  const applicationStatusId = useId();
  const interviewRemindersId = useId();
  const weeklyDigestId = useId();
  const jobRecommendationsId = useId();
  const profileViewsId = useId();
  const notificationFrequencyId = useId();

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = () => {
      try {
        setLoading(true);
        const stored = window.localStorage.getItem(LOCAL_NOTIFICATION_PREFERENCES_KEY);
        const storedPreferences = stored
          ? { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(stored) }
          : DEFAULT_NOTIFICATION_PREFERENCES;

        setPreferences(storedPreferences);
        setStatus({
          ...storedPreferences,
          email_unsubscribed: !storedPreferences.email_enabled,
          email_bounced: false,
          email_address: "local@sync-hire.local",
        });
      } catch (error) {
        setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
        setStatus({
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          email_unsubscribed: false,
          email_bounced: false,
          email_address: "local@sync-hire.local",
        });
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleFrequencyChange = (frequency: NotificationPreferences["notification_frequency"]) => {
    setPreferences(prev => ({ ...prev, notification_frequency: frequency }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      window.localStorage.setItem(
        LOCAL_NOTIFICATION_PREFERENCES_KEY,
        JSON.stringify(preferences)
      );
      setStatus({
        ...preferences,
        email_unsubscribed: !preferences.email_enabled,
        email_bounced: false,
        email_address: "local@sync-hire.local",
      });
      showMessage("success", copy.saved);
    } catch (error) {
      showMessage("error", copy.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!confirm(copy.confirmUnsubscribe)) {
      return;
    }

    try {
      setSaving(true);
      const nextPreferences = { ...preferences, email_enabled: false };
      setPreferences(nextPreferences);
      window.localStorage.setItem(
        LOCAL_NOTIFICATION_PREFERENCES_KEY,
        JSON.stringify(nextPreferences)
      );
      setStatus({
        ...nextPreferences,
        email_unsubscribed: true,
        email_bounced: false,
        email_address: "local@sync-hire.local",
      });
      showMessage("success", copy.unsubscribed);
    } catch (error) {
      showMessage("error", copy.unsubscribeFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleResubscribe = async () => {
    try {
      setSaving(true);
      const nextPreferences = { ...preferences, email_enabled: true };
      setPreferences(nextPreferences);
      window.localStorage.setItem(
        LOCAL_NOTIFICATION_PREFERENCES_KEY,
        JSON.stringify(nextPreferences)
      );
      setStatus({
        ...nextPreferences,
        email_unsubscribed: false,
        email_bounced: false,
        email_address: "local@sync-hire.local",
      });
      showMessage("success", copy.resubscribed);
    } catch (error) {
      showMessage("error", copy.resubscribeFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async (type: "application_status" | "interview_reminder" | "weekly_digest") => {
    try {
      setTestLoading(true);
      showMessage("success", copy.testRecorded);
    } catch (error) {
      showMessage("error", copy.testFailed);
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{copy.title}</h2>
        <p className="text-gray-600 mt-1">
          {copy.subtitle}
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-md ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
          role="alert"
        >
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {status?.email_unsubscribed && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                {copy.currentUnsubscribed}{" "}
                <button
                  onClick={handleResubscribe}
                  disabled={saving}
                  className="font-medium underline hover:text-yellow-800 disabled:opacity-50"
                >
                  {copy.resubscribeCta}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {status?.email_bounced && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {copy.bounced}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6 space-y-6">
          {/* Email Master Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label htmlFor={emailEnabledId} className="text-base font-medium text-gray-900">
                {copy.emailNotifications}
              </label>
              <p className="text-sm text-gray-500 mt-1">
                {copy.emailDescription}
              </p>
            </div>
            <button
              id={emailEnabledId}
              type="button"
              role="switch"
              aria-checked={preferences.email_enabled}
              onClick={() => handleToggle("email_enabled", !preferences.email_enabled)}
              disabled={status?.email_unsubscribed}
              className={`${
                preferences.email_enabled ? "bg-primary" : "bg-gray-200"
              } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span
                aria-hidden="true"
                className={`${
                  preferences.email_enabled ? "translate-x-5" : "translate-x-0"
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              />
            </button>
          </div>

          <hr className="border-gray-200" />

          {/* Individual Notification Types */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">{copy.notificationTypes}</h3>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label htmlFor={applicationStatusId} className="text-sm font-medium text-gray-900">
                  {copy.applicationStatus}
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  {copy.applicationStatusDescription}
                </p>
              </div>
              <button
                id={applicationStatusId}
                type="button"
                role="switch"
                aria-checked={preferences.application_status_updates}
                onClick={() => handleToggle("application_status_updates", !preferences.application_status_updates)}
                disabled={!preferences.email_enabled || status?.email_unsubscribed}
                className={`${
                  preferences.application_status_updates ? "bg-primary" : "bg-gray-200"
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span
                  aria-hidden="true"
                  className={`${
                    preferences.application_status_updates ? "translate-x-5" : "translate-x-0"
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label htmlFor={interviewRemindersId} className="text-sm font-medium text-gray-900">
                  {copy.interviewReminders}
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  {copy.interviewRemindersDescription}
                </p>
              </div>
              <button
                id={interviewRemindersId}
                type="button"
                role="switch"
                aria-checked={preferences.interview_reminders}
                onClick={() => handleToggle("interview_reminders", !preferences.interview_reminders)}
                disabled={!preferences.email_enabled || status?.email_unsubscribed}
                className={`${
                  preferences.interview_reminders ? "bg-primary" : "bg-gray-200"
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span
                  aria-hidden="true"
                  className={`${
                    preferences.interview_reminders ? "translate-x-5" : "translate-x-0"
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label htmlFor={weeklyDigestId} className="text-sm font-medium text-gray-900">
                  {copy.weeklyDigest}
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  {copy.weeklyDigestDescription}
                </p>
              </div>
              <button
                id={weeklyDigestId}
                type="button"
                role="switch"
                aria-checked={preferences.weekly_digest}
                onClick={() => handleToggle("weekly_digest", !preferences.weekly_digest)}
                disabled={!preferences.email_enabled || status?.email_unsubscribed}
                className={`${
                  preferences.weekly_digest ? "bg-primary" : "bg-gray-200"
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span
                  aria-hidden="true"
                  className={`${
                    preferences.weekly_digest ? "translate-x-5" : "translate-x-0"
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label htmlFor={jobRecommendationsId} className="text-sm font-medium text-gray-900">
                  {copy.jobRecommendations}
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  {copy.jobRecommendationsDescription}
                </p>
              </div>
              <button
                id={jobRecommendationsId}
                type="button"
                role="switch"
                aria-checked={preferences.job_recommendations}
                onClick={() => handleToggle("job_recommendations", !preferences.job_recommendations)}
                disabled={!preferences.email_enabled || status?.email_unsubscribed}
                className={`${
                  preferences.job_recommendations ? "bg-primary" : "bg-gray-200"
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span
                  aria-hidden="true"
                  className={`${
                    preferences.job_recommendations ? "translate-x-5" : "translate-x-0"
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label htmlFor={profileViewsId} className="text-sm font-medium text-gray-900">
                  {copy.profileViews}
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  {copy.profileViewsDescription}
                </p>
              </div>
              <button
                id={profileViewsId}
                type="button"
                role="switch"
                aria-checked={preferences.profile_views}
                onClick={() => handleToggle("profile_views", !preferences.profile_views)}
                disabled={!preferences.email_enabled || status?.email_unsubscribed}
                className={`${
                  preferences.profile_views ? "bg-primary" : "bg-gray-200"
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span
                  aria-hidden="true"
                  className={`${
                    preferences.profile_views ? "translate-x-5" : "translate-x-0"
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Notification Frequency */}
          <div>
            <label htmlFor={notificationFrequencyId} className="text-base font-medium text-gray-900">
              {copy.frequency}
            </label>
            <p className="text-sm text-gray-500 mt-1 mb-3">
              {copy.frequencyDescription}
            </p>
            <select
              id={notificationFrequencyId}
              value={preferences.notification_frequency}
              onChange={(e) => handleFrequencyChange(e.target.value as NotificationPreferences["notification_frequency"])}
              disabled={!preferences.email_enabled || status?.email_unsubscribed}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="immediate">{copy.immediate}</option>
              <option value="daily">{copy.daily}</option>
              <option value="weekly">{copy.weekly}</option>
              <option value="never">{copy.never}</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-between items-center">
          <button
            type="button"
            onClick={handleUnsubscribe}
            disabled={status?.email_unsubscribed || saving}
            className="text-sm text-red-600 hover:text-red-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copy.unsubscribe}
          </button>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? copy.saving : copy.save}
            </button>
          </div>
        </div>
      </div>

      {/* Test Notifications */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{copy.testTitle}</h3>
          <p className="text-sm text-gray-500 mb-4">
            {copy.testDescription}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleTestNotification("application_status")}
              disabled={testLoading || status?.email_unsubscribed || !preferences.email_enabled}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copy.testStatus}
            </button>
            <button
              type="button"
              onClick={() => handleTestNotification("interview_reminder")}
              disabled={testLoading || status?.email_unsubscribed || !preferences.email_enabled}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copy.testInterview}
            </button>
            <button
              type="button"
              onClick={() => handleTestNotification("weekly_digest")}
              disabled={testLoading || status?.email_unsubscribed || !preferences.email_enabled}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copy.testWeekly}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
