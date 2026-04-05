'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { useSocket } from './useSocket';
import api from '@/lib/api/client';

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
  const { user, accessToken } = useAuthStore();
  const socket = useSocket();
  const [onlinePeers, setOnlinePeers] = useState<ChatPeer[]>([]);
  const [conversations, setConversations] = useState<Map<string, ChatMessage[]>>(new Map());
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [openConversations, setOpenConversations] = useState<Set<string>>(new Set());
  const [peerDisconnected, setPeerDisconnected] = useState<Set<string>>(new Set());

  // ============================================================
  // HTTP PRESENCE (primary — works on Vercel serverless)
  // ============================================================

  // Heartbeat every 10s to keep user marked online in DB
  useEffect(() => {
    if (!user || !accessToken) return;

    // Initial heartbeat immediately
    api.post('/presence/heartbeat').catch(() => {});

    // Repeat every 10 seconds
    const heartbeatInterval = setInterval(() => {
      api.post('/presence/heartbeat').catch(() => {});
    }, 10000);

    return () => clearInterval(heartbeatInterval);
  }, [user, accessToken]);

  // Poll online peers every 3 seconds
  useEffect(() => {
    if (!user || !accessToken) return;

    let cancelled = false;

    const pollPeers = async () => {
      try {
        const peers: ChatPeer[] = await api.get('/presence/online');
        if (cancelled) return;
        const arr = Array.isArray(peers) ? peers : [];
        setOnlinePeers(arr);
        // Clear "disconnected" flag for peers that just came back
        setPeerDisconnected((prev) => {
          const next = new Set(prev);
          for (const p of arr) next.delete(p.userId);
          return next;
        });
      } catch {
        // Silently fail — next poll will retry
      }
    };

    pollPeers();
    const interval = setInterval(pollPeers, 3000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [user, accessToken]);

  // ============================================================
  // WEBSOCKET PRESENCE (supplementary — local dev only)
  // ============================================================

  useEffect(() => {
    if (!socket || !user) return;

    const tryJoin = () => {
      if (socket.connected) {
        socket.emit('presence:join', {
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
        });
      }
    };

    if (socket.connected) {
      tryJoin();
    } else {
      socket.once('connect', tryJoin);
    }

    const onWsConnect = () => { tryJoin(); };

    const onWsPresenceList = (peers: ChatPeer[]) => {
      setOnlinePeers(peers);
      setPeerDisconnected((prev) => {
        const next = new Set(prev);
        for (const p of peers) next.delete(p.userId);
        return next;
      });
    };

    const onWsPresenceJoined = (peer: { userId: string; name: string; role: string }) => {
      setOnlinePeers((prev) => {
        if (prev.find((p) => p.userId === peer.userId)) return prev;
        return [...prev, { ...peer, socketId: '' }];
      });
      setPeerDisconnected((prev) => {
        const next = new Set(prev);
        next.delete(peer.userId);
        return next;
      });
    };

    const onWsPresenceLeft = (data: { userId: string }) => {
      setOnlinePeers((prev) => prev.filter((p) => p.userId !== data.userId));
      setPeerDisconnected((prev) => new Set(prev).add(data.userId));
    };

    socket.on('connect', onWsConnect);
    socket.on('presence:list', onWsPresenceList);
    socket.on('presence:joined', onWsPresenceJoined);
    socket.on('presence:left', onWsPresenceLeft);

    return () => {
      socket.off('connect', onWsConnect);
      socket.off('presence:list', onWsPresenceList);
      socket.off('presence:joined', onWsPresenceJoined);
      socket.off('presence:left', onWsPresenceLeft);
    };
  }, [socket, user]);

  // ============================================================
  // MESSAGES (WebSocket — supplementary)
  // ============================================================

  useEffect(() => {
    if (!socket || !user) return;

    const onMessageReceive = (msg: { fromUserId: string; fromName: string; content: string; timestamp: string }) => {
      setConversations((prev) => {
        const next = new Map(prev);
        const existing = next.get(msg.fromUserId) || [];
        next.set(msg.fromUserId, [...existing, { ...msg, isOwn: false }]);
        return next;
      });

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
    };

    socket.on('message:receive', onMessageReceive);
    return () => { socket.off('message:receive', onMessageReceive); };
  }, [socket, user]);

  // ============================================================
  // ACTIONS
  // ============================================================

  const sendMessage = useCallback(
    (toUserId: string, content: string) => {
      if (!socket || !user) return;
      socket.emit('message:send', { toUserId, content });

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
    unreadCounts.forEach((count) => { total += count; });
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
