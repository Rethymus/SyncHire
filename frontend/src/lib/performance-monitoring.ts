/**
 * 性能监控Hook
 * 集成Web Vitals和性能指标收集
 */

"use client";

import { useEffect, useState } from "react";

// 定义性能条目类型以避免使用 any
interface PerformanceEntryFID extends PerformanceEntry {
  processingStart?: number;
}

interface PerformanceEntryCLS extends PerformanceEntry {
  hadRecentInput: boolean;
  value?: number;
}

// 使用 PerformanceNavigationTiming 的扩展类型
type NavigationEntry = PerformanceEntry & {
  responseStart: number;
  domComplete?: number;
  fetchStart?: number;
};

interface PerformanceMetrics {
  fcp: number | null;  // First Contentful Paint
  lcp: number | null;  // Largest Contentful Paint
  fid: number | null;  // First Input Delay
  cls: number | null;  // Cumulative Layout Shift
  ttfb: number | null; // Time to First Byte
}

export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.PerformanceObserver) {
      return;
    }

    // FCP
    const observeFCP = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === "first-contentful-paint") {
          setMetrics((prev) => ({ ...prev, fcp: entry.startTime }));
        }
      });
    });
    observeFCP.observe({ entryTypes: ["paint"] });

    // LCP
    const observeLCP = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      setMetrics((prev) => ({ ...prev, lcp: lastEntry.startTime }));
    });
    observeLCP.observe({ entryTypes: ["largest-contentful-paint"] });

    // FID
    const observeFID = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const fidEntry = entry as PerformanceEntryFID;
        const processingStart = fidEntry.processingStart;
        setMetrics((prev) => ({ ...prev, fid: processingStart && processingStart > 0 ? processingStart - entry.startTime : 0 }));
      });
    });
    observeFID.observe({ entryTypes: ["first-input"] });

    // CLS
    let clsScore = 0;
    const observeCLS = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const clsEntry = entry as PerformanceEntryCLS;
        if (!clsEntry.hadRecentInput) {
          clsScore += clsEntry.value || 0;
          setMetrics((prev) => ({ ...prev, cls: clsScore }));
        }
      });
    });
    observeCLS.observe({ entryTypes: ["layout-shift"] });

    // TTFB
    const handleLoad = () => {
      const navigation = performance.getEntriesByType("navigation")[0] as NavigationEntry;
      if (navigation) {
        setMetrics((prev) => ({ ...prev, ttfb: navigation.responseStart }));
      }
    };

    window.addEventListener("load", handleLoad);

    return () => {
      observeFCP.disconnect();
      observeLCP.disconnect();
      observeFID.disconnect();
      observeCLS.disconnect();
      window.removeEventListener("load", handleLoad);
    };
  }, []);

  const getPerformanceGrade = () => {
    if (!metrics.lcp || !metrics.fid) return "calculating";

    let score = 0;

    // LCP评分 (权重: 25%)
    if (metrics.lcp < 2500) score += 25;
    else if (metrics.lcp < 4000) score += 13;

    // FID评分 (权重: 25%)
    if (metrics.fid < 100) score += 25;
    else if (metrics.fid < 300) score += 13;

    // CLS评分 (权重: 25%)
    if (!metrics.cls || metrics.cls < 0.1) score += 25;
    else if (metrics.cls < 0.25) score += 13;

    // FCP评分 (权重: 25%)
    if (metrics.fcp && metrics.fcp < 1800) score += 25;
    else if (metrics.fcp && metrics.fcp < 3000) score += 13;

    if (score >= 90) return "A";
    if (score >= 75) return "B";
    if (score >= 60) return "C";
    return "D";
  };

  return {
    metrics,
    grade: getPerformanceGrade(),
  };
}
