'use client';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';

let socketInstance: Socket | null = null;
let socketCleanup: (() => void) | null = null;
let currentSocketUrl: string | null = null;

function getSocketUrl(): string {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (wsUrl) return wsUrl;
  return '/';
}

// On Vercel serverless, WebSocket transport always fails (no persistent connections).
// Only use polling in production — it works with serverless.
function isProduction(): boolean {
  return typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
}

export function useSocket() {
  const { accessToken, isAuthenticated, user } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !user) return;

    const url = getSocketUrl();

    if (socketInstance && currentSocketUrl !== url) {
      socketInstance.disconnect();
      socketInstance = null;
      socketCleanup = null;
      currentSocketUrl = null;
    }

    if (!socketInstance) {
      const transports: ('polling' | 'websocket')[] = isProduction() ? ['polling'] : ['polling', 'websocket'];

      socketInstance = io(url, {
        auth: { token: accessToken },
        transports,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 5000,
        timeout: 8000,
        forceNew: true,
        upgrade: !isProduction(),
      });

      // Completely suppress Socket.io error logs — HTTP presence handles everything
      socketInstance.io.engine.on('error', () => {});
      socketInstance.on('connect_error', () => {});

      socketInstance.on('connect', () => {
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
      socketInstance.auth = { token: accessToken };
      socketInstance.connect();
    }

    currentSocketUrl = url;

    socketRef.current = socketInstance;
    return () => {};
  }, [isAuthenticated, accessToken, user]);

  return socketRef.current;
}

export function getSocket(): Socket | null { return socketInstance; }

export function disconnectSocket() {
  if (socketCleanup) { socketCleanup(); socketCleanup = null; }
}
