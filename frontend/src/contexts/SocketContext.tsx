import React, { createContext, useContext, useEffect, ReactNode, useRef } from 'react';
import WebSocketService from '../services/websocketService';
import { useAuth } from './AuthContext';
import { getStoredRealtimeContext } from '../services/socketConnectionContext';

interface SocketContextType {
    // Exposed for future consumers; most callers should use the useWebSocket hook.
    reconnectDashboard: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const ADMIN_DASHBOARD_ROLES = new Set([
    'admin',
    'school_admin',
    'super_admin',
    'superadmin',
    'super_manager',
]);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isAuthenticated, user } = useAuth();
    const lastTenantRef = useRef<string | undefined>(undefined);
    const lastBranchRef = useRef<string | undefined>(undefined);
    const mountedOnceRef = useRef(false);
    // Read stored realtime context at render time so it can participate in effect
    // dependencies; the values are also snapshotted in refs so we detect drift.
    const storedContext = getStoredRealtimeContext();
    const storedTenantId = storedContext?.tenantId;
    const storedBranchId = storedContext?.branchId;

    const reconnectDashboard = () => {
        try {
            WebSocketService.getInstance('/dashboard').reconnect();
        } catch {
            /* no-op: no-op */
        }
    };

    useEffect(() => {
        const dashboardWs = WebSocketService.getInstance('/dashboard');
        const chatWs = WebSocketService.getInstance('/chat');
        const userRole = (user?.role ?? '').toString().toLowerCase();
        const shouldKeepDashboardAlive =
            isAuthenticated && ADMIN_DASHBOARD_ROLES.has(userRole);

        if (shouldKeepDashboardAlive) {
            const tenantId = storedTenantId;
            const branchId = storedBranchId;
            const tenantChanged = lastTenantRef.current !== undefined && tenantId !== lastTenantRef.current;
            const branchChanged = lastBranchRef.current !== undefined && branchId !== lastBranchRef.current;
            const firstMountedWithoutContext = !mountedOnceRef.current;

            lastTenantRef.current = tenantId;
            lastBranchRef.current = branchId;
            mountedOnceRef.current = true;

            if ((tenantChanged || branchChanged) && !firstMountedWithoutContext) {
                dashboardWs.reconnect();
            } else {
                dashboardWs.connect();
            }
        } else {
            lastTenantRef.current = undefined;
            lastBranchRef.current = undefined;
            dashboardWs.disconnect();
        }

        if (!isAuthenticated) {
            chatWs.disconnect();
        }
    }, [isAuthenticated, user?.role, storedTenantId, storedBranchId]);

    return (
        <SocketContext.Provider value={{ reconnectDashboard }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};
