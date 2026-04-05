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

/**
 * Synchronously removes a channel from Supabase's internal registry
 * and fires unsubscribe in the background.
 *
 * `supabase.removeChannel()` is async — it awaits `unsubscribe()` before
 * removing the channel from the `channels` array. That means if a new
 * `supabase.channel('chat:global')` call happens before the await resolves,
 * it returns the OLD (still-subscribed) channel, and adding `.on('presence', ...)`
 * to it throws "cannot add presence callbacks after subscribe()".
 *
 * This helper avoids the race by using the internal `_remove()` method to
 * synchronously purge the channel from the registry first.
 */
function forceRemoveChannel(ch: RealtimeChannel) {
  // 1. Synchronously remove from registry so the next supabase.channel() creates a fresh instance
  const rt = (supabase as any).realtime;
  if (rt && typeof rt._remove === 'function') {
    rt._remove(ch);
  }
  // 2. Fire-and-forget the actual network leave + teardown
  ch.unsubscribe().then(() => ch.teardown()).catch(() => {});
}

export function useChat() {
  const { user } = useAuthStore();
  const [onlinePeers, setOnlinePeers] = useState<ChatPeer[]>([]);
  const [conversations, setConversations] = useState<Map<string, ChatMessage[]>>(new Map());
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [openConversations, setOpenConversations] = useState<Set<string>>(new Set());
  const [peerDisconnected, setPeerDisconnected] = useState<Set<string>>(new Set());

  // ── Refs for channel lifecycle ──
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Ref so reconnect can reference the latest user without stale closure ──
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

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
          const p = presence as any;
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
      forceRemoveChannel(ch);
    }
    channelRef.current = null;
  }, []);

  // ── Core subscribe helper ──
  const subscribeChannel = useCallback((currentUser: NonNullable<typeof user>, attempt = 0) => {
    // Tear down any leftover channel before creating a fresh one
    const old = channelRef.current;
    if (old) {
      forceRemoveChannel(old);
      channelRef.current = null;
    }

    const channel = createChatChannel();
    channelRef.current = channel;

    // ── ALL listeners BEFORE subscribe() ──
    channel
      .on('presence', { event: 'sync' }, () => {
        applyPeerList(getFilteredPeers());
      })
      .on('presence', { event: 'join' }, () => {
        applyPeerList(getFilteredPeers());
      })
      .on('presence', { event: 'leave' }, () => {
        applyPeerList(getFilteredPeers());
      })
      .on('broadcast', { event: 'chat:message' }, (payload) => {
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
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await channel.track({
              userId: currentUser.id,
              name: `${currentUser.firstName} ${currentUser.lastName}`,
              role: currentUser.role,
            });
          } catch (err) {
            console.warn('[chat] track failed', err);
          }
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          const delay = Math.min(1000 * Math.pow(2, attempt), 15_000);
          reconnectTimeoutRef.current = setTimeout(() => {
            const u = userRef.current;
            if (u) subscribeChannel(u, attempt + 1);
          }, delay);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyPeerList, getFilteredPeers]);

  // ── Main effect: create channel when user is authenticated ──
  useEffect(() => {
    if (!user) {
      cleanupChannel();
      setOnlinePeers([]);
      return;
    }

    subscribeChannel(user);

    return () => {
      cleanupChannel();
    };
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
      if (ch) {
        ch.send({ type: 'broadcast', event: 'chat:message', payload });
      }

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
