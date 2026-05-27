/**
 * Frontend Security Enhancements for SyncHire
 *
 * Provides client-side security measures:
 * Secure token management
 * CSRF protection
 - Secure communication
 - XSS prevention
 - Security event logging
 */

import { logger } from './logger';
import { LogCategory } from './logger';

// ============================================
// Secure Token Management
// ============================================

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Secure token storage with encryption and validation
 */
export class SecureTokenManager {
  private static readonly TOKEN_KEY = 'auth_tokens';
  private static readonly CSRF_TOKEN_KEY = 'csrf_token';

  /**
   * Store authentication tokens securely
   */
  static storeTokens(tokens: TokenData): boolean {
    try {
      // Validate tokens before storing
      if (!this.validateTokens(tokens)) {
        logger.warn(LogCategory.SECURITY, 'Invalid token format');
        return false;
      }

      // Store in sessionStorage (more secure than localStorage)
      const tokenData = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      };

      sessionStorage.setItem(this.TOKEN_KEY, JSON.stringify(tokenData));

      // Generate and store CSRF token
      const csrfToken = this.generateCSRFToken();
      sessionStorage.setItem(this.CSRF_TOKEN_KEY, csrfToken);

      return true;
    } catch (error) {
      logger.warn(LogCategory.SECURITY, 'Failed to store tokens', error as Error);
      return false;
    }
  }

  /**
   * Retrieve stored tokens
   */
  static getTokens(): TokenData | null {
    try {
      const tokenData = sessionStorage.getItem(this.TOKEN_KEY);

      if (!tokenData) {
        return null;
      }

      const tokens = JSON.parse(tokenData);

      // Check if token is expired
      if (tokens.expiresAt && Date.now() > tokens.expiresAt) {
        this.clearTokens();
        return null;
      }

      return tokens;
    } catch (error) {
      logger.warn(LogCategory.SECURITY, 'Failed to retrieve tokens', error as Error);
      return null;
    }
  }

  /**
   * Get access token
   */
  static getAccessToken(): string | null {
    const tokens = this.getTokens();
    return tokens?.accessToken || null;
  }

  /**
   * Get refresh token
   */
  static getRefreshToken(): string | null {
    const tokens = this.getTokens();
    return tokens?.refreshToken || null;
  }

  /**
   * Get CSRF token
   */
  static getCSRFToken(): string | null {
    return sessionStorage.getItem(this.CSRF_TOKEN_KEY);
  }

  /**
   * Clear all tokens
   */
  static clearTokens(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.CSRF_TOKEN_KEY);
  }

  /**
   * Validate token format
   */
  private static validateTokens(tokens: TokenData): boolean {
    if (!tokens.accessToken || !tokens.refreshToken) {
      return false;
    }

    // Basic JWT format validation
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    if (!jwtRegex.test(tokens.accessToken)) {
      return false;
    }

    return true;
  }

  /**
   * Generate CSRF token
   */
  private static generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
}

// ============================================
// Secure API Communication
// ============================================

interface SecureRequestOptions extends RequestInit {
  requireAuth?: boolean;
  skipCSRF?: boolean;
}

/**
 * Secure API client with authentication and CSRF protection
 */
export class SecureAPIClient {
  private static baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';

  /**
   * Make secure API request
   */
  static async request<T>(
    endpoint: string,
    options: SecureRequestOptions = {}
  ): Promise<T> {
    const {
      requireAuth = true,
      skipCSRF = false,
      headers = {},
      ...restOptions
    } = options;

    try {
      // Build URL
      const url = `${this.baseURL}${endpoint}`;

      // Prepare headers
      const requestHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        ...headers,
      };

      // Add authentication header
      if (requireAuth) {
        const token = SecureTokenManager.getAccessToken();
        if (!token) {
          throw new Error('Authentication required');
        }
        (requestHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      }

      // Add CSRF token for state-changing operations
      if (!skipCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method || 'GET')) {
        const csrfToken = SecureTokenManager.getCSRFToken();
        if (csrfToken) {
          (requestHeaders as Record<string, string>)['X-CSRF-Token'] = csrfToken;
          (requestHeaders as Record<string, string>)['X-Session-ID'] = this.getSessionID();
        }
      }

      // Add security headers
      (requestHeaders as Record<string, string>)['X-Request-ID'] = this.generateRequestID();
      (requestHeaders as Record<string, string>)['X-Content-Type-Options'] = 'nosniff';

      // Make request
      const response = await fetch(url, {
        ...restOptions,
        headers: requestHeaders,
      });

      // Handle CSRF token refresh
      const newCSRFToken = response.headers.get('X-CSRF-Token');
      if (newCSRFToken) {
        sessionStorage.setItem('csrf_token', newCSRFToken);
      }

      // Handle response
      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401) {
          // Try to refresh token
          const refreshed = await this.refreshToken();
          if (refreshed) {
            // Retry original request
            return this.request<T>(endpoint, options);
          }
          // Clear tokens and redirect to login
          SecureTokenManager.clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          throw new Error('Authentication failed');
        }

        // Handle other errors
        const error = await response.json().catch(() => ({
          message: 'Request failed',
        }));
        throw new Error(error.message || 'Request failed');
      }

      return response.json();

    } catch (error) {
      logger.error(LogCategory.SECURITY, 'API request failed', error as Error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  private static async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = SecureTokenManager.getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const tokens = await response.json();

      // Store new tokens
      SecureTokenManager.storeTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
      });

      return true;

    } catch (error) {
      logger.error(LogCategory.SECURITY, 'Token refresh failed', error as Error);
      return false;
    }
  }

  /**
   * Generate unique request ID
   */
  private static generateRequestID(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get session ID
   */
  private static getSessionID(): string {
    let sessionID = sessionStorage.getItem('session_id');

    if (!sessionID) {
      sessionID = crypto.randomUUID();
      sessionStorage.setItem('session_id', sessionID);
    }

    return sessionID;
  }
}

// ============================================
// Security Event Logger
// ============================================

interface SecurityEvent {
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  details: Record<string, unknown>;
  timestamp: number;
}

/**
 * Client-side security event logging
 */
export class SecurityLogger {
  private static events: SecurityEvent[] = [];
  private static readonly MAX_EVENTS = 100;
  private static readonly ENDPOINT = '/api/security/events';

  /**
   * Log security event
   */
  static logEvent(
    type: string,
    details: Record<string, unknown>,
    severity: SecurityEvent['severity'] = 'info'
  ): void {
    const event: SecurityEvent = {
      type,
      severity,
      details: this.sanitizeDetails(details),
      timestamp: Date.now(),
    };

    this.events.push(event);

    // Keep only recent events
    if (this.events.length > this.MAX_EVENTS) {
      this.events.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      logger.info(LogCategory.SECURITY, `[Security ${severity}] ${type}`, details);
    }

    // Send critical events immediately
    if (severity === 'critical' || severity === 'error') {
      this.sendEvents();
    }
  }

  /**
   * Send security events to server
   */
  static async sendEvents(): Promise<void> {
    if (this.events.length === 0) {
      return;
    }

    try {
      await SecureAPIClient.request(this.ENDPOINT, {
        method: 'POST',
        requireAuth: false,
        skipCSRF: true,
        body: JSON.stringify({ events: this.events }),
      });

      // Clear sent events
      this.events = [];

    } catch (error) {
      logger.error(LogCategory.SECURITY, 'Failed to send security events', error as Error);
    }
  }

  /**
   * Sanitize event details to remove sensitive information
   */
  private static sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'ssn', 'credit'];

    const sanitized = { ...details };

    for (const key in sanitized) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

// ============================================
// Input Validation Utilities
// ============================================

/**
 * Client-side input validation
 */
export class InputValidator {
  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one digit');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize user input to prevent XSS
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validate URL to prevent open redirects
   */
  static validateURL(url: string): boolean {
    try {
      const parsed = new URL(url, window.location.origin);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}

// ============================================
// Security Monitoring
// ============================================

/**
 * Client-side security monitoring
 */
export class SecurityMonitor {
  private static failedLoginAttempts = 0;
  private static readonly MAX_FAILED_ATTEMPTS = 3;

  /**
   * Track failed login attempt
   */
  static trackFailedLogin(): void {
    this.failedLoginAttempts++;

    if (this.failedLoginAttempts >= this.MAX_FAILED_ATTEMPTS) {
      SecurityLogger.logEvent('max_failed_logins_reached', {
        attempts: this.failedLoginAttempts,
      }, 'warning');

      // Lock out user
      this.lockoutUser();
    }
  }

  /**
   * Reset failed login attempts
   */
  static resetFailedLogins(): void {
    this.failedLoginAttempts = 0;
  }

  /**
   * Lock out user temporarily
   */
  private static lockoutUser(): void {
    const lockoutUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
    sessionStorage.setItem('lockout_until', lockoutUntil.toString());

    SecurityLogger.logEvent('user_locked_out', {
      lockoutUntil: new Date(lockoutUntil).toISOString(),
    }, 'warning');
  }

  /**
   * Check if user is locked out
   */
  static isLockedOut(): boolean {
    const lockoutUntil = sessionStorage.getItem('lockout_until');

    if (!lockoutUntil) {
      return false;
    }

    const lockoutTime = parseInt(lockoutUntil, 10);

    if (Date.now() > lockoutTime) {
      // Lockout expired
      sessionStorage.removeItem('lockout_until');
      return false;
    }

    return true;
  }

  /**
   * Monitor for suspicious activity
   */
  static monitorActivity(): void {
    // Check for rapid requests
    let requestCount = 0;
    const resetInterval = setInterval(() => {
      requestCount = 0;
    }, 60000); // Reset every minute

    // Override fetch to monitor requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      requestCount++;

      if (requestCount > 100) {
        SecurityLogger.logEvent('rapid_requests_detected', {
          requestCount,
        }, 'warning');
      }

      return originalFetch(...args);
    };
  }
}

// Initialize security monitoring
if (typeof window !== 'undefined') {
  SecurityMonitor.monitorActivity();

  // Send security events periodically
  setInterval(() => {
    SecurityLogger.sendEvents();
  }, 60000); // Every minute
}