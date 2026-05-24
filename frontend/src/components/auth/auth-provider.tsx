/**
 * Authentication Provider for managing user authentication state
 */

"use client";

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { getUserData, clearAuthData } from '@/lib/auth';
import { logger, LogCategory } from '@/lib/logger';

interface AuthProviderProps {
  children: ReactNode;
}

// Routes that don't require authentication
const publicRoutes = ['/', '/login', '/signup'];
// Routes that require authentication
const protectedRoutes = ['/dashboard', '/editor', '/upload', '/jd-input'];

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const setUser = useAppStore((state) => state.setUser);
  const logout = useAppStore((state) => state.logout);

  useEffect(() => {
    // Check for stored auth data on mount
    const userData = getUserData();
    if (userData && !isAuthenticated) {
      setUser(userData);
      logger.info(LogCategory.AUTH, 'User restored from storage', { email: userData.email });
    }
  }, [isAuthenticated, setUser]);

  useEffect(() => {
    // Check if current route requires authentication
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    if (isProtectedRoute && !isAuthenticated) {
      logger.info(LogCategory.AUTH, 'Redirecting unauthenticated user to login');
      router.push('/login');
    } else if (isPublicRoute && isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
      // Redirect authenticated users away from login/signup pages
      logger.info(LogCategory.AUTH, 'Redirecting authenticated user to dashboard');
      router.push('/dashboard');
    }
  }, [pathname, isAuthenticated, router]);

  // Make logout function available globally
  useEffect(() => {
    const handleLogout = () => {
      clearAuthData();
      logout();
      logger.info(LogCategory.AUTH, 'User logged out');
      router.push('/login');
    };

    (window as unknown as { logout: () => void }).logout = handleLogout;
  }, [logout, router]);

  return <>{children}</>;
}
