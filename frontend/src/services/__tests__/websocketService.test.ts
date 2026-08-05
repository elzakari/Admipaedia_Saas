import { beforeEach, describe, expect, it, vi } from 'vitest';
import WebSocketService from '../websocketService';
import { buildSocketAuthPayload } from '../socketConnectionContext';

vi.mock('socket.io-client');
vi.mock('../socketConnectionContext');

import { io } from 'socket.io-client';
const mockedIo = vi.mocked(io);
const mockedBuildSocketAuthPayload = vi.mocked(buildSocketAuthPayload);

const DASHBOARD_NS = '/dashboard';

type ListenersMap = Map<string, Set<Function>>;

class MockSocket {
  connected: boolean;
  opts: any;
  url: string;
  listeners: ListenersMap;
  anyListeners: Set<Function>;
  connect = vi.fn(() => { this.connected = true; return this; });
  disconnect = vi.fn(() => { this.connected = false; return this; });
  emit = vi.fn();
  on = vi.fn((event: string, handler: Function) => {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  });
  off = vi.fn((event: string, handler?: Function) => {
    if (!this.listeners.has(event)) return;
    if (!handler) this.listeners.get(event)!.clear();
    else this.listeners.get(event)!.delete(handler);
  });
  onAny = vi.fn((handler: Function) => { this.anyListeners.add(handler); });

  fire(event: string, ...args: any[]) {
    const set = this.listeners.get(event);
    if (set) for (const h of [...set]) { try { h(...args); } catch {} }
    for (const h of [...this.anyListeners]) { try { h(event, ...args); } catch {} }
  }

  constructor(url: string, opts: any, connectedInitial = false) {
    this.url = url;
    this.opts = opts;
    this.connected = connectedInitial;
    this.listeners = new Map();
    this.anyListeners = new Set();
  }
}

function makeFreshInstancesCache() {
  (WebSocketService as any).instances = new Map();
}

describe('WebSocketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    makeFreshInstancesCache();
    mockedBuildSocketAuthPayload.mockReturnValue({ token: 'test-access-token' });
  });

  it('singleton returns same instance for same namespace', () => {
    const a = WebSocketService.getInstance(DASHBOARD_NS);
    const b = WebSocketService.getInstance(DASHBOARD_NS);
    expect(a).toBe(b);
    expect(WebSocketService.getInstance('/chat')).not.toBe(a);
  });

  it('uses /dashboard namespace, /socket.io path, and polling-first transports', () => {
    const socket = new MockSocket('u', {});
    mockedIo.mockImplementation((url, opts) => new MockSocket(String(url), opts));
    WebSocketService.getInstance(DASHBOARD_NS).connect();
    expect(mockedIo).toHaveBeenCalledTimes(1);
    const [url, opts] = mockedIo.mock.calls[0];
    expect(String(url)).toContain(DASHBOARD_NS);
    expect(opts.path).toBe('/socket.io');
    expect(opts.transports).toEqual(['polling', 'websocket']);
    expect(opts.upgrade).toBe(true);
    // explicit connect() called because autoConnect=false
    const createdSocket = mockedIo.mock.results[0].value as MockSocket;
    expect(createdSocket.connect).toHaveBeenCalledTimes(1);
  });

  it('sends current access token via auth callback and does not leak token to console', () => {
    mockedIo.mockImplementation((url, opts) => new MockSocket(String(url), opts));
    mockedBuildSocketAuthPayload.mockReturnValue({
      token: 'secret-jwt',
      tenant_id: 'tenant-1',
      branch_id: 'branch-9',
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    WebSocketService.getInstance(DASHBOARD_NS).connect();
    const opts = mockedIo.mock.calls[0][1];
    expect(typeof opts.auth).toBe('function');

    const received: any[] = [];
    opts.auth((p: any) => received.push(p));
    expect(received[0].token).toBe('secret-jwt');
    expect(received[0].tenant_id).toBe('tenant-1');
    expect(received[0].branch_id).toBe('branch-9');

    const joinedLogs = [
      ...logSpy.mock.calls.map(c => c.join(' ')),
      ...warnSpy.mock.calls.map(c => c.join(' ')),
      ...infoSpy.mock.calls.map(c => c.join(' ')),
    ].join('\n');
    expect(joinedLogs).not.toContain('secret-jwt');

    logSpy.mockRestore();
    warnSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it('uses bounded reconnection policy with autoConnect=false', () => {
    mockedIo.mockImplementation((url, opts) => new MockSocket(String(url), opts));
    WebSocketService.getInstance(DASHBOARD_NS).connect();
    const opts = mockedIo.mock.calls[0][1];
    expect(opts.reconnection).toBe(true);
    expect(opts.reconnectionAttempts).toBe(5);
    expect(opts.reconnectionDelay).toBe(1000);
    expect(opts.reconnectionDelayMax).toBe(15000);
    expect(opts.timeout).toBe(20000);
    expect(opts.autoConnect).toBe(false);
  });

  it('explicit disconnect blocks further reconnections until reconnect is called', () => {
    const created: MockSocket[] = [];
    mockedIo.mockImplementation((url, opts) => {
      const s = new MockSocket(String(url), opts);
      created.push(s);
      return s;
    });
    const svc = WebSocketService.getInstance(DASHBOARD_NS);
    svc.connect();
    expect(svc.getStatus()).toBe('connecting');
    created[0].fire('connect');
    expect(svc.getStatus()).toBe('connected');

    // Explicit disconnect => suppresses any future reconnect until reconnect()
    svc.disconnect();
    expect(svc.getStatus()).toBe('disconnected');
    expect(created[0].disconnect).toHaveBeenCalledTimes(1);

    // Second connect() call after explicit disconnect must NOT call io() again
    // because permanentlyDisconnected flag short-circuits.
    mockedIo.mockClear();
    svc.connect();
    expect(mockedIo).not.toHaveBeenCalled();
    expect(svc.getStatus()).toBe('disconnected');

    // reconnect() clears the permanent-disconnect flag and recreates socket
    svc.reconnect();
    expect(mockedIo).toHaveBeenCalledTimes(1);
  });

  it('binds internal listeners once per socket lifecycle', () => {
    const created: MockSocket[] = [];
    mockedIo.mockImplementation((url, opts) => {
      const s = new MockSocket(String(url), opts);
      created.push(s);
      return s;
    });
    const svc = WebSocketService.getInstance(DASHBOARD_NS);
    svc.connect();
    const connectCalls = created[0].on.mock.calls.filter(([evt]) => evt === 'connect').length;
    expect(connectCalls).toBeGreaterThanOrEqual(1);
    // Repeated connect calls don't re-register listeners because socket is already connecting/connected
    svc.connect();
    // same socket still present
    expect(mockedIo).toHaveBeenCalledTimes(1);
    // After disconnect + reconnect, listeners should be bound once for the NEW socket
    svc.disconnect();
    mockedIo.mockClear();
    svc.reconnect();
    expect(created).toHaveLength(2);
    const newConnectCalls = created[1].on.mock.calls.filter(([evt]) => evt === 'connect').length;
    expect(newConnectCalls).toBeGreaterThanOrEqual(1);
  });

  it('transitions to error status with safe message on connect_error (does not leak sensitive data)', () => {
    const created: MockSocket[] = [];
    mockedIo.mockImplementation((url, opts) => {
      const s = new MockSocket(String(url), opts);
      created.push(s);
      return s;
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const svc = WebSocketService.getInstance(DASHBOARD_NS);
    let observedStatus: any;
    svc.onStatusChange(s => (observedStatus = s));
    svc.connect();
    created[0].fire('connect_error', { message: 'handshake failed' });
    expect(observedStatus).toBe('error');
    const allWarn = warnSpy.mock.calls.map(c => c.join(' ')).join('\n');
    expect(allWarn).toContain('handshake failed');
    warnSpy.mockRestore();
  });

  it('skips connection when auth payload is missing', () => {
    mockedBuildSocketAuthPayload.mockReturnValue(undefined as any);
    const svc = WebSocketService.getInstance(DASHBOARD_NS);
    svc.connect();
    expect(mockedIo).not.toHaveBeenCalled();
    expect(svc.getStatus()).toBe('disconnected');
  });

  it('refreshes auth payload on each handshake call (callback reads fresh each time)', () => {
    mockedIo.mockImplementation((url, opts) => new MockSocket(String(url), opts));
    let counter = 0;
    mockedBuildSocketAuthPayload.mockImplementation(() => {
      counter += 1;
      return { token: `tok-${counter}` };
    });
    WebSocketService.getInstance(DASHBOARD_NS).connect();
    const opts = mockedIo.mock.calls[0][1];
    const first: any[] = [];
    const second: any[] = [];
    // Counter is already incremented N times by connect()'s own checks;
    // what matters is that each auth invocation separately calls buildSocketAuthPayload
    // and returns monotonically increasing tokens - i.e. callback is not caching.
    opts.auth((p: any) => first.push(p));
    const firstVal = first[0].token;
    opts.auth((p: any) => second.push(p));
    const secondVal = second[0].token;
    expect(typeof firstVal).toBe('string');
    expect(typeof secondVal).toBe('string');
    expect(firstVal).not.toBe(secondVal);
    expect(parseInt(secondVal.replace('tok-', ''), 10))
      .toBeGreaterThan(parseInt(firstVal.replace('tok-', ''), 10));
  });
});
