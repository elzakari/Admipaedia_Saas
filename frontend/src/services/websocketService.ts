import { useCallback, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/constants';

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

    this.setStatus('connecting');

    // Get token from localStorage
    const token = localStorage.getItem('token');

    // Construct full URL
    const url = `${API_BASE_URL}${this.namespace}`;

    this.socket = io(url, {
      auth: { token },
      query: token ? { token } : {},
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
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
    // If socket is already initialized, register immediately
    // If not, we might lose it if we don't store it?
    // But connect() creates the socket.
    // Ideally subscribe should be called after connect or we should store pending handlers.
    // For simplicity, we assume connect has been called.
    if (this.socket) {
      this.socket.on(event, handler);
    } else {
      console.warn('Socket not initialized when subscribing to', event);
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
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (event: string, data: any) => void;
}) => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const ws = WebSocketService.getInstance(namespace);

  useEffect(() => {
    const unsubscribeStatus = ws.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setIsConnected(newStatus === 'connected');

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
  }, [namespace, options?.onConnect, options?.onDisconnect, options?.onMessage]);

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
    socket: socketAdapter,
    subscribe,
    sendMessage,
  };
};

export default WebSocketService;
