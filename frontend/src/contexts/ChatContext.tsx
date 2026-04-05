'use client';
import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuthStore } from '@/store/auth';
import { supabase, createChatChannel } from '@/lib/supabase/client';

// ── Types ──

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

interface ChatContextValue {
  onlinePeers: ChatPeer[];
  conversations: Map<string, ChatMessage[]>;
  unreadCounts: Map<string, number>;
  openConversations: Set<string>;
  peerDisconnected: Set<string>;
  sendMessage: (toUserId: string, content: string) => void;
  openConversation: (userId: string) => void;
  closeConversation: (userId: string) => void;
  getTotalUnread: () => number;
  isPeerOnline: (userId: string) => boolean;
}

// ── Role pairing: who can see whom ──

const ALLOWED_PEERS: Record<string, string[]> = {
  TECHNICIAN: ['TEACHER', 'STAFF'],
  TEACHER: ['TECHNICIAN'],
  STAFF: ['TECHNICIAN'],
};

// ── Context ──

const ChatContext = createContext<ChatContextValue | null>(null);

// ── Synchronous channel removal ──
//
// supabase.removeChannel() is async — it awaits unsubscribe() before
// removing the channel from the internal registry. If a new
// supabase.channel('chat:global') call happens before that resolves,
// it returns the OLD still-subscribed channel, and .on('presence', ...)
// throws. This helper purges the channel from the registry synchronously.
function forceRemoveChannel(ch: RealtimeChannel) {
  const rt = (supabase as any).realtime;
  if (rt && typeof rt._remove === 'function') {
    rt._remove(ch);
  }
  ch.unsubscribe().then(() => ch.teardown()).catch(() => {});
}

// ── Provider (mount exactly ONCE in the layout) ──

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();
  const [onlinePeers, setOnlinePeers] = useState<ChatPeer[]>([]);
  const [conversations, setConversations] = useState<Map<string, ChatMessage[]>>(new Map());
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [openConversations, setOpenConversations] = useState<Set<string>>(new Set());
  const [peerDisconnected, setPeerDisconnected] = useState<Set<string>>(new Set());

  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // ── Cleanup ──
  const cleanupChannel = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    const ch = channelRef.current;
    if (ch) forceRemoveChannel(ch);
    channelRef.current = null;
  }, []);

  // ── Core subscribe (called exactly once per user session) ──
  const subscribeChannel = useCallback((currentUser: NonNullable<typeof user>, attempt = 0) => {
    const old = channelRef.current;
    if (old) {
      forceRemoveChannel(old);
      channelRef.current = null;
    }

    const channel = createChatChannel();
    channelRef.current = channel;

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

  // ── Single effect: one channel for the entire app ──
  useEffect(() => {
    if (!user) {
      cleanupChannel();
      setOnlinePeers([]);
      return;
    }

    subscribeChannel(user);
    return () => { cleanupChannel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Actions (stable callbacks) ──
  const sendMessage = useCallback(
    (toUserId: string, content: string) => {
      if (!user) return;
      const payload = {
        fromUserId: user.id,
        fromName: `${user.firstName} ${user.lastName}`,
        content,
        timestamp: new Date().toISOString(),
      };
      channelRef.current?.send({ type: 'broadcast', event: 'chat:message', payload });
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

  return (
    <ChatContext.Provider value={{
      onlinePeers, conversations, unreadCounts, openConversations, peerDisconnected,
      sendMessage, openConversation, closeConversation, getTotalUnread, isPeerOnline,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

// ── Hook (safe to call from any number of components) ──

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within <ChatProvider>');
  return ctx;
}
