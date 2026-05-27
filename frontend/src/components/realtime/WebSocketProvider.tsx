/**
 * WebSocket Provider Component
 *
 * Context provider for WebSocket connection management across the app.
 */

'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useWebSocket } from '../../hooks/use-websocket';
import { useAuthStore } from '../../lib/auth-store';

interface WebSocketContextType {
  isConnected: boolean;
  connectionId: string | null;
  sendMessage: (message: any) => void;
  subscribe: (subscription: string) => void;
  unsubscribe: (subscription: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error(
      'useWebSocketContext must be used within a WebSocketProvider'
    );
  }
  return context;
}

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const token = useAuthStore((state) => state.token);

  const { isConnected, connectionId, sendMessage, subscribe, unsubscribe } =
    useWebSocket(token, {
      enabled: !!token,
      onConnect: () => {
        console.log('[WebSocketProvider] Connected');
      },
      onDisconnect: () => {
        console.log('[WebSocketProvider] Disconnected');
      },
      onError: (error) => {
        console.error('[WebSocketProvider] Error:', error);
      },
    });

  // Subscribe to default channels when connected
  useEffect(() => {
    if (isConnected) {
      subscribe('notifications');
      subscribe('updates');
    }
  }, [isConnected, subscribe]);

  const value = {
    isConnected,
    connectionId,
    sendMessage,
    subscribe,
    unsubscribe,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}
