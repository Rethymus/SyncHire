"use client";


import { useState, useEffect } from 'react';

export default function TestI18nPage() {
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
    try {
      // Dynamically import next-intl only on client side
      require('next-intl');
    } catch (err) {
      setError('i18n not configured - this page requires next-intl provider setup');
    }
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">i18n Test Page</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">{error}</p>
            <p className="text-red-600 mt-2">This page is only available when i18n is properly configured.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">i18n Test Page</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600">i18n functionality is available. Please configure next-intl provider to use this page.</p>
        </div>
      </div>
    </div>
  );
}