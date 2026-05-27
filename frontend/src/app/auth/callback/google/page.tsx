/**
 * OAuth callback handler for Google authentication
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { handleOAuthCallback } from '@/lib/oauth';
import { logger, LogCategory } from '@/lib/logger';

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        logger.error(LogCategory.AUTH, 'Google OAuth error', new Error(errorParam), {
          error: errorParam,
        } as Record<string, unknown>);
        setStatus('error');
        setError(errorParam === 'access_denied' ? '用户拒绝了授权请求' : 'Google 认证失败');
        setTimeout(() => router.push('/login'), 3000);
        return;
      }

      if (!code || !state) {
        logger.error(LogCategory.AUTH, 'Missing OAuth parameters', new Error('Missing OAuth parameters'), {
          hasCode: !!code,
          hasState: !!state,
        } as Record<string, unknown>);
        setStatus('error');
        setError('缺少必要的 OAuth 参数');
        setTimeout(() => router.push('/login'), 3000);
        return;
      }

      try {
        const result = await handleOAuthCallback('google', code, state);

        if (result.success) {
          setStatus('success');
          logger.info(LogCategory.AUTH, 'Google OAuth authentication successful');
          setTimeout(() => router.push('/dashboard'), 1000);
        } else {
          setStatus('error');
          setError(result.error || 'Google 认证失败');
          setTimeout(() => router.push('/login'), 3000);
        }
      } catch (error) {
        logger.error(LogCategory.AUTH, 'Error in Google OAuth callback', error as Error);
        setStatus('error');
        setError('Google 认证过程中出现错误');
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <svg className="animate-spin h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">正在使用 Google 登录...</h2>
            <p className="text-gray-600">请稍候，我们正在验证您的身份</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <svg className="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">登录成功！</h2>
            <p className="text-gray-600">正在跳转到您的仪表板...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <svg className="h-12 w-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">登录失败</h2>
            <p className="text-gray-600">{error || 'Google 认证失败，请重试'}</p>
            <p className="text-sm text-gray-500">3秒后自动返回登录页面...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="space-y-4">
            <div className="flex justify-center">
              <svg className="animate-spin h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">加载中...</h2>
          </div>
        </div>
      </div>
    }>
      <GoogleCallbackContent />
    </Suspense>
  );
}