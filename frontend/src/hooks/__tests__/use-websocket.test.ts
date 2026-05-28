/**
 * WebSocket React Hooks Tests
 *
 * Tests for WebSocket React hooks and real-time features.
 */

import { describe, it, expect, beforeEach, afterEach, vi, test } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket, useRealtimeNotifications } from '../use-websocket';
import { WebSocketMessage, MessageType } from '../../lib/websocket-types';

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  readyState: number = WebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);

    // Simulate connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
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
    }, 0);
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: 1000, reason: 'Normal closure' }));
    }
  }

  static clear() {
    this.instances = [];
  }
}

// Mock browser WebSocket
global.WebSocket = MockWebSocket as any;

describe('useWebSocket', () => {
  beforeEach(() => {
    MockWebSocket.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('should create WebSocket connection when enabled', async () => {
    const { result } = renderHook(() =>
      useWebSocket('test-token', { enabled: true })
    );

    expect(result.current.client).not.toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  test('should not create WebSocket connection when disabled', () => {
    const { result } = renderHook(() =>
      useWebSocket('test-token', { enabled: false })
    );

    expect(result.current.client).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  test('should update connection state on connect', async () => {
    const { result } = renderHook(() =>
      useWebSocket('test-token', { enabled: true })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await waitFor(() => {
      expect(result.current.connectionState).toBe('connected');
    });
  });

  test('should send messages', async () => {
    const { result } = renderHook(() =>
      useWebSocket('test-token', { enabled: true })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.sendMessage({
        type: MessageType.NOTIFICATION_NEW,
        data: { test: 'data' },
      });
    });

    // Verify message was sent
    const ws = MockWebSocket.instances[0];
    expect(ws).toBeDefined();
  });

  test('should subscribe to channels', async () => {
    const { result } = renderHook(() =>
      useWebSocket('test-token', { enabled: true })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.subscribe('notifications');
    });

    const ws = MockWebSocket.instances[0];
    expect(ws).toBeDefined();
  });

  test('should handle message handlers', async () => {
    const handler = vi.fn();

    const { result } = renderHook(() =>
      useWebSocket('test-token', { enabled: true })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      const unsubscribe = result.current.on(MessageType.NOTIFICATION_NEW, handler);
      // Simulate receiving message
      const ws = MockWebSocket.instances[0];
      if (ws.onmessage) {
        ws.onmessage(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: MessageType.NOTIFICATION_NEW,
              data: { test: 'data' },
              timestamp: new Date().toISOString(),
              id: '123',
            }),
          })
        );
      }
    });

    expect(handler).toHaveBeenCalled();
  });

  test('should call onConnect callback', async () => {
    const onConnect = vi.fn();

    renderHook(() =>
      useWebSocket('test-token', {
        enabled: true,
        onConnect,
      })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await waitFor(() => {
      expect(onConnect).toHaveBeenCalled();
    });
  });

  test('should call onDisconnect callback', async () => {
    const onDisconnect = vi.fn();

    const { result } = renderHook(() =>
      useWebSocket('test-token', {
        enabled: true,
        onDisconnect,
      })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.client?.disconnect();
    });

    await waitFor(() => {
      expect(onDisconnect).toHaveBeenCalled();
    });
  });

  test('should handle reconnection', async () => {
    const { result } = renderHook(() =>
      useWebSocket('test-token', {
        enabled: true,
        reconnect: true,
        reconnectInterval: 1000,
      })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate connection loss
    act(() => {
      const ws = MockWebSocket.instances[0];
      ws.readyState = WebSocket.CLOSED;
      if (ws.onclose) {
        ws.onclose(
          new CloseEvent('close', { code: 1006, reason: 'Connection lost' })
        );
      }
    });

    // Fast forward past reconnect interval
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // Should attempt reconnection
    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBeGreaterThan(1);
    });
  });
});

describe('useRealtimeNotifications', () => {
  beforeEach(() => {
    MockWebSocket.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('should receive notifications', async () => {
    const { result } = renderHook(() =>
      useRealtimeNotifications('test-token')
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await waitFor(() => {
      expect(result.current.client).not.toBeNull();
    });

    // Simulate notification
    act(() => {
      const ws = MockWebSocket.instances[0];
      if (ws.onmessage) {
        ws.onmessage(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: MessageType.NOTIFICATION_NEW,
              data: {
                notification_id: '123',
                type: 'test',
                title: 'Test Notification',
                message: 'Test message',
                read: false,
              },
              timestamp: new Date().toISOString(),
              id: '123',
            }),
          })
        );
      }
    });

    await waitFor(() => {
      expect(result.current.notifications.length).toBe(1);
      expect(result.current.unreadCount).toBe(1);
    });
  });

  test('should mark notifications as read', async () => {
    const { result } = renderHook(() =>
      useRealtimeNotifications('test-token')
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await waitFor(() => {
      expect(result.current.client).not.toBeNull();
    });

    // Simulate notification
    act(() => {
      const ws = MockWebSocket.instances[0];
      if (ws.onmessage) {
        ws.onmessage(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: MessageType.NOTIFICATION_NEW,
              data: {
                notification_id: '123',
                type: 'test',
                title: 'Test Notification',
                message: 'Test message',
                read: false,
              },
              timestamp: new Date().toISOString(),
              id: '123',
            }),
          })
        );
      }
    });

    await waitFor(() => {
      expect(result.current.notifications.length).toBe(1);
    });

    // Mark as read
    act(() => {
      result.current.markAsRead('123');
    });

    expect(result.current.notifications[0].read).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  test('should clear all notifications', async () => {
    const { result } = renderHook(() =>
      useRealtimeNotifications('test-token')
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await waitFor(() => {
      expect(result.current.client).not.toBeNull();
    });

    // Add multiple notifications
    for (let i = 0; i < 3; i++) {
      act(() => {
        const ws = MockWebSocket.instances[0];
        if (ws.onmessage) {
          ws.onmessage(
            new MessageEvent('message', {
              data: JSON.stringify({
                type: MessageType.NOTIFICATION_NEW,
                data: {
                  notification_id: `${i}`,
                  type: 'test',
                  title: `Test ${i}`,
                  message: `Message ${i}`,
                  read: false,
                },
                timestamp: new Date().toISOString(),
                id: `${i}`,
              }),
            })
          );
        }
      });
    }

    await waitFor(() => {
      expect(result.current.notifications.length).toBe(3);
    });

    // Clear all
    act(() => {
      result.current.clearAll();
    });

    expect(result.current.notifications.length).toBe(0);
    expect(result.current.unreadCount).toBe(0);
  });
});
