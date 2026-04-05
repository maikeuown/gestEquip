'use client';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';

let socketInstance: Socket | null = null;
let socketCleanup: (() => void) | null = null;
let currentSocketUrl: string | null = null;

// In dev, '/' proxies to backend via Next.js config. In production, use NEXT_PUBLIC_WS_URL.
function getSocketUrl(): string {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (wsUrl) return wsUrl;
  return '/';
}

export function useSocket() {
  const { accessToken, isAuthenticated, user } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !user) return;

    const url = getSocketUrl();

    // Reconnect if backend URL changed (e.g. between dev and prod)
    if (socketInstance && currentSocketUrl !== url) {
      socketInstance.disconnect();
      socketInstance = null;
      socketCleanup = null;
      currentSocketUrl = null;
    }

    if (!socketInstance) {
      socketInstance = io(url, {
        auth: { token: accessToken },
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketInstance.on('connect', () => {
        // Re-emit presence on reconnect
        socketInstance!.emit('presence:join', {
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
        });
      });

      socketCleanup = () => {
        if (socketInstance) {
          socketInstance.disconnect();
          socketInstance = null;
        }
        currentSocketUrl = null;
      };
    } else if (!socketInstance.connected) {
      // Update auth token on existing instance
      socketInstance.auth = { token: accessToken };
      socketInstance.connect();
    }

    currentSocketUrl = url;

    socketRef.current = socketInstance;
    return () => { /* keep alive across re-renders; cleanup on unmount handled by disconnectSocket */ };
  }, [isAuthenticated, accessToken, user]);

  return socketRef.current;
}

export function getSocket(): Socket | null { return socketInstance; }

export function disconnectSocket() {
  if (socketCleanup) { socketCleanup(); socketCleanup = null; }
}
