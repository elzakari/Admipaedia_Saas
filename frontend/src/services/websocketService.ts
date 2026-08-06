import { useCallback, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_BASE_URL } from '../config/constants';
import { buildSocketAuthPayload } from './socketConnectionContext';
import { LiveLessonStats } from '../types/lesson';

// Message handler type
type SubscriptionHandler = (data: any) => void;
type GlobalMessageHandler = (event: string, data: any) => void;

// WebSocket connection status
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// Lessons namespace constant
export const LESSONS_NAMESPACE = '/ws/lessons';
const HEARTBEAT_INTERVAL_MS = 15000;

export interface LessonRoomContext {
  lesson_id?: number;
  class_id?: number;
  subject_id?: number;
  teacher_id?: number;
}

export interface LessonViewersUpdatedPayload {
  lesson_room: string;
  active_viewers: number;
  peak_viewers: number;
  timestamp: number;
}

export interface LessonLiveStartedPayload {
  lesson_id: number;
  class_id?: number;
  broadcast_id?: number;
  started_at: string;
  stream_url?: string;
}

export interface LessonSlidePostedPayload {
  lesson_id: number;
  slide_id?: string | number;
  slide_index?: number;
  content?: Record<string, unknown>;
  timestamp: string;
}

export interface LessonCommentPostedPayload {
  lesson_id: number;
  comment_id: number;
  content: string;
  author_id?: number;
  author_name?: string;
  is_approved: boolean;
  created_at: string;
}

export type ViewerUpdateCallback = (payload: LessonViewersUpdatedPayload) => void;

// WebSocket service class
class WebSocketService {
  private static instances: Map<string, WebSocketService> = new Map();
  private socket: Socket | null = null;
  private namespace: string;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private statusCallbacks = new Set<(status: ConnectionStatus) => void>();
  private globalMessageHandlers = new Set<GlobalMessageHandler>();
  private pendingSubscriptions = new Map<string, Set<SubscriptionHandler>>();
  private permanentlyDisconnected = false;
  private boundInternalListeners = false;
  private heartbeatIntervals = new Map<number, ReturnType<typeof setInterval>>();
  private viewerCallbacks = new Map<number, Set<ViewerUpdateCallback>>();

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
    if (this.permanentlyDisconnected) {
      this.setStatus('disconnected');
      return;
    }
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

    const authPayload = buildSocketAuthPayload();
    if (!authPayload) {
      console.info(`Skipping socket connection for ${this.namespace} because no valid auth token is available`);
      this.setStatus('disconnected');
      return;
    }

    // Construct full URL
    const url = `${SOCKET_BASE_URL}${this.namespace}`;

    this.socket = io(url, {
      path: '/socket.io',
      // Resilient transport order: long-polling first guarantees a working
      // handshake regardless of intermediary proxies, then the engine upgrades
      // to a real WebSocket when the intermediate path permits it.
      transports: ['polling', 'websocket'],
      upgrade: true,
      withCredentials: true,
      auth: (cb: (auth: any) => void) => {
        // Always read token + tenant/branch context fresh on each (re)connect
        // so refreshed tokens and tenancy changes take effect.
        const refreshed = buildSocketAuthPayload();
        cb(refreshed ?? {});
      },
      // Reconnect behavior uses FULL EXPONENTIAL JITTER between 1s and 30s.
      // This is the AWS/Google recommended backoff for reconnect storms so
      // thousands of concurrent browsers don't re-synchronize and produce a
      // "thundering herd" against the socket backend after a blip.
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.9,
      timeout: 20000,
      autoConnect: false,
    });

    if (!this.boundInternalListeners) {
      // Detect terminal (non-transient) auth-rejection messages returned by
      // the engine.  When we hit these, stop retrying entirely — any further
      // attempts would just waste server capacity (and trigger reconnect
      // cascade 400 loops exactly like admipaedia.easymsdigit.com saw).
      const AUTH_REJECTION_MARKERS: ReadonlyArray<RegExp> = [
        /invalid.*(token|auth)/i,
        /expired.*(token|auth)/i,
        /unauthorized/i,
        /forbidden/i,
        /authentication.*required/i,
        /jwt/i,
      ];
      const isAuthRejection = (err: any): boolean => {
        if (!err) return false;
        const raw: string = [
          (err as any)?.message,
          (err as any)?.description,
          (err as any)?.error,
          (err as any)?.name,
          String(err),
        ]
          .filter((s) => typeof s === 'string' && s)
          .join(' ');
        return AUTH_REJECTION_MARKERS.some((rx) => rx.test(raw));
      };

      this.socket.on('connect', () => {
        console.log(`Socket connected to ${this.namespace}`);
        this.attachPendingSubscriptions();
        this.setStatus('connected');
      });

      this.socket.on('disconnect', (reason) => {
        const normalReasons = ['io client disconnect', 'transport close'];
        if (normalReasons.includes(reason)) {
          console.log(`Socket disconnected from ${this.namespace}: ${reason}`);
        } else {
          console.warn(`Socket disconnected from ${this.namespace} (unexpected): ${reason}`);
        }

        if (reason !== 'io client disconnect') {
          this.setStatus('disconnected');
        }
      });

      this.socket.on('connect_error', (error: any) => {
        const safeMessage = error?.message ?? String(error ?? 'unknown');
        console.warn(`Socket connection error for ${this.namespace}: ${safeMessage}`);
        this.setStatus('error');

        // Terminal auth failure -> stop retrying.  The dashboard namespace
        // rejects auth at the Engine.IO layer via the connect_error callback
        // (bad JWT signature, expired JWT, missing tenant membership, ...).
        // In these cases every new reconnect is a new invalid handshake.
        if (isAuthRejection(error)) {
          console.warn(
            `Socket auth rejected for ${this.namespace}; stopping automatic reconnect.`,
          );
          try {
            this.socket?.io?.reconnection(false);
          } catch {
            /* older socket.io client versions expose io.opts instead */
          }
          try {
            const anySocket = this.socket as any;
            if (anySocket?.io && typeof anySocket.io.reconnection === 'function') {
              anySocket.io.reconnection(false);
            }
            if (anySocket?.opts) {
              anySocket.opts.reconnection = false;
            }
          } catch {
            /* no-op */
          }
          this.permanentlyDisconnected = true;
        }
      });

      // Capture all events and dispatch to global handlers
      this.socket.onAny((event, ...args) => {
        const data = args.length > 0 ? args[0] : null;
        this.globalMessageHandlers.forEach((handler) => handler(event, data));
      });

      this.boundInternalListeners = true;
    }

    this.socket.connect();
  }

  /**
   * Trigger a safe reconnect after tenancy/token context changes. Preserves
   * existing subscriptions but re-reads auth on the next handshake.
   */
  reconnect(): void {
    this.permanentlyDisconnected = false;
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch {
        /* no-op */
      }
      this.socket = null;
      this.boundInternalListeners = false;
    }
    this.connect();
  }

  private setStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.statusCallbacks.forEach(callback => callback(status));
  }

  private attachPendingSubscriptions(): void {
    if (!this.socket) {
      return;
    }

    this.pendingSubscriptions.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        this.socket?.on(event, handler);
      });
    });
  }

  subscribe(event: string, handler: SubscriptionHandler): () => void {
    if (!this.pendingSubscriptions.has(event)) {
      this.pendingSubscriptions.set(event, new Set());
    }
    this.pendingSubscriptions.get(event)!.add(handler);

    if (!this.socket && this.namespace && this.namespace !== '/') {
      this.connect();
    }

    if (this.socket) {
      this.socket.on(event, handler);
    }

    return () => {
      this.pendingSubscriptions.get(event)?.delete(handler);
      if (this.pendingSubscriptions.get(event)?.size === 0) {
        this.pendingSubscriptions.delete(event);
      }
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

  connectLessonsNamespace(): void {
    if (this.namespace !== LESSONS_NAMESPACE) {
      console.warn(
        `connectLessonsNamespace called on wrong namespace: ${this.namespace}. Use getInstance('${LESSONS_NAMESPACE}') instead.`
      );
      return;
    }
    this.connect();
  }

  joinLessonRoom(context: LessonRoomContext): void {
    if (!context.lesson_id && !context.class_id && !context.subject_id && !context.teacher_id) {
      console.warn('joinLessonRoom requires at least one of lesson_id/class_id/subject_id/teacher_id');
      return;
    }
    if (!this.socket?.connected) {
      this.connect();
    }
    this.send('join_room', context);
  }

  leaveLessonRoom(context: LessonRoomContext): void {
    if (!context.lesson_id && !context.class_id && !context.subject_id && !context.teacher_id) {
      console.warn('leaveLessonRoom requires at least one of lesson_id/class_id/subject_id/teacher_id');
      return;
    }
    this.send('leave_room', context);

    if (context.lesson_id) {
      this.stopHeartbeatLoop(context.lesson_id);
    }
  }

  startHeartbeatLoop(lessonId: number, onViewerUpdate: ViewerUpdateCallback): () => void {
    if (this.heartbeatIntervals.has(lessonId)) {
      if (onViewerUpdate) {
        if (!this.viewerCallbacks.has(lessonId)) {
          this.viewerCallbacks.set(lessonId, new Set());
        }
        this.viewerCallbacks.get(lessonId)!.add(onViewerUpdate);
      }
      return () => {
        this.viewerCallbacks.get(lessonId)?.delete(onViewerUpdate);
      };
    }

    if (!this.viewerCallbacks.has(lessonId)) {
      this.viewerCallbacks.set(lessonId, new Set());
    }
    if (onViewerUpdate) {
      this.viewerCallbacks.get(lessonId)!.add(onViewerUpdate);
    }

    const sendHeartbeat = () => {
      if (this.socket?.connected) {
        this.socket.emit('viewer_heartbeat', { lesson_id: lessonId });
      }
    };

    this.subscribe('lesson_viewers_updated', (data: LessonViewersUpdatedPayload) => {
      const expectedRoom = `lesson_${lessonId}`;
      if (data && data.lesson_room === expectedRoom) {
        const callbacks = this.viewerCallbacks.get(lessonId);
        if (callbacks) {
          callbacks.forEach((cb) => {
            try {
              cb(data);
            } catch (err) {
              console.error('Error in viewer update callback:', err);
            }
          });
        }
      }
    });

    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    this.heartbeatIntervals.set(lessonId, interval);

    return () => {
      this.viewerCallbacks.get(lessonId)?.delete(onViewerUpdate);
      if (this.viewerCallbacks.get(lessonId)?.size === 0) {
        this.stopHeartbeatLoop(lessonId);
      }
    };
  }

  private stopHeartbeatLoop(lessonId: number): void {
    const interval = this.heartbeatIntervals.get(lessonId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(lessonId);
    }
    this.viewerCallbacks.delete(lessonId);
  }

  onLessonLiveStarted(handler: (data: LessonLiveStartedPayload) => void): () => void {
    return this.subscribe('lesson_live_started', handler);
  }

  onLessonSlidePosted(handler: (data: LessonSlidePostedPayload) => void): () => void {
    return this.subscribe('lesson_slide_posted', handler);
  }

  onLessonCommentPosted(handler: (data: LessonCommentPostedPayload) => void): () => void {
    return this.subscribe('lesson_comment_posted', handler);
  }

  onLessonViewersUpdated(lessonId: number, handler: ViewerUpdateCallback): () => void {
    return this.subscribe('lesson_viewers_updated', (data: LessonViewersUpdatedPayload) => {
      const expectedRoom = `lesson_${lessonId}`;
      if (data && data.lesson_room === expectedRoom) {
        handler(data);
      }
    });
  }

  disconnect(): void {
    this.heartbeatIntervals.forEach((interval) => clearInterval(interval));
    this.heartbeatIntervals.clear();
    this.viewerCallbacks.clear();

    this.permanentlyDisconnected = true;
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch {
        /* no-op */
      }
      this.socket = null;
      this.boundInternalListeners = false;
    }
    this.globalMessageHandlers.clear();
    this.setStatus('disconnected');
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
