/**
 * React Hook for WebSocket Integration
 * Provides easy access to real-time sync functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { webSocketService, ConnectionStatus } from '@/services/websocket/WebSocketService';
import { useAuth } from '@/contexts/AuthContext';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  roomId?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (event: string, data: any) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

export interface UseWebSocketReturn {
  status: ConnectionStatus;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  send: (event: string, data: any) => Promise<void>;
  subscribe: (event: string, callback: (data: any) => void) => () => void;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [isConnected, setIsConnected] = useState(false);
  const optionsRef = useRef(options);
  const connectedRef = useRef(false);

  // Update options ref
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user?.uid || !options.autoConnect) return;

    const initializeWebSocket = async () => {
      try {
        await webSocketService.initialize({
          auth: {
            token: await user.getIdToken(),
            userId: user.uid
          }
        });

        connectedRef.current = true;

        // Join room if specified
        if (options.roomId) {
          await webSocketService.joinRoom(options.roomId);
        }

        // Call onConnect callback
        optionsRef.current.onConnect?.();

      } catch (error) {
        console.error('[useWebSocket] Failed to initialize:', error);
      }
    };

    initializeWebSocket();

    // Cleanup on unmount
    return () => {
      if (connectedRef.current && options.roomId) {
        webSocketService.leaveRoom(options.roomId);
      }
      
      if (optionsRef.current.onDisconnect) {
        optionsRef.current.onDisconnect();
      }
    };
  }, [user?.uid, options.autoConnect, options.roomId]);

  // Subscribe to status changes
  useEffect(() => {
    const unsubscribe = webSocketService.subscribe('status', (newStatus: ConnectionStatus) => {
      setStatus(newStatus);
      setIsConnected(newStatus === ConnectionStatus.CONNECTED);
      optionsRef.current.onStatusChange?.(newStatus);
    });

    // Get initial status
    setStatus(webSocketService.getStatus());
    setIsConnected(webSocketService.isConnected());

    return unsubscribe;
  }, []);

  // Subscribe to messages if handler provided
  useEffect(() => {
    if (!options.onMessage) return;

    const unsubscribes: Array<() => void> = [];

    // Subscribe to common events
    const events = ['update', 'delete', 'conflict', 'sync'];
    
    events.forEach(event => {
      const unsubscribe = webSocketService.subscribe(event, (data) => {
        optionsRef.current.onMessage?.(event, data);
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [options.onMessage]);

  // Connect function
  const connect = useCallback(async () => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    await webSocketService.initialize({
      auth: {
        token: await user.getIdToken(),
        userId: user.uid
      }
    });

    connectedRef.current = true;
  }, [user]);

  // Disconnect function
  const disconnect = useCallback(() => {
    webSocketService.disconnect();
    connectedRef.current = false;
  }, []);

  // Send function
  const send = useCallback(async (event: string, data: any) => {
    return webSocketService.send(event, data);
  }, []);

  // Subscribe function
  const subscribe = useCallback((event: string, callback: (data: any) => void) => {
    return webSocketService.subscribe(event, callback);
  }, []);

  // Join room function
  const joinRoom = useCallback(async (roomId: string) => {
    return webSocketService.joinRoom(roomId);
  }, []);

  // Leave room function
  const leaveRoom = useCallback(async (roomId: string) => {
    return webSocketService.leaveRoom(roomId);
  }, []);

  return {
    status,
    isConnected,
    connect,
    disconnect,
    send,
    subscribe,
    joinRoom,
    leaveRoom
  };
}