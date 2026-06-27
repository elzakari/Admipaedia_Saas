import { useCallback, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_BASE_URL } from '../config/constants';

// Message handler type
type SubscriptionHandler = (data: any) => void;
type GlobalMessageHandler = (event: string, data: any) => void;

// WebSocket connection status
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// WebSocket service class
class WebSocketService {
  private static instances: Map<string, WebSocketService> = new Map();
  private socket: Socket | null = null;
  private namespace: string;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private statusCallbacks = new Set<(status: ConnectionStatus) => void>();
  private globalMessageHandlers = new Set<GlobalMessageHandler>();

  private constructor(namespace: string = '/') {
    this.namespace = namespace;
  }

  public static getInstance(namespace: string = '/'): WebSocketService {
    if (!WebSocketService.instances.has(namespace)) {
      WebSocketService.instances.set(namespace, new WebSocketService(namespace));
    }
    return WebSocketService.instances.get(namespace)!;
  }

  connect(): void {
    if (this.socket?.connected || this.connectionStatus === 'connecting') {
      return;
    }

    // The backend does not expose a generic root namespace; skip stray callers
    // instead of generating repeated production handshake failures.
    if (!this.namespace || this.namespace === '/') {
      console.info('Skipping unsupported root socket namespace connection');
      this.setStatus('disconnected');
      return;
    }

    this.setStatus('connecting');

    // Get token from localStorage
    const token = localStorage.getItem('token');

    // Construct full URL
    const url = `${SOCKET_BASE_URL}${this.namespace}`;

    this.socket = io(url, {
      path: '/socket.io',
      auth: { token },
      query: token ? { token } : {},
      transports: ['websocket', 'polling'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15000,
      timeout: 20000,
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log(`✅ Socket connected to ${this.namespace}`);
      this.setStatus('connected');
    });

    this.socket.on('disconnect', (reason) => {
      // Don't log as an error if it's a normal disconnect or page reload
      if (reason === 'io client disconnect' || reason === 'transport close') {
        console.log(`ℹ️ Socket disconnected from ${this.namespace}:`, reason);
      } else {
        console.warn(`⚠️ Socket disconnected from ${this.namespace} (unexpected):`, reason);
      }
      
      // Only set status if we didn't explicitly disconnect
      if (reason !== 'io client disconnect') {
        this.setStatus('disconnected');
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error(`❌ Socket connection error for ${this.namespace}:`, error);
      this.setStatus('error');
    });

    // Capture all events and dispatch to global handlers
    this.socket.onAny((event, ...args) => {
      const data = args.length > 0 ? args[0] : null;
      this.globalMessageHandlers.forEach(handler => handler(event, data));
    });
  }

  private setStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.statusCallbacks.forEach(callback => callback(status));
  }

  subscribe(event: string, handler: SubscriptionHandler): () => void {
    if (!this.socket && this.namespace && this.namespace !== '/') {
      this.connect();
    }

    if (this.socket) {
      this.socket.on(event, handler);
    } else {
      console.warn(`Socket subscription skipped for unsupported namespace ${this.namespace}:`, event);
    }

    return () => {
      this.socket?.off(event, handler);
    };
  }

  addGlobalMessageHandler(handler: GlobalMessageHandler): () => void {
    this.globalMessageHandlers.add(handler);
    return () => {
      this.globalMessageHandlers.delete(handler);
    };
  }

  send(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot send message');
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.globalMessageHandlers.clear();
  }

  getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusCallbacks.add(callback);
    callback(this.connectionStatus);
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }
}

// React hook for WebSocket
export const useWebSocket = (namespace: string = '/', options?: {
  enabled?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (event: string, data: any) => void;
}) => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const ws = WebSocketService.getInstance(namespace);

  useEffect(() => {
    if (options?.enabled === false) {
      setStatus('disconnected');
      setIsConnected(false);
      return;
    }

    const unsubscribeStatus = ws.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setIsConnected(newStatus === 'connected');
      if (newStatus === 'connected') {
        setError(null);
      }
      if (newStatus === 'error') {
        setError((prev) => prev ?? new Error('WebSocket connection error'));
      }

      if (newStatus === 'connected' && options?.onConnect) {
        options.onConnect();
      } else if (newStatus === 'disconnected' && options?.onDisconnect) {
        options.onDisconnect();
      }
    });

    let unsubscribeMessage: (() => void) | undefined;
    if (options?.onMessage) {
      unsubscribeMessage = ws.addGlobalMessageHandler(options.onMessage);
    }

    // Connect if not connected
    ws.connect();

    return () => {
      unsubscribeStatus();
      if (unsubscribeMessage) {
        unsubscribeMessage();
      }
      // Note: We don't disconnect globally here as other components might use it
      // we only cleanup listeners.
    };
  }, [namespace, options?.enabled, options?.onConnect, options?.onDisconnect, options?.onMessage]);

  const subscribe = useCallback((event: string, handler: SubscriptionHandler) => {
    return ws.subscribe(event, handler);
  }, [ws]);

  const sendMessage = useCallback((event: string, data: any) => {
    ws.send(event, data);
  }, [ws]);

  const socketAdapter = {
    emit: (event: string, ...args: any[]) => {
      if (args.length > 0) {
        sendMessage(event, args[0]);
      } else {
        sendMessage(event, null);
      }
    },
    on: subscribe,
    off: () => { },
  };

  return {
    status,
    isConnected,
    error,
    socket: socketAdapter,
    subscribe,
    sendMessage,
  };
};

export default WebSocketService;
