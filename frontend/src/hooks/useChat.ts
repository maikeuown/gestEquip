'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { supabase, chatChannel } from '@/lib/supabase/client';

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

// Role pairing: who can see whom
const ALLOWED_PEERS: Record<string, string[]> = {
  TECHNICIAN: ['TEACHER', 'STAFF'],
  TEACHER: ['TECHNICIAN'],
  STAFF: ['TECHNICIAN'],
};

interface PresencePayload {
  userId: string;
  name: string;
  role: string;
}

export function useChat() {
  const { user } = useAuthStore();
  const [onlinePeers, setOnlinePeers] = useState<ChatPeer[]>([]);
  const [conversations, setConversations] = useState<Map<string, ChatMessage[]>>(new Map());
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [openConversations, setOpenConversations] = useState<Set<string>>(new Set());
  const [peerDisconnected, setPeerDisconnected] = useState<Set<string>>(new Set());
  const channelRef = useRef<typeof chatChannel | null>(null);
  const joinedRef = useRef(false);

  // Helper: read presence state and filter allowed peers
  const getFilteredPeers = useCallback((): ChatPeer[] => {
    if (!user) return [];
    const allowedRoles = ALLOWED_PEERS[user.role];
    if (!allowedRoles) return [];

    const state = channelRef.current?.presenceState();
    const seen = new Set<string>();
    const peers: ChatPeer[] = [];

    if (state) {
      for (const presenceList of Object.values(state)) {
        for (const presence of presenceList) {
          const p = (presence as any)?.payload ?? presence;
          if (!p?.userId || p.userId === user.id) continue;
          if (seen.has(p.userId)) continue;
          if (allowedRoles.includes(p.role)) {
            seen.add(p.userId);
            peers.push({ userId: p.userId, name: p.name, role: p.role, socketId: '' });
          }
        }
      }
    }
    return peers;
  }, [user]);

  const applyPeerList = useCallback((peers: ChatPeer[]) => {
    setOnlinePeers(peers);
    setPeerDisconnected((prev) => {
      const next = new Set(prev);
      for (const p of peers) next.delete(p.userId);
      return next;
    });
  }, []);

  // Join Supabase channel + presence on mount
  useEffect(() => {
    if (!user || joinedRef.current) return;
    joinedRef.current = true;

    const channel = chatChannel;
    channelRef.current = channel;

    // --- Presence sync (initial load) ---
    channel.on('system', { event: 'sync' }, () => {
      applyPeerList(getFilteredPeers());
    });

    // --- Presence join ---
    channel.on('system', { event: 'join' }, () => {
      applyPeerList(getFilteredPeers());
    });

    // --- Presence leave ---
    channel.on('system', { event: 'leave' }, () => {
      applyPeerList(getFilteredPeers());
    });

    // --- Broadcast: receive chat message ---
    channel.on('broadcast', { event: 'chat:message' }, (payload) => {
      const msg = payload.payload as { fromUserId: string; fromName: string; content: string; timestamp: string };
      if (!msg || !msg.fromUserId) return;

      setConversations((prev) => {
        const next = new Map(prev);
        const existing = next.get(msg.fromUserId) || [];
        next.set(msg.fromUserId, [...existing, { ...msg, isOwn: false }]);
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

    // Subscribe and track presence
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
        });
      }
    });

    return () => {
      channel.untrack().catch(() => {});
      channel.unsubscribe().catch(() => {});
      channelRef.current = null;
      joinedRef.current = false;
    };
  }, [user, getFilteredPeers, applyPeerList]);

  // --- Send message ---
  const sendMessage = useCallback(
    (toUserId: string, content: string) => {
      if (!user) return;

      const payload = {
        fromUserId: user.id,
        fromName: `${user.firstName} ${user.lastName}`,
        content,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to channel (all peers receive, filter on their side)
      chatChannel.send({
        type: 'broadcast',
        event: 'chat:message',
        payload,
      });

      // Add to own conversation immediately
      setConversations((prev) => {
        const next = new Map(prev);
        const existing = next.get(toUserId) || [];
        next.set(toUserId, [...existing, { ...payload, isOwn: true }]);
        return next;
      });
    },
    [user],
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
