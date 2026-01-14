import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '../components/ui';

interface NotificationMessage {
    event_type: string;
    payload: any;
}

interface WebSocketContextType {
    isConnected: boolean;
    lastMessage: NotificationMessage | null;
    sendMessage: (msg: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<NotificationMessage | null>(null);
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<number | undefined>(undefined);
    const { info } = useToast();

    const connect = useCallback(() => {
        // Use window.location.hostname to support network access
        const hostname = window.location.hostname;
        const wsUrl = import.meta.env.VITE_WS_URL || `ws://${hostname}:8080/ws`;

        // Close existing if any
        if (ws.current) {
            // Remove listeners to prevent 'onclose' from triggering reconnect for this closed socket
            ws.current.onclose = null;
            ws.current.onerror = null;
            ws.current.onopen = null;
            ws.current.close();
        }

        const socket = new WebSocket(wsUrl);
        ws.current = socket;

        socket.onopen = () => {
            if (socket !== ws.current) return;
            console.log('WebSocket Connected');
            setIsConnected(true);
        };

        socket.onclose = () => {
            if (socket !== ws.current) return;
            console.log('WebSocket Disconnected');
            setIsConnected(false);
            // Reconnect logic
            reconnectTimeout.current = window.setTimeout(() => {
                connect();
            }, 3000); // Retry every 3s
        };

        socket.onerror = (error) => {
            if (socket !== ws.current) return;
            console.error('WebSocket Error:', error);
            // socket.close() will trigger onclose
        };

        socket.onmessage = (event) => {
            if (socket !== ws.current) return;
            try {
                const data = JSON.parse(event.data);
                if (data.event_type) {
                    setLastMessage(data); // Trigger updates
                    handleGlobalNotification(data);
                }
            } catch (e) {
                console.error('WS Parse Error', e);
            }
        };
    }, []);

    useEffect(() => {
        connect();
        return () => {
            if (ws.current) ws.current.close();
            clearTimeout(reconnectTimeout.current);
        };
    }, [connect]);

    const sendMessage = useCallback((msg: any) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(msg));
        }
    }, []);

    const handleGlobalNotification = (msg: NotificationMessage) => {
        // Example global toast for critical events
        if (msg.event_type === 'WORK_ORDER_COMPLETED') {
            info(`WO #${msg.payload.id} was completed`, 'Work Order Completed');
        }
    };

    return (
        <WebSocketContext.Provider value={{ isConnected, lastMessage, sendMessage }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};
