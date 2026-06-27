import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import WebSocketService from '../services/websocketService';
import { useAuth } from './AuthContext';

interface SocketContextType {
    // We can expose global sockets here if needed, 
    // but useWebSocket hook already uses the singletons
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        // Standard namespaces we want to keep alive globally
        const dashboardWs = WebSocketService.getInstance('/dashboard');
        const chatWs = WebSocketService.getInstance('/chat');

        if (isAuthenticated) {
            console.log('🔄 Auth detected, initializing global sockets...');
            dashboardWs.connect();
            // chatWs.connect(); // Connect as needed
        } else {
            console.log('🔄 No auth detected, disconnecting global sockets...');
            dashboardWs.disconnect();
            chatWs.disconnect();
        }

        return () => {
            // Cleanup on unmount (app close)
            dashboardWs.disconnect();
            chatWs.disconnect();
        };
    }, [isAuthenticated]);

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
