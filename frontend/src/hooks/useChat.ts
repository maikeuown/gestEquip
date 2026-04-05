'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuthStore } from '@/store/auth';
import { supabase, createChatChannel } from '@/lib/supabase/client';

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

export function useChat() {
  const { user } = useAuthStore();
  const [onlinePeers, setOnlinePeers] = useState<ChatPeer[]>([]);
  const [conversations, setConversations] = useState<Map<string, ChatMessage[]>>(new Map());
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [openConversations, setOpenConversations] = useState<Set<string>>(new Set());
  const [peerDisconnected, setPeerDisconnected] = useState<Set<string>>(new Set());

  // ── Refs for channel lifecycle ──
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);
  const isTrackedRef = useRef(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helper: read presence state and filter by role rules ──
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

  // ── Cleanup helper (called on unmount / user change) ──
  const cleanupChannel = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    const ch = channelRef.current;
    if (ch) {
      try {
        ch.untrack().catch(() => {});
      } catch { /* already gone */ }
      try {
        supabase.removeChannel(ch);
      } catch { /* already removed */ }
    }
    channelRef.current = null;
    isSubscribedRef.current = false;
    isTrackedRef.current = false;
  }, []);

  // ── Schedule a reconnect (exponential backoff, capped at 15 s) ──
  const scheduleReconnect = useCallback(
    (attempt: number) => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      const delay = Math.min(1000 * Math.pow(2, attempt), 15000);
      reconnectTimeoutRef.current = setTimeout(() => {
        if (user && channelRef.current && !isSubscribedRef.current) {
          subscribeChannel(user, attempt + 1);
        }
      }, delay);
    },
    [user],
  );

  // ── Core subscribe helper ──
  function subscribeChannel(currentUser: typeof user, attempt = 0) {
    if (!currentUser || isSubscribedRef.current) return;

    const channel = createChatChannel();
    channelRef.current = channel;

    // ── Presence events (supabase-js v2 uses 'system' for join/leave/sync) ──
    channel.on('system', { event: 'sync' }, () => {
      applyPeerList(getFilteredPeers());
    });
    channel.on('system', { event: 'join' }, () => {
      applyPeerList(getFilteredPeers());
    });
    channel.on('system', { event: 'leave' }, () => {
      applyPeerList(getFilteredPeers());
    });

    // ── Broadcast: receive chat message ──
    channel.on('broadcast', { event: 'chat:message' }, (payload) => {
      const msg = payload.payload as {
        fromUserId: string;
        fromName: string;
        content: string;
        timestamp: string;
      };
      if (!msg?.fromUserId) return;

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
    });

    // ── Subscribe ──
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isSubscribedRef.current = true;

        // Track presence exactly once
        if (!isTrackedRef.current) {
          isTrackedRef.current = true;
          channel
            .track({
              userId: currentUser.id,
              name: `${currentUser.firstName} ${currentUser.lastName}`,
              role: currentUser.role,
            })
            .catch((err) => {
              console.warn('[chat] track failed', err);
            });
        }
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        isSubscribedRef.current = false;
        scheduleReconnect(attempt);
      }
    });
  }

  // ── Main effect: create channel when user is authenticated ──
  useEffect(() => {
    if (!user) {
      // User logged out — clean up
      cleanupChannel();
      setOnlinePeers([]);
      return;
    }

    subscribeChannel(user);

    return () => {
      cleanupChannel();
    };
    // Only re-run when user identity changes (not on every render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Send message ──
  const sendMessage = useCallback(
    (toUserId: string, content: string) => {
      if (!user) return;

      const payload = {
        fromUserId: user.id,
        fromName: `${user.firstName} ${user.lastName}`,
        content,
        timestamp: new Date().toISOString(),
      };

      const ch = channelRef.current;
      if (ch?.state === 'joined' || ch?.state === 'joining') {
        ch.send({ type: 'broadcast', event: 'chat:message', payload });
      }

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
