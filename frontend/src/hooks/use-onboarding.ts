import { useEffect, useCallback, useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { getUserData, storeUserData } from "@/lib/auth";

const ONBOARDING_STORAGE_KEY = "onboarding_state";
const LAST_LOGIN_KEY = "last_login";

interface StoredOnboardingState {
  isOnboarded: boolean;
  completedSteps: string[];
  skipped: boolean;
  startedAt?: string;
  completedAt?: string;
}

/**
 * Hook to manage onboarding state with localStorage persistence
 * Automatically shows onboarding for new users or those who haven't completed it
 */
export function useOnboarding() {
  const {
    onboarding,
    startOnboarding,
    skipOnboarding,
    resetOnboarding,
    user,
  } = useAppStore();

  // Load onboarding state from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedState = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (storedState) {
        const parsed: StoredOnboardingState = JSON.parse(storedState);

        // Only restore if it belongs to the current user
        if (user && parsed.isOnboarded) {
          // State is already loaded from user data
        }
      }
    } catch (error) {
      console.error("Failed to load onboarding state:", error);
    }
  }, [user]);

  // Save onboarding state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stateToStore: StoredOnboardingState = {
        isOnboarded: onboarding.isOnboarded,
        completedSteps: onboarding.completedSteps,
        skipped: onboarding.skipped,
        startedAt: onboarding.startedAt?.toISOString(),
        completedAt: onboarding.completedAt?.toISOString(),
      };
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(stateToStore));
    } catch (error) {
      console.error("Failed to save onboarding state:", error);
    }
  }, [onboarding]);

  // Check if user should see onboarding
  const shouldShowOnboarding = useCallback(() => {
    if (!user) return false;

    const userData = getUserData();
    if (!userData) return false;

    // Check if this is a new user (first login)
    const lastLogin = localStorage.getItem(LAST_LOGIN_KEY);
    const isFirstLogin = !lastLogin;

    // Update last login time
    localStorage.setItem(LAST_LOGIN_KEY, new Date().toISOString());

    // Show onboarding if:
    // 1. First time login
    // 2. Haven't completed onboarding
    // 3. Haven't skipped onboarding
    return (
      isFirstLogin ||
      (!onboarding.isOnboarded && !onboarding.skipped)
    );
  }, [user, onboarding]);

  // Start onboarding for eligible users
  useEffect(() => {
    if (shouldShowOnboarding() && !onboarding.startedAt) {
      startOnboarding();
    }
  }, [shouldShowOnboarding, onboarding.startedAt, startOnboarding]);

  // Update user data with onboarding completion
  useEffect(() => {
    if (onboarding.isOnboarded && user) {
      const userData = getUserData();
      if (userData) {
        storeUserData({
          ...userData,
          isActive: true,
        });
      }
    }
  }, [onboarding.isOnboarded, user]);

  return {
    onboarding,
    startOnboarding,
    skipOnboarding,
    resetOnboarding,
    shouldShowOnboarding,
  };
}

/**
 * Hook to track onboarding progress and trigger actions
 */
export function useOnboardingProgress() {
  const { onboarding, completeOnboardingStep, finishOnboarding } =
    useAppStore();

  const completeStep = useCallback(
    (stepId: string) => {
      completeOnboardingStep(stepId);

      // Check if all steps are completed
      const totalSteps = 7; // Total number of onboarding steps
      if (onboarding.completedSteps.length + 1 >= totalSteps) {
        finishOnboarding();
      }
    },
    [completeOnboardingStep, finishOnboarding, onboarding.completedSteps.length]
  );

  const getProgress = useCallback(() => {
    const totalSteps = 7;
    const completedSteps = onboarding.completedSteps.length;
    return {
      completed: completedSteps,
      total: totalSteps,
      percentage: Math.round((completedSteps / totalSteps) * 100),
    };
  }, [onboarding.completedSteps.length]);

  return {
    completeStep,
    getProgress,
    isCompleted: onboarding.isOnboarded,
    currentStep: onboarding.currentStep,
  };
}

/**
 * Hook to manage product tour state
 */
export function useProductTour() {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useState(false);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || isInitializedRef.current) return;

    try {
      const stored = localStorage.getItem("has_seen_product_tour");
      const hasSeen = stored === "true";
      // Use requestAnimationFrame to defer state update
      requestAnimationFrame(() => {
        setHasSeenTour(hasSeen);
      });
      isInitializedRef.current = true;
    } catch (error) {
      console.error("Failed to load tour state:", error);
    }
  }, []);

  const startTour = useCallback(() => {
    setIsTourOpen(true);
  }, []);

  const closeTour = useCallback(() => {
    setIsTourOpen(false);
    if (!hasSeenTour) {
      localStorage.setItem("has_seen_product_tour", "true");
      setHasSeenTour(true);
    }
  }, [hasSeenTour]);

  const resetTour = useCallback(() => {
    localStorage.removeItem("has_seen_product_tour");
    setHasSeenTour(false);
  }, []);

  return {
    isTourOpen,
    hasSeenTour,
    startTour,
    closeTour,
    resetTour,
  };
}
