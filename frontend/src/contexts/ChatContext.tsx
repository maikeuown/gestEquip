'use client';
import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { useAuthStore } from '@/store/auth';
import { supabase, getChatChannel, resetChatChannel } from '@/lib/supabase/client';

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

// ── Singleton guards — ensure listeners + subscribe happen exactly ONCE ──

let listenersRegistered = false;
let subscribed = false;

// ── Context ──

const ChatContext = createContext<ChatContextValue | null>(null);

// ── Provider (mount exactly ONCE in the layout) ──

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();
  const [onlinePeers, setOnlinePeers] = useState<ChatPeer[]>([]);
  const [conversations, setConversations] = useState<Map<string, ChatMessage[]>>(new Map());
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [openConversations, setOpenConversations] = useState<Set<string>>(new Set());
  const [peerDisconnected, setPeerDisconnected] = useState<Set<string>>(new Set());

  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const trackedRef = useRef(false);

  // ── Helper: read presence state and filter by role rules ──
  const getFilteredPeers = useCallback((): ChatPeer[] => {
    if (!user) return [];
    const ch = getChatChannel();
    const allowedRoles = ALLOWED_PEERS[user.role];
    if (!allowedRoles) return [];

    const state = ch.presenceState();
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

  // ── Effect: register listeners + subscribe ONCE, then track on user change ──
  useEffect(() => {
    if (!user) return;

    // Create (or reuse) the singleton channel
    const ch = getChatChannel();

    // Register listeners exactly once (MUST be before subscribe)
    if (!listenersRegistered) {
      listenersRegistered = true;

      ch.on('presence', { event: 'sync' }, () => {
        applyPeerList(getFilteredPeers());
      });
      ch.on('presence', { event: 'join' }, () => {
        applyPeerList(getFilteredPeers());
      });
      ch.on('presence', { event: 'leave' }, () => {
        applyPeerList(getFilteredPeers());
      });
      ch.on('broadcast', { event: 'chat:message' }, (payload) => {
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
    }

    // Subscribe exactly once
    if (!subscribed) {
      subscribed = true;

      ch.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const currentUser = userRef.current;
          if (currentUser && !trackedRef.current) {
            trackedRef.current = true;
            try {
              await ch.track({
                userId: currentUser.id,
                name: `${currentUser.firstName} ${currentUser.lastName}`,
                role: currentUser.role,
              });
            } catch (err) {
              console.warn('[chat] track failed', err);
            }
          }
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          trackedRef.current = false;
          // Supabase auto-reconnects — subscribe callback fires again with SUBSCRIBED
          // so we re-track automatically
        }
      });
    }

    // If already subscribed but user changed (e.g. different login), re-track
    if (subscribed && !trackedRef.current) {
      ch.track({
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
      }).then(() => {
        trackedRef.current = true;
      }).catch(() => {});
    }

    return () => {
      // Only untrack — do NOT remove the channel or unsubscribe.
      // The channel lives for the entire app session.
      if (trackedRef.current) {
        ch.untrack().catch(() => {});
        trackedRef.current = false;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [user?.id, getFilteredPeers, applyPeerList]);

  // Cleanup on logout
  useEffect(() => {
    if (!user) {
      listenersRegistered = false;
      subscribed = false;
      trackedRef.current = false;
      resetChatChannel();  // reset ref so next login creates a fresh channel
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    }
  }, [user]);

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
      getChatChannel().send({ type: 'broadcast', event: 'chat:message', payload });
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
