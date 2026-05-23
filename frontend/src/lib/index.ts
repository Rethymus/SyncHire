/**
 * Barrel exports for lib directory
 * Centralizes commonly used utilities for cleaner imports
 *
 * Usage:
 * - import { validateJobDescription } from "@/lib" // Direct export
 * - import { csrf } from "@/lib/security" // Modular export
 * - import { delay } from "@/lib/utils" // Utility export
 */

// Core utilities
export * from "./utils";

// State & Validation (most commonly used)
export * from "./store";
export * from "./validation";
export * from "./form-validator";

// Logging
export * from "./logger";

// Internationalization
export * from "./i18n";

// Constants
export * from "./constants";

// Modular exports (use sub-module exports for better tree-shaking)
export * from "./security";
export * from "./api";
export * from "./performance";
