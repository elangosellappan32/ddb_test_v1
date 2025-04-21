import { useEffect, useCallback, useRef } from 'react';
import websocketService from '../services/websocketService';

const useWebSocket = () => {
    const connectionAttempts = useRef(0);
    const maxAttempts = 5;

    const connect = useCallback(async () => {
        try {
            await websocketService.connect();
            connectionAttempts.current = 0;
            console.log('WebSocket connected successfully');
        } catch (error) {
            console.error('WebSocket connection error:', error);
            
            if (connectionAttempts.current < maxAttempts) {
                connectionAttempts.current++;
                console.log(`Retrying connection (${connectionAttempts.current}/${maxAttempts})...`);
                setTimeout(connect, Math.min(1000 * Math.pow(2, connectionAttempts.current), 30000));
            } else {
                console.error('Max connection attempts reached');
            }
        }
    }, []);

    useEffect(() => {
        connect();

        return () => {
            websocketService.disconnect();
        };
    }, [connect]);

    return {
        reconnect: connect,
        disconnect: websocketService.disconnect
    };
};

export default useWebSocket;