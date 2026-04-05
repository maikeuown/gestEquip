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

// On Vercel serverless, WebSocket transport fails (no persistent connections).
// Use polling-only in production — it works with serverless HTTP.
function isProduction(): boolean {
  return typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
}

export function useSocket() {
  const { accessToken, isAuthenticated, user } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !user) return;

    const url = getSocketUrl();
    const prod = isProduction();

    if (socketInstance && currentSocketUrl !== url) {
      socketInstance.disconnect();
      socketInstance = null;
      socketCleanup = null;
      currentSocketUrl = null;
    }

    if (!socketInstance) {
      socketInstance = io(url, {
        auth: { token: accessToken },
        // Production: polling only (serverless can't sustain WebSocket)
        // Dev: polling first, then try websocket upgrade
        transports: prod ? ['polling'] : ['polling', 'websocket'],
        // Disable upgrade attempt in production
        upgrade: !prod,
        // Reconnection with exponential backoff
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 15000,
        timeout: 15000,
        forceNew: true,
        // Suppress debug output
        autoConnect: true,
      });

      // Suppress ALL engine-level and connection errors — HTTP presence is primary
      socketInstance.io.engine.on('error', () => {});
      socketInstance.io.engine.on('packet', () => {});
      socketInstance.on('connect_error', () => {});
      socketInstance.on('reconnect_error', () => {});
      socketInstance.on('reconnect_attempt', () => {});
      socketInstance.on('reconnect_failed', () => {});

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
