/**
 * WebSocket Connection Status Component
 *
 * Displays real-time connection status and provides controls for WebSocket management.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { useWebSocketClient, useWebSocketState } from '@/lib/websocket-client';
import { useAuthStore } from '@/lib/auth-store';

interface WebSocketStatusProps {
  className?: string;
}

export function WebSocketStatus({ className = '' }: WebSocketStatusProps) {
  const { token } = useAuthStore();
  const [showDetails, setShowDetails] = useState(false);
  const connectionState = useWebSocketState();

  // Initialize WebSocket connection
  useWebSocketClient({
    token: token || '',
  });

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'text-green-500';
      case 'connecting':
        return 'text-yellow-500';
      case 'disconnected':
        return 'text-gray-500';
      default:
        return 'text-red-500';
    }
  };

  const getStatusIcon = () => {
    switch (connectionState) {
      case 'connected':
        return <Wifi className="h-4 w-4" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4" />;
      default:
        return <WifiOff className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Error';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 ${getStatusColor()} ${className}`}>
            {getStatusIcon()}
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-2">
            <p className="font-medium">Real-time Updates</p>
            <p className="text-sm text-muted-foreground">
              Status: {getStatusText()}
            </p>
            <p className="text-xs text-muted-foreground">
              {connectionState === 'connected' &&
                'You will receive live updates for notifications, applications, and interviews.'}
              {connectionState === 'connecting' &&
                'Establishing real-time connection...'}
              {connectionState === 'disconnected' &&
                'Real-time updates are disabled. Some features may have delays.'}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Enhanced WebSocket Status Component with Reconnect Control
 */
export function WebSocketStatusControl() {
  const { token } = useAuthStore();
  const [forceReconnect, setForceReconnect] = useState(false);
  const connectionState = useWebSocketState();

  const handleReconnect = () => {
    setForceReconnect(true);
    setTimeout(() => setForceReconnect(false), 1000);
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-card rounded-lg border">
      <WebSocketStatus />
      {connectionState !== 'connected' && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleReconnect}
          disabled={connectionState === 'connecting'}
        >
          {connectionState === 'connecting' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4 mr-2" />
              Reconnect
            </>
          )}
        </Button>
      )}
    </div>
  );
}

/**
 * Real-time Notification Bell with WebSocket Updates
 */
export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const { token } = useAuthStore();

  useWebSocketClient({
    token: token || '',
  });

  useEffect(() => {
    // Subscribe to notification updates
    // This will be handled by the WebSocket client
    // and update the unread count via React Query
    const unsubscribe = () => {
      // Cleanup handled by WebSocket client
    };

    return unsubscribe;
  }, [token]);

  return (
    <div className="relative">
      <button className="p-2 hover:bg-accent rounded-lg transition-colors">
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}