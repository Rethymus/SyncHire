/**
 * Authentication utilities for token storage and validation
 */

import { logger, LogCategory } from './logger';

const TOKEN_STORAGE_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_DATA_KEY = 'user_data';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserData {
  id: string;
  email: string;
  fullName?: string;
  isActive: boolean;
}

/**
 * Store authentication tokens in localStorage
 */
export function storeTokens(tokens: AuthTokens): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_STORAGE_KEY, tokens.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
      logger.info(LogCategory.AUTH, 'Tokens stored successfully');
    }
  } catch (error) {
    logger.error(LogCategory.AUTH, 'Failed to store tokens', error as Error);
  }
}

/**
 * Get stored access token
 */
export function getAccessToken(): string | null {
  try {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    }
    return null;
  } catch (error) {
    logger.error(LogCategory.AUTH, 'Failed to get access token', error as Error);
    return null;
  }
}

/**
 * Get stored refresh token
 */
export function getRefreshToken(): string | null {
  try {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return null;
  } catch (error) {
    logger.error(LogCategory.AUTH, 'Failed to get refresh token', error as Error);
    return null;
  }
}

/**
 * Store user data
 */
export function storeUserData(userData: UserData): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
      logger.info(LogCategory.AUTH, 'User data stored successfully');
    }
  } catch (error) {
    logger.error(LogCategory.AUTH, 'Failed to store user data', error as Error);
  }
}

/**
 * Get stored user data
 */
export function getUserData(): UserData | null {
  try {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(USER_DATA_KEY);
      return data ? JSON.parse(data) : null;
    }
    return null;
  } catch (error) {
    logger.error(LogCategory.AUTH, 'Failed to get user data', error as Error);
    return null;
  }
}

/**
 * Clear all authentication data
 */
export function clearAuthData(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_DATA_KEY);
      logger.info(LogCategory.AUTH, 'Auth data cleared successfully');
    }
  } catch (error) {
    logger.error(LogCategory.AUTH, 'Failed to clear auth data', error as Error);
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  const userData = getUserData();
  return !!(token && userData);
}

/**
 * Get authorization header for API requests
 */
export function getAuthHeader(): { Authorization: string } | {} {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Decode JWT token (without verification - for getting user ID)
 */
export function decodeToken(token: string): { sub?: string; exp?: number } | null {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch (error) {
    logger.error(LogCategory.AUTH, 'Failed to decode token', error as Error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }
  const expirationTime = decoded.exp * 1000; // Convert to milliseconds
  return Date.now() >= expirationTime;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    const newTokens: AuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };

    storeTokens(newTokens);
    return newTokens.accessToken;
  } catch (error) {
    logger.error(LogCategory.AUTH, 'Failed to refresh token', error as Error);
    clearAuthData();
    return null;
  }
}
