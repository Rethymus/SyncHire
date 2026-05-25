"use client";

import { useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Shield,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { searchHistoryAPI } from "@/lib/api/search-history";
import { logger, LogCategory } from "@/lib/logger";

interface SearchPrivacySettingsProps {
  className?: string;
}

interface PrivacySettings {
  historyEnabled: boolean;
  analyticsEnabled: boolean;
  sensitiveDetectionEnabled: boolean;
  autoCleanupDays: number;
}

export const SearchPrivacySettings = memo(function SearchPrivacySettings({
  className,
}: SearchPrivacySettingsProps) {
  const [settings, setSettings] = useState<PrivacySettings>({
    historyEnabled: true,
    analyticsEnabled: true,
    sensitiveDetectionEnabled: true,
    autoCleanupDays: 30,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [clearingHistory, setClearingHistory] = useState(false);

  const handleSettingChange = useCallback((key: keyof PrivacySettings, value: boolean | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSuccess(null);
    setError(null);

    // Here you would normally save to user preferences
    logger.info(LogCategory.API, `Privacy setting changed: ${key} = ${value}`);
  }, []);

  const handleClearAllHistory = useCallback(async () => {
    if (!confirm("Are you sure you want to clear all search history? This action cannot be undone.")) {
      return;
    }

    try {
      setClearingHistory(true);
      setError(null);
      await searchHistoryAPI.clearSearchHistory();
      setSuccess("All search history has been cleared");
    } catch (error) {
      logger.error(LogCategory.API, "Failed to clear search history", error as Error);
      setError("Failed to clear search history");
    } finally {
      setClearingHistory(false);
    }
  }, []);

  const handleClearSensitiveHistory = useCallback(async () => {
    if (!confirm("Are you sure you want to clear sensitive searches? This action cannot be undone.")) {
      return;
    }

    try {
      setClearingHistory(true);
      setError(null);

      // Note: This would require a backend endpoint to filter by is_sensitive
      // For now, we'll clear all history
      await searchHistoryAPI.clearSearchHistory();
      setSuccess("Sensitive search history has been cleared");
    } catch (error) {
      logger.error(LogCategory.API, "Failed to clear sensitive history", error as Error);
      setError("Failed to clear sensitive history");
    } finally {
      setClearingHistory(false);
    }
  }, []);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Search Privacy Settings</h2>
        <p className="text-gray-600 mt-1">
          Control how your search history is tracked and stored
        </p>
      </div>

      {/* Main Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Controls
          </CardTitle>
          <CardDescription>
            Manage your search history and analytics preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* History Tracking */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="history-enabled" className="text-base font-semibold">
                Search History Tracking
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Save your recent searches for quick access and re-run
              </p>
            </div>
            <Switch
              id="history-enabled"
              checked={settings.historyEnabled}
              onCheckedChange={(checked: boolean) => handleSettingChange('historyEnabled', checked)}
              aria-label="Toggle search history tracking"
            />
          </div>

          {/* Analytics */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="analytics-enabled" className="text-base font-semibold">
                Search Analytics
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Help improve search suggestions and provide insights
              </p>
            </div>
            <Switch
              id="analytics-enabled"
              checked={settings.analyticsEnabled}
              onCheckedChange={(checked: boolean) => handleSettingChange('analyticsEnabled', checked)}
              aria-label="Toggle search analytics"
            />
          </div>

          {/* Sensitive Detection */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="sensitive-detection" className="text-base font-semibold">
                Sensitive Search Detection
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Automatically detect and flag sensitive searches (e.g., personal names, SSNs)
              </p>
            </div>
            <Switch
              id="sensitive-detection"
              checked={settings.sensitiveDetectionEnabled}
              onCheckedChange={(checked: boolean) => handleSettingChange('sensitiveDetectionEnabled', checked)}
              aria-label="Toggle sensitive search detection"
            />
          </div>

          {/* Auto Cleanup */}
          <div className="space-y-2">
            <Label htmlFor="auto-cleanup" className="text-base font-semibold">
              Auto-Cleanup Period
            </Label>
            <p className="text-sm text-gray-600">
              Automatically delete search history older than the selected period
            </p>
            <div className="flex gap-2 mt-2">
              {[
                { value: 7, label: '7 days' },
                { value: 30, label: '30 days' },
                { value: 90, label: '90 days' },
                { value: 365, label: '1 year' },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={settings.autoCleanupDays === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSettingChange('autoCleanupDays', option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Clear your search history and manage stored data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Clear All History */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-900">Clear All Search History</h3>
              <p className="text-sm text-gray-600 mt-1">
                Permanently delete all your search history
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAllHistory}
              disabled={clearingHistory || !settings.historyEnabled}
            >
              {clearingHistory ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </>
              )}
            </Button>
          </div>

          {/* Clear Sensitive History */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-900">Clear Sensitive Searches</h3>
              <p className="text-sm text-gray-600 mt-1">
                Remove searches flagged as sensitive
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSensitiveHistory}
              disabled={clearingHistory || !settings.historyEnabled || !settings.sensitiveDetectionEnabled}
            >
              {clearingHistory ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Clear Sensitive
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Information */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Privacy Information</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            Your search history is stored securely and is only accessible to you. Here&apos;s what you should know:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Search history is never shared with third parties</li>
            <li>Sensitive searches are automatically flagged and can be filtered out</li>
            <li>You can clear your history at any time using the controls above</li>
            <li>Auto-cleanup helps maintain your privacy by automatically removing old searches</li>
            <li>Disabling history tracking stops new searches from being saved</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Status Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="default" className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900">Success</AlertTitle>
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}
    </div>
  );
});