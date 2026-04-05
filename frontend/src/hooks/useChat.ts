'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { useSocket, getSocket } from './useSocket';
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

// Check if WebSocket is actually connected and working
function isWsConnected(): boolean {
  const s = getSocket();
  return !!s && s.connected;
}

export function useChat() {
  const { user, accessToken } = useAuthStore();
  const socket = useSocket();
  const [onlinePeers, setOnlinePeers] = useState<ChatPeer[]>([]);
  const [conversations, setConversations] = useState<Map<string, ChatMessage[]>>(new Map());
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [openConversations, setOpenConversations] = useState<Set<string>>(new Set());
  const [peerDisconnected, setPeerDisconnected] = useState<Set<string>>(new Set());
  const [useHttpPresence, setUseHttpPresence] = useState(false);
  const httpPresenceRef = useRef<{ polling: boolean; heartbeat: boolean }>({ polling: false, heartbeat: false });

  // HTTP-based presence: heartbeat + polling (fallback for serverless)
  useEffect(() => {
    if (!user || !accessToken) return;

    // Send heartbeat every 10s
    const heartbeatInterval = setInterval(() => {
      api.post('/presence/heartbeat').catch(() => {});
    }, 10000);

    // Initial heartbeat
    api.post('/presence/heartbeat').catch(() => {});

    return () => clearInterval(heartbeatInterval);
  }, [user, accessToken]);

  // HTTP presence polling (always active as primary or fallback)
  useEffect(() => {
    if (!user || !accessToken) return;

    const pollPeers = async () => {
      try {
        const data = await api.get('/presence/online');
        const peers: ChatPeer[] = Array.isArray(data) ? data : [];
        setOnlinePeers(peers);
        setPeerDisconnected((prev) => {
          const next = new Set(prev);
          for (const p of peers) next.delete(p.userId);
          return next;
        });
      } catch {
        // Silently fail — will retry
      }
    };

    // Poll every 3 seconds
    pollPeers();
    const interval = setInterval(pollPeers, 3000);

    return () => clearInterval(interval);
  }, [user, accessToken]);

  // WebSocket presence (only when socket is connected — local dev)
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

    // If WebSocket connects successfully, use it for presence
    const onWsConnect = () => {
      setUseHttpPresence(false);
      tryJoin();
    };

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
      socket.off('connect', tryJoin);
    };
  }, [socket, user]);

  // Receive messages (WebSocket — only works when connected)
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
