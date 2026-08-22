"use client";

import { useEffect, useState } from "react";
import { Database, KeyRound, PlugZap, RefreshCw, Search, Settings2, ShieldCheck, Sparkles, Image as ImageIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AIRuntimeSettings,
  applyRecommendedRuntimeDefaults,
  createDefaultAIRuntimeSettings,
  loadAIRuntimeSettings,
  refreshRuntimeCatalog,
  saveAIRuntimeSettings,
} from "@/lib/ai-runtime-settings";
import { useLiteCopy } from "@/lib/lite-i18n";
import { isGithubPagesDeployment } from "@/lib/deployment-mode";
import { COPY, type TabType } from "./_components/copy";
import { MessageBanner, MetricStrip } from "./_components/shared";

// Panels are heavy (bilingual panel copy + zh catalogs + forms); load them per
// tab on demand. The shell keeps only the small copy.ts (title/tabs/status/
// actions) and shared.tsx (MetricStrip/MessageBanner) — panel-domain copy in
// copy-panels.ts is imported by the lazy panels themselves.
function PanelSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

const AIProviderPanel = dynamic(
  () => import("./_components/ai-provider-panel").then((m) => m.AIProviderPanel),
  { ssr: false, loading: () => <PanelSkeleton /> }
);
const CapabilityPanel = dynamic(
  () => import("./_components/capability-panel").then((m) => m.CapabilityPanel),
  { ssr: false, loading: () => <PanelSkeleton /> }
);
const DiscoveryPanel = dynamic(
  () => import("./_components/discovery-panel").then((m) => m.DiscoveryPanel),
  { ssr: false, loading: () => <PanelSkeleton /> }
);
const ImageProviderPanel = dynamic(
  () => import("@/components/settings/image-provider-panel").then((m) => m.ImageProviderPanel),
  { ssr: false, loading: () => <PanelSkeleton /> }
);
const NotificationSettings = dynamic(
  () => import("@/components/settings/notification-settings").then((m) => m.NotificationSettings),
  { ssr: false, loading: () => <PanelSkeleton /> }
);
const NotificationHistory = dynamic(
  () => import("@/components/notification-history").then((m) => m.NotificationHistory),
  { ssr: false, loading: () => <PanelSkeleton /> }
);

export default function SettingsPage() {
  const { locale } = useLiteCopy();
  const copy = COPY[locale];
  const pagesMode = isGithubPagesDeployment();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window === "undefined") return "ai";
    const tab = new URLSearchParams(window.location.search).get("tab");
    return tab && ["ai", "skills", "mcp", "discover", "image", "notifications", "history"].includes(tab)
      ? (tab as TabType)
      : "ai";
  });
  const [settings, setSettings] = useState<AIRuntimeSettings>(() =>
    createDefaultAIRuntimeSettings()
  );
  const [hasHydrated, setHasHydrated] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 4000);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loaded = loadAIRuntimeSettings();
      const nextSettings = loaded.autoRefreshCatalogs ? refreshRuntimeCatalog(loaded) : loaded;
      setSettings(nextSettings);
      if (loaded.autoRefreshCatalogs) {
        saveAIRuntimeSettings(nextSettings);
      }
      setHasHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const saveSettings = () => {
    saveAIRuntimeSettings(settings);
    showMessage("success", copy.actions.saved);
  };

  const restoreDefaults = () => {
    const nextSettings = applyRecommendedRuntimeDefaults(settings);
    setSettings(nextSettings);
    saveAIRuntimeSettings(nextSettings);
    showMessage("success", copy.actions.resetDone);
  };

  const refreshCatalogs = () => {
    const nextSettings = refreshRuntimeCatalog(settings);
    setSettings(nextSettings);
    saveAIRuntimeSettings(nextSettings);
    showMessage("success", copy.actions.refreshed);
  };

  if (!hasHydrated) {
    return (
      <main className="min-h-screen bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-md border border-border bg-card p-8 text-sm text-muted-foreground">
            {copy.status.loading}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-950">{copy.pageTitle}</h1>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                <ShieldCheck className="mr-1 size-3" />
                {copy.privacyPill}
              </Badge>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{copy.pageSubtitle}</p>
          </div>
          <Button type="button" variant="outline" onClick={refreshCatalogs}>
            <RefreshCw className="size-4" />
            {copy.actions.refresh}
          </Button>
        </div>

        <div className="mb-6">
          <MetricStrip settings={settings} locale={locale} />
        </div>

        <MessageBanner message={message} />

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="mt-6">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-gray-200 p-1">
            <TabsTrigger value="ai" className="gap-2">
              <KeyRound className="size-4" />
              {copy.tabs.ai}
            </TabsTrigger>
            <TabsTrigger value="skills" className="gap-2">
              <Sparkles className="size-4" />
              {copy.tabs.skills}
            </TabsTrigger>
            <TabsTrigger value="mcp" className="gap-2">
              <PlugZap className="size-4" />
              {copy.tabs.mcp}
            </TabsTrigger>
            <TabsTrigger value="discover" className="gap-2">
              <Search className="size-4" />
              {copy.tabs.discover}
            </TabsTrigger>
            {!pagesMode ? (
              <TabsTrigger value="image" className="gap-2">
                <ImageIcon className="size-4" />
                {copy.tabs.image}
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="notifications" className="gap-2">
              <Settings2 className="size-4" />
              {copy.tabs.notifications}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Database className="size-4" />
              {copy.tabs.history}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="mt-6">
            <AIProviderPanel
              settings={settings}
              setSettings={setSettings}
              locale={locale}
              onSave={saveSettings}
              onReset={restoreDefaults}
            />
          </TabsContent>
          <TabsContent value="skills" className="mt-6">
            <CapabilityPanel
              kind="skill"
              settings={settings}
              setSettings={setSettings}
              locale={locale}
              onSave={saveSettings}
              onDefaults={restoreDefaults}
            />
          </TabsContent>
          <TabsContent value="mcp" className="mt-6">
            <CapabilityPanel
              kind="mcp"
              settings={settings}
              setSettings={setSettings}
              locale={locale}
              onSave={saveSettings}
              onDefaults={restoreDefaults}
            />
          </TabsContent>
          <TabsContent value="discover" className="mt-6">
            <DiscoveryPanel
              settings={settings}
              setSettings={setSettings}
              locale={locale}
              onRefresh={refreshCatalogs}
              onSave={saveSettings}
              showMessage={showMessage}
            />
          </TabsContent>
          {!pagesMode ? (
            <TabsContent value="image" className="mt-6">
              <ImageProviderPanel />
            </TabsContent>
          ) : null}
          <TabsContent value="notifications" className="mt-6">
            <NotificationSettings />
          </TabsContent>
          <TabsContent value="history" className="mt-6">
            <NotificationHistory />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
