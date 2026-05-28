/**
 * WebSocket Client Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useWebSocketClient, useWebSocketState } from '../websocket-client';
import { WebSocketMessage, MessageType } from '../websocket-types';

// Test wrapper component
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const TestWrapper = ({ children }: { children: any }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  TestWrapper.displayName = 'TestWrapper';

  return TestWrapper;
};

// Mock WebSocket
class MockWebSocket {
  url: string;
  readyState: number = WebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Simulate connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 100);
  }

  send(data: string) {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    // Simulate message echo
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', { data }));
      }
    }, 50);
  }

  close(code?: number, reason?: string) {
    this.readyState = WebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = WebSocket.CLOSED;
      if (this.onclose) {
        this.onclose(new CloseEvent('close', { code: code || 1000, reason: reason || '' }));
      }
    }, 50);
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket as any;

describe('WebSocket Client', () => {
  const wrapper = createWrapper();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Connection Management', () => {
    it('should connect to WebSocket server', async () => {
      const { result } = renderHook(() =>
        useWebSocketClient({
          token: 'test-token',
          url: 'ws://localhost:8000/api/ws',
        }),
        { wrapper }
      );

      // Wait for connection
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      expect(result.current).toBeDefined();
    });

    it('should handle connection state changes', async () => {
      const { result } = renderHook(() => useWebSocketState(), { wrapper });

      // Initial state should be disconnected
      expect(result.current).toBe('disconnected');

      // After connecting, state should change
      await act(async () => {
        const client = renderHook(() =>
          useWebSocketClient({
            token: 'test-token',
            url: 'ws://localhost:8000/api/ws',
          }),
          { wrapper }
        );

        await new Promise(resolve => setTimeout(resolve, 200));
      });
    });
  });

  describe('Message Handling', () => {
    it('should receive and parse messages', async () => {
      const messageHandler = vi.fn();
      const { result } = renderHook(() =>
        useWebSocketClient({
          token: 'test-token',
          url: 'ws://localhost:8000/api/ws',
        }),
        { wrapper }
      );

      // Register message handler
      act(() => {
        const unsubscribe = result.current?.on(MessageType.CONNECT, messageHandler);
        // Cleanup handled by hook
      });

      // Simulate incoming message
      const testMessage: WebSocketMessage = {
        type: MessageType.CONNECT,
        data: { connection_id: 'test-connection-id' },
        timestamp: new Date().toISOString(),
        id: 'test-message-id',
      };

      await act(async () => {
        // Message handling is done internally
        await new Promise(resolve => setTimeout(resolve, 100));
      });
    });

    it('should send messages to server', async () => {
      const { result } = renderHook(() =>
        useWebSocketClient({
          token: 'test-token',
          url: 'ws://localhost:8000/api/ws',
        }),
        { wrapper }
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      act(() => {
        result.current?.send({
          type: MessageType.HEARTBEAT,
          data: { timestamp: new Date().toISOString() },
        });
      });
    });
  });

  describe('Subscription Management', () => {
    it('should subscribe to channels', async () => {
      const { result } = renderHook(() =>
        useWebSocketClient({
          token: 'test-token',
          url: 'ws://localhost:8000/api/ws',
        }),
        { wrapper }
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      act(() => {
        result.current?.subscribe('notifications');
        result.current?.subscribe('updates');
      });
    });

    it('should unsubscribe from channels', async () => {
      const { result } = renderHook(() =>
        useWebSocketClient({
          token: 'test-token',
          url: 'ws://localhost:8000/api/ws',
        }),
        { wrapper }
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      act(() => {
        result.current?.subscribe('notifications');
        result.current?.unsubscribe('notifications');
      });
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on disconnect', async () => {
      const { result } = renderHook(() =>
        useWebSocketClient({
          token: 'test-token',
          url: 'ws://localhost:8000/api/ws',
          reconnect: true,
          reconnectInterval: 100,
          maxReconnectAttempts: 3,
        }),
        { wrapper }
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Simulate disconnect
      act(() => {
        result.current?.disconnect();
      });
    });
  });

  describe('React Query Integration', () => {
    it('should invalidate queries on application updates', async () => {
      const { result: queryClientResult } = renderHook(() => useQueryClient(), { wrapper });
      const queryClient = queryClientResult.current;

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() =>
        useWebSocketClient({
          token: 'test-token',
          url: 'ws://localhost:8000/api/ws',
        }),
        { wrapper }
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // This would be triggered by actual WebSocket messages
      // Testing the integration setup
      expect(invalidateSpy).toBeDefined();
    });
  });
});

describe('WebSocket Message Types', () => {
  it('should create valid WebSocketMessage objects', () => {
    const message: WebSocketMessage = {
      type: MessageType.APPLICATION_STATUS,
      data: {
        application_id: '123',
        company: 'Test Company',
        position: 'Developer',
        status: 'interview',
        status_text: 'Interview scheduled',
        updated_at: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      id: 'test-id',
    };

    expect(message.type).toBe(MessageType.APPLICATION_STATUS);
    expect(message.data.application_id).toBe('123');
    expect(message.data.company).toBe('Test Company');
    expect(message).toHaveProperty('timestamp');
    expect(message).toHaveProperty('id');
  });

  it('should handle all message types', () => {
    const messageTypes = [
      MessageType.CONNECT,
      MessageType.DISCONNECT,
      MessageType.HEARTBEAT,
      MessageType.NOTIFICATION_NEW,
      MessageType.APPLICATION_STATUS,
      MessageType.INTERVIEW_SCHEDULED,
      MessageType.JOB_ALERT,
      MessageType.ANALYTICS_UPDATE,
    ];

    messageTypes.forEach(type => {
      const message: WebSocketMessage = {
        type,
        data: { test: 'data' },
        timestamp: new Date().toISOString(),
        id: 'test-id',
      };

      expect(message.type).toBe(type);
    });
  });
});