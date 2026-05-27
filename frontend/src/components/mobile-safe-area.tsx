"use client";

import { useEffect } from "react";

/**
 * MobileSafeArea - Handles safe area insets for mobile devices
 * Adds CSS variables for safe areas (notch, home indicator, etc.)
 */
export function MobileSafeArea() {
  useEffect(() => {
    // Add safe area support
    const style = document.createElement("style");
    style.innerHTML = `
      :root {
        --safe-area-inset-top: env(safe-area-inset-top, 0px);
        --safe-area-inset-right: env(safe-area-inset-right, 0px);
        --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
        --safe-area-inset-left: env(safe-area-inset-left, 0px);
      }

      .pb-safe {
        padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
      }

      .pt-safe {
        padding-top: calc(0.5rem + env(safe-area-inset-top, 0px));
      }

      .px-safe {
        padding-left: calc(0.5rem + env(safe-area-inset-left, 0px));
        padding-right: calc(0.5rem + env(safe-area-inset-right, 0px));
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return null;
}