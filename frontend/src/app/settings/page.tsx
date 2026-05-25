"use client";

/**
 * Settings Page
 *
 * User account settings including notifications, profile, and preferences
 */

import { useState } from "react";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { NotificationHistory } from "@/components/notification-history";

type TabType = "settings" | "history";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("settings");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8" aria-label="Settings tabs">
            <button
              onClick={() => setActiveTab("settings")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "settings"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              aria-current={activeTab === "settings" ? "page" : undefined}
            >
              Notification Settings
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "history"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              aria-current={activeTab === "history" ? "page" : undefined}
            >
              Notification History
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "settings" && <NotificationSettings />}
        {activeTab === "history" && <NotificationHistory />}
      </div>
    </div>
  );
}
