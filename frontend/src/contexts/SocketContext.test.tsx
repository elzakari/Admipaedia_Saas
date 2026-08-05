import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import WebSocketService from '../services/websocketService';
import { SocketProvider } from '../contexts/SocketContext';
import { getStoredRealtimeContext } from '../services/socketConnectionContext';

vi.mock('./AuthContext', () => ({
  useAuth: vi.fn(),
}));
vi.mock('../services/socketConnectionContext', () => ({
  getStoredRealtimeContext: vi.fn(),
}));
vi.mock('../services/websocketService');

import { useAuth } from './AuthContext';

const mockUseAuth = vi.mocked(useAuth);
const mockGetStoredRealtimeContext = vi.mocked(getStoredRealtimeContext);
const MockWebSocketService = vi.mocked(WebSocketService);

type WsInstance = ReturnType<typeof WebSocketService.getInstance>;

function _makeFakeWs(): WsInstance {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    reconnect: vi.fn(),
    getStatus: vi.fn(() => 'disconnected'),
    onStatusChange: vi.fn(() => (() => {})),
    subscribe: vi.fn(() => (() => {})),
    addGlobalMessageHandler: vi.fn(() => (() => {})),
    send: vi.fn(),
  } as unknown as WsInstance;
}

let cache: Map<string, WsInstance>;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  cache = new Map<string, WsInstance>();
  MockWebSocketService.getInstance.mockImplementation((ns: string) => {
    if (!cache.has(ns)) cache.set(ns, _makeFakeWs());
    return cache.get(ns)!;
  });
  mockGetStoredRealtimeContext.mockReturnValue({
    token: 'tok',
    tenantId: undefined,
    branchId: undefined,
  });
});

afterEach(() => {
  // nothing to clear
});

function getCached(ns: string): WsInstance {
  return cache.get(ns)!;
}

function setupAuth(role: string | undefined, isAuthenticated: boolean, tenantId?: string, branchId?: string) {
  mockUseAuth.mockReturnValue({
    isAuthenticated,
    user: role ? { id: 1, role, username: 'u' } : null,
  } as any);
  mockGetStoredRealtimeContext.mockReturnValue({
    token: isAuthenticated ? 'tok' : undefined,
    tenantId,
    branchId,
  });
}

describe('SocketContext', () => {
  it('includes backward-compatible superadmin alias (no underscore) in role set', async () => {
    setupAuth('superadmin', true, 'tenant-1');
    render(<SocketProvider><div data-testid="child" /></SocketProvider>);
    const dashboard = getCached('/dashboard');
    await waitFor(() => expect(dashboard.connect).toHaveBeenCalled());
  });

  it('connects dashboard for admin, school_admin, super_admin, superadmin, super_manager roles', async () => {
    for (const role of ['admin', 'school_admin', 'super_admin', 'superadmin', 'super_manager']) {
      // clear cache between iterations so we get a new per-role fakes instance,
      // and re-seed mock.
      cache.clear();
      setupAuth(role, true, 't');
      const { unmount } = render(<SocketProvider><div /></SocketProvider>);
      const dashboard = getCached('/dashboard');
      await waitFor(() => expect(dashboard.connect).toHaveBeenCalled(), {
        timeout: 2000,
      });
      unmount();
    }
  });

  it('does NOT connect dashboard for student / teacher / parent roles; calls disconnect', async () => {
    for (const role of ['student', 'teacher', 'parent']) {
      cache.clear();
      setupAuth(role, true, 't');
      const { unmount } = render(<SocketProvider><div /></SocketProvider>);
      const dashboard = getCached('/dashboard');
      await waitFor(() => expect(dashboard.connect).not.toHaveBeenCalled());
      expect(dashboard.disconnect).toHaveBeenCalled();
      unmount();
    }
  });

  it('disconnects both dashboard and chat sockets when user logs out (unauthenticated)', async () => {
    setupAuth('admin', true, 't1');
    const { rerender, unmount } = render(<SocketProvider><div /></SocketProvider>);
    const dashboard = getCached('/dashboard');
    await waitFor(() => expect(dashboard.connect).toHaveBeenCalled());
    expect(dashboard.disconnect).not.toHaveBeenCalled();

    // Simulate logout
    setupAuth(undefined, false);
    act(() => rerender(<SocketProvider><div /></SocketProvider>));

    await waitFor(() => expect(dashboard.disconnect).toHaveBeenCalled());
    const chat = getCached('/chat');
    expect(chat.disconnect).toHaveBeenCalled();
    unmount();
  });

  it('reconnects dashboard when tenantId changes between renders (within SAME provider)', async () => {
    setupAuth('school_admin', true, 't1');
    const { rerender, unmount } = render(<SocketProvider><div /></SocketProvider>);
    const dashboard = getCached('/dashboard');
    await waitFor(() => expect(dashboard.connect).toHaveBeenCalled(), { timeout: 2000 });
    expect(dashboard.reconnect).not.toHaveBeenCalled();

    // change tenant within the provider via context
    setupAuth('school_admin', true, 't2');
    act(() => rerender(<SocketProvider><div /></SocketProvider>));

    await waitFor(() => expect(dashboard.reconnect).toHaveBeenCalled(), { timeout: 2000 });
    unmount();
  });

  it('reconnects dashboard when branchId changes between renders (within SAME provider)', async () => {
    setupAuth('school_admin', true, 't1', 'b1');
    const { rerender, unmount } = render(<SocketProvider><div /></SocketProvider>);
    const dashboard = getCached('/dashboard');
    await waitFor(() => expect(dashboard.connect).toHaveBeenCalled(), { timeout: 2000 });

    setupAuth('school_admin', true, 't1', 'b2');
    act(() => rerender(<SocketProvider><div /></SocketProvider>));

    await waitFor(() => expect(dashboard.reconnect).toHaveBeenCalled(), { timeout: 2000 });
    unmount();
  });

  it('does NOT reconnect when re-render but tenant/branch/role are unchanged', async () => {
    setupAuth('school_admin', true, 't1', 'b1');
    const { rerender, unmount } = render(<SocketProvider><div /></SocketProvider>);
    const dashboard = getCached('/dashboard');
    await waitFor(() => expect(dashboard.connect).toHaveBeenCalled(), { timeout: 2000 });

    // rerender with identical realtime context - no reconnect expected
    act(() => rerender(<SocketProvider><div data-testid="child-2" /></SocketProvider>));
    // brief wait to ensure any pending effect microtasks flush
    await waitFor(() => expect(dashboard.connect).toHaveBeenCalledTimes(1), { timeout: 500 });
    expect(dashboard.reconnect).not.toHaveBeenCalled();
    unmount();
  });
});
