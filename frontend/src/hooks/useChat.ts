'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { useSocket } from './useSocket';

export interface ChatPeer {
  userId: string;
  name: string;
  role: string;
  socketId: string;
}

export interface ChatMessage {
  fromUserId: string;
  fromName: string;
  content: string;
  timestamp: string;
  isOwn?: boolean;
}

export function useChat() {
  const { user } = useAuthStore();
  const socket = useSocket();
  const [onlinePeers, setOnlinePeers] = useState<ChatPeer[]>([]);
  const [conversations, setConversations] = useState<Map<string, ChatMessage[]>>(new Map());
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [openConversations, setOpenConversations] = useState<Set<string>>(new Set());
  const [peerDisconnected, setPeerDisconnected] = useState<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Join presence on mount
  useEffect(() => {
    if (!socket || !user || initializedRef.current) return;
    initializedRef.current = true;

    socket.emit('presence:join', {
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
    });

    // Listen for peer list
    socket.on('presence:list', (peers: ChatPeer[]) => {
      setOnlinePeers(peers);
      // Clear disconnected status for peers that are back online
      setPeerDisconnected((prev) => {
        const next = new Set(prev);
        for (const p of peers) next.delete(p.userId);
        return next;
      });
    });

    // Listen for new peer joining
    socket.on('presence:joined', (peer: { userId: string; name: string; role: string }) => {
      setOnlinePeers((prev) => {
        if (prev.find((p) => p.userId === peer.userId)) return prev;
        return [...prev, { ...peer, socketId: '' }];
      });
      setPeerDisconnected((prev) => {
        const next = new Set(prev);
        next.delete(peer.userId);
        return next;
      });
    });

    // Listen for peer leaving
    socket.on('presence:left', (data: { userId: string }) => {
      setOnlinePeers((prev) => prev.filter((p) => p.userId !== data.userId));
      setPeerDisconnected((prev) => new Set(prev).add(data.userId));
    });

    // Receive message
    socket.on('message:receive', (msg: { fromUserId: string; fromName: string; content: string; timestamp: string }) => {
      const isOwn = msg.fromUserId === user?.id;
      setConversations((prev) => {
        const next = new Map(prev);
        const peerId = isOwn ? msg.fromUserId : msg.fromUserId;
        const existing = next.get(peerId) || [];
        next.set(peerId, [...existing, { ...msg, isOwn: false }]);
        return next;
      });

      // Increment unread if conversation not open
      setOpenConversations((open) => {
        if (!open.has(msg.fromUserId)) {
          setUnreadCounts((prev) => {
            const next = new Map(prev);
            next.set(msg.fromUserId, (next.get(msg.fromUserId) || 0) + 1);
            return next;
          });
        }
        return open;
      });
    });

    return () => {
      socket.off('presence:list');
      socket.off('presence:joined');
      socket.off('presence:left');
      socket.off('message:receive');
    };
  }, [socket, user]);

  const sendMessage = useCallback(
    (toUserId: string, content: string) => {
      if (!socket || !user) return;
      socket.emit('message:send', { toUserId, content });

      // Add to own conversation immediately
      setConversations((prev) => {
        const next = new Map(prev);
        const existing = next.get(toUserId) || [];
        next.set(toUserId, [
          ...existing,
          {
            fromUserId: user.id,
            fromName: `${user.firstName} ${user.lastName}`,
            content,
            timestamp: new Date().toISOString(),
            isOwn: true,
          },
        ]);
        return next;
      });
    },
    [socket, user],
  );

  const openConversation = useCallback((userId: string) => {
    setOpenConversations((prev) => new Set(prev).add(userId));
    // Mark as read
    setUnreadCounts((prev) => {
      const next = new Map(prev);
      next.set(userId, 0);
      return next;
    });
  }, []);

  const closeConversation = useCallback((userId: string) => {
    setOpenConversations((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  }, []);

  const getTotalUnread = useCallback(() => {
    let total = 0;
    unreadCounts.forEach((count) => {
      total += count;
    });
    return total;
  }, [unreadCounts]);

  const isPeerOnline = useCallback(
    (userId: string) => onlinePeers.some((p) => p.userId === userId),
    [onlinePeers],
  );

  return {
    onlinePeers,
    conversations,
    unreadCounts,
    openConversations,
    peerDisconnected,
    sendMessage,
    openConversation,
    closeConversation,
    getTotalUnread,
    isPeerOnline,
  };
}
