"use client";

import { useMemo, memo, useCallback, useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  X,
  Sparkles,
  ArrowRight,
  Play,
  BookOpen,
  Video,
  Users,
} from "lucide-react";

interface QuickAction {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
}

const quickActionsConfig: QuickAction[] = [
  {
    id: "upload-resume",
    titleKey: "quickActions.uploadResume.title",
    descriptionKey: "quickActions.uploadResume.description",
    icon: () => (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    href: "/dashboard",
    color: "bg-blue-500",
  },
  {
    id: "watch-tutorial",
    titleKey: "quickActions.watchTutorial.title",
    descriptionKey: "quickActions.watchTutorial.description",
    icon: Play,
    href: "#tutorial",
    color: "bg-purple-500",
  },
  {
    id: "read-guide",
    titleKey: "quickActions.readGuide.title",
    descriptionKey: "quickActions.readGuide.description",
    icon: BookOpen,
    href: "#guide",
    color: "bg-green-500",
  },
  {
    id: "join-community",
    titleKey: "quickActions.joinCommunity.title",
    descriptionKey: "quickActions.joinCommunity.description",
    icon: Users,
    href: "#community",
    color: "bg-orange-500",
  },
];

function WelcomeBanner() {
  const t = useTranslations('welcome');
  const { onboarding, startOnboarding } = useAppStore();
  const [isVisible, setIsVisible] = useState(true);
  const [currentTip, setCurrentTip] = useState(0);

  const tips = useMemo(
    () => [
      t('tips.uploadResume'),
      t('tips.smartMatching'),
      t('tips.interviewPrep'),
      t('tips.efficiency'),
    ],
    [t]
  );

  const quickActions = useMemo(() => quickActionsConfig.map(action => ({
    ...action,
    title: t(action.titleKey as any),
    description: t(action.descriptionKey as any)
  })), [t]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleStartTour = useCallback(() => {
    startOnboarding();
  }, [startOnboarding]);

  // Auto-rotate tips
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isVisible, tips.length]);

  if (!isVisible || onboarding.isOnboarded) {
    return null;
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
        aria-label={t('close')}
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0">
            <div className="bg-white/20 rounded-lg p-3">
              <Sparkles className="h-8 w-8" />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">
              {t('title')}
            </h2>
            <p className="text-blue-100 text-lg">
              {t('subtitle')}
            </p>
          </div>
        </div>

        {/* Tips carousel */}
        <div className="bg-white/10 rounded-lg p-4 mb-6 backdrop-blur-sm">
          <p className="text-sm text-blue-50">
            {tips[currentTip]}
          </p>
          <div className="flex gap-1 mt-2">
            {tips.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  idx === currentTip ? "bg-white w-8" : "bg-white/30 w-4"
                )}
              />
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <a
                key={action.id}
                href={action.href}
                className="group bg-white/10 rounded-lg p-4 hover:bg-white/20 transition-all duration-200 backdrop-blur-sm"
              >
                <div className={`${action.color} rounded-lg p-2 mb-3 w-fit`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold mb-1">{action.title}</h3>
                <p className="text-sm text-blue-100">{action.description}</p>
              </a>
            );
          })}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleStartTour}
            className="bg-white text-blue-600 hover:bg-blue-50 min-h-[44px] px-6 font-semibold"
          >
            <Play className="h-4 w-4 mr-2" />
            {t('cta.startTour')}
          </Button>
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 min-h-[44px] px-6"
            onClick={handleClose}
          >
            {t('cta.later')}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default memo(WelcomeBanner);
