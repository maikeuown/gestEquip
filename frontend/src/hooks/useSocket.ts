'use client';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';

let socketInstance: Socket | null = null;

export function useSocket() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    if (!socketInstance) {
      socketInstance = io('/', { auth: { token: accessToken }, transports: ['websocket', 'polling'] });
    }
    socketRef.current = socketInstance;
    return () => { /* keep alive */ };
  }, [isAuthenticated, accessToken]);

  return socketRef.current;
}

export function getSocket(): Socket | null { return socketInstance; }

export function disconnectSocket() {
  if (socketInstance) { socketInstance.disconnect(); socketInstance = null; }
}
