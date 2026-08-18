"use client";

/**
 * Registers the app-shell service worker.
 * Production + http(s) only: dev servers and file:// shells (Electron,
 * Tauri) skip registration entirely.
 */

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (!window.location.protocol.startsWith("http")) return;

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const register = () => {
      navigator.serviceWorker
        .register(`${basePath}/sw.js`)
        .catch((err) => {
          // Non-fatal: the app works fully without the SW.
          console.warn("[sw] registration failed:", err);
        });
    };

    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
