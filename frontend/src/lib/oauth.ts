/**
 * OAuth utility functions for Google and GitHub authentication
 */

import { logger, LogCategory } from './logger';
import { storeTokens, storeUserData } from './auth';
import { authAPI } from './api-client';

export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  authorizationEndpoint: string;
  tokenEndpoint: string;
}

export const OAUTH_CONFIG: Record<'google' | 'github', OAuthConfig> = {
  google: {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || '',
    redirectUri: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/auth/callback/google`,
    scopes: ['openid', 'email', 'profile'],
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
  },
  github: {
    clientId: process.env.NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID || '',
    redirectUri: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/auth/callback/github`,
    scopes: ['user:email'],
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
  },
};

/**
 * Generate OAuth authorization URL
 */
export function generateOAuthAuthorizationUrl(provider: 'google' | 'github', state: string): string {
  const config = OAUTH_CONFIG[provider];

  if (!config.clientId) {
    throw new Error(`${provider} OAuth client ID is not configured`);
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state: state,
  });

  return `${config.authorizationEndpoint}?${params.toString()}`;
}

/**
 * Generate random state for OAuth security
 */
export function generateOAuthState(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

/**
 * Store OAuth state in session storage
 */
export function storeOAuthState(provider: 'google' | 'github', state: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(`oauth_state_${provider}`, state);
    sessionStorage.setItem(`oauth_timestamp_${provider}`, Date.now().toString());
  }
}

/**
 * Validate OAuth state
 */
export function validateOAuthState(provider: 'google' | 'github', state: string): boolean {
  if (typeof window === 'undefined') return false;

  const storedState = sessionStorage.getItem(`oauth_state_${provider}`);
  const timestamp = sessionStorage.getItem(`oauth_timestamp_${provider}`);

  // Clean up
  sessionStorage.removeItem(`oauth_state_${provider}`);
  sessionStorage.removeItem(`oauth_timestamp_${provider}`);

  if (!storedState || !timestamp) {
    return false;
  }

  // Check if state is expired (10 minutes)
  const elapsed = Date.now() - parseInt(timestamp);
  if (elapsed > 10 * 60 * 1000) {
    return false;
  }

  return storedState === state;
}

/**
 * Initiate OAuth login flow
 */
export async function initiateOAuthLogin(provider: 'google' | 'github'): Promise<void> {
  try {
    const state = generateOAuthState();
    storeOAuthState(provider, state);

    const authUrl = generateOAuthAuthorizationUrl(provider, state);

    logger.info(LogCategory.AUTH, `Initiating ${provider} OAuth login`, {
      provider,
      state: state.substring(0, 8) + '...',
    } as Record<string, unknown>);

    // Redirect to OAuth provider
    if (typeof window !== 'undefined') {
      window.location.href = authUrl;
    }
  } catch (error) {
    logger.error(LogCategory.AUTH, `Failed to initiate ${provider} OAuth login`, error as Error);
    throw error;
  }
}

/**
 * Handle OAuth callback
 */
export async function handleOAuthCallback(
  provider: 'google' | 'github',
  code: string,
  state: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate state to prevent CSRF attacks
    if (!validateOAuthState(provider, state)) {
      logger.error(LogCategory.AUTH, 'Invalid OAuth state', new Error('Invalid OAuth state'), {
        provider,
        state: state.substring(0, 8) + '...',
      } as Record<string, unknown>);
      return {
        success: false,
        error: 'Invalid OAuth state. Please try again.',
      };
    }

    logger.info(LogCategory.AUTH, `Processing ${provider} OAuth callback`, {
      provider,
      code: code.substring(0, 8) + '...',
    } as Record<string, unknown>);

    // Exchange code for tokens via backend
    const response = await authAPI.oauthCallback({
      code,
      redirect_uri: OAUTH_CONFIG[provider].redirectUri,
      provider,
    });

    if (response.error || !response.data) {
      logger.error(LogCategory.AUTH, `${provider} OAuth callback failed`, new Error(response.error || 'Authentication failed'), {
        error: response.error,
      } as Record<string, unknown>);
      return {
        success: false,
        error: response.error || 'Authentication failed',
      };
    }

    const { access_token, refresh_token, user_info } = response.data;

    // Store tokens
    storeTokens({
      accessToken: access_token,
      refreshToken: refresh_token,
    });

    // Store user data
    if (user_info) {
      const userData = {
        id: user_info.id,
        email: user_info.email,
        fullName: user_info.full_name,
        isActive: user_info.is_active,
      };

      storeUserData(userData);

      logger.info(LogCategory.AUTH, `User authenticated via ${provider} OAuth`, {
        userId: userData.id,
        email: userData.email,
      });
    }

    return { success: true };
  } catch (error) {
    logger.error(LogCategory.AUTH, `Error handling ${provider} OAuth callback`, error as Error);
    return {
      success: false,
      error: 'Authentication failed. Please try again.',
    };
  }
}

/**
 * Check if OAuth provider is configured
 */
export function isOAuthProviderConfigured(provider: 'google' | 'github'): boolean {
  const config = OAUTH_CONFIG[provider];
  return Boolean(config.clientId);
}

/**
 * Get available OAuth providers
 */
export function getAvailableOAuthProviders(): Array<'google' | 'github'> {
  return ['google', 'github'].filter(provider =>
    isOAuthProviderConfigured(provider as 'google' | 'github')
  ) as Array<'google' | 'github'>;
}