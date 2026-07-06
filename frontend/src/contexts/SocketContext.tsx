import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import WebSocketService from '../services/websocketService';
import { useAuth } from './AuthContext';

interface SocketContextType {
    // We can expose global sockets here if needed, 
    // but useWebSocket hook already uses the singletons
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isAuthenticated, user } = useAuth();

    useEffect(() => {
        const dashboardWs = WebSocketService.getInstance('/dashboard');
        const chatWs = WebSocketService.getInstance('/chat');
        const shouldKeepDashboardAlive =
            isAuthenticated && ['admin', 'school_admin', 'super_admin', 'super_manager'].includes(user?.role ?? '');

        if (shouldKeepDashboardAlive) {
            console.log('Initializing admin dashboard realtime socket...');
            dashboardWs.connect();
        } else {
            dashboardWs.disconnect();
        }

        if (!isAuthenticated) {
            chatWs.disconnect();
        }
    }, [isAuthenticated, user?.role]);

    return (
        <SocketContext.Provider value={{}}>
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
