/**
 * WebSocket Client for Real-time Features
 *
 * Manages WebSocket connections for real-time notifications and updates.
 */

import { WebSocketMessage, MessageType, ConnectionState } from './websocket-types';

export interface WebSocketConfig {
  url: string;
  token: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export interface MessageHandler {
  (message: WebSocketMessage): void;
}

export interface ConnectionChangeHandler {
  (state: ConnectionState): void;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private messageHandlers: Map<MessageType, Set<MessageHandler>> = new Map();
  private connectionHandlers: Set<ConnectionChangeHandler> = new Set();
  private connectionId: string | null = null;
  private isIntentionalClose = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...config,
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('[WebSocket] Already connected');
      return;
    }

    try {
      const wsUrl = `${this.config.url}?token=${encodeURIComponent(this.config.token)}`;
      this.ws = new WebSocket(wsUrl);
      this.isIntentionalClose = false;

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);

      console.log('[WebSocket] Connecting to', wsUrl);
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.notifyConnectionChange('error');
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isIntentionalClose = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.reconnectAttempts = 0;
  }

  /**
   * Send a message to the server
   */
  send(message: Partial<WebSocketMessage>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send message: not connected');
      return;
    }

    const fullMessage: WebSocketMessage = {
      type: message.type || MessageType.SYSTEM_MESSAGE,
      data: message.data || {},
      timestamp: new Date().toISOString(),
      id: message.id || crypto.randomUUID(),
      ...message,
    };

    this.ws.send(JSON.stringify(fullMessage));
  }

  /**
   * Subscribe to a topic/channel
   */
  subscribe(subscription: string): void {
    this.send({
      type: 'subscribe' as MessageType,
      data: { subscription },
    });
  }

  /**
   * Unsubscribe from a topic/channel
   */
  unsubscribe(subscription: string): void {
    this.send({
      type: 'unsubscribe' as MessageType,
      data: { subscription },
    });
  }

  /**
   * Register a message handler for specific message type
   */
  on(messageType: MessageType, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    this.messageHandlers.get(messageType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.off(messageType, handler);
    };
  }

  /**
   * Unregister a message handler
   */
  off(messageType: MessageType, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Register a connection state change handler
   */
  onConnectionChange(handler: ConnectionChangeHandler): () => void {
    this.connectionHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    if (!this.ws) return 'disconnected';

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'disconnecting';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'disconnected';
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.getConnectionState() === 'connected';
  }

  /**
   * Get connection ID
   */
  getConnectionId(): string | null {
    return this.connectionId;
  }

  private handleOpen(): void {
    console.log('[WebSocket] Connected');
    this.reconnectAttempts = 0;
    this.notifyConnectionChange('connected');

    // Start heartbeat
    this.startHeartbeat();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      // Handle connection message
      if (message.type === MessageType.CONNECT) {
        this.connectionId = message.data.connection_id;
        console.log('[WebSocket] Connection ID:', this.connectionId);
      }

      // Handle heartbeat
      if (message.type === MessageType.HEARTBEAT) {
        // Respond to server heartbeat
        this.send({
          type: MessageType.HEARTBEAT,
          data: {
            timestamp: new Date().toISOString(),
            connection_id: this.connectionId,
          },
        });
        return;
      }

      // Call registered handlers
      const handlers = this.messageHandlers.get(message.type);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(message);
          } catch (error) {
            console.error('[WebSocket] Handler error:', error);
          }
        });
      }

      // Log message (for debugging)
      console.log('[WebSocket] Received:', message.type, message.data);
    } catch (error) {
      console.error('[WebSocket] Message parsing error:', error);
    }
  }

  private handleError(error: Event): void {
    console.error('[WebSocket] Error:', error);
    this.notifyConnectionChange('error');
  }

  private handleClose(event: CloseEvent): void {
    console.log('[WebSocket] Disconnected:', event.code, event.reason);
    this.notifyConnectionChange('disconnected');

    // Clear heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Attempt reconnection if not intentional
    if (!this.isIntentionalClose && this.config.reconnect) {
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.notifyConnectionChange('failed');
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `[WebSocket] Reconnecting in ${this.config.reconnectInterval}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.notifyConnectionChange('connecting');
      this.connect();
    }, this.config.reconnectInterval);
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: MessageType.HEARTBEAT,
          data: {
            timestamp: new Date().toISOString(),
            connection_id: this.connectionId,
          },
        });
      }
    }, this.config.heartbeatInterval);
  }

  private notifyConnectionChange(state: ConnectionState): void {
    this.connectionHandlers.forEach((handler) => {
      try {
        handler(state);
      } catch (error) {
        console.error('[WebSocket] Connection handler error:', error);
      }
    });
  }
}

/**
 * Create a WebSocket client instance
 */
export function createWebSocketClient(config: WebSocketConfig): WebSocketClient {
  return new WebSocketClient(config);
}
