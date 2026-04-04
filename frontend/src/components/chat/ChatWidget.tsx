'use client';
import { useState, useCallback } from 'react';
import { MessageCircle, X } from 'lucide-react';
import clsx from 'clsx';
import { useChat } from '@/hooks/useChat';
import { useAuthStore } from '@/store/auth';
import PeerList from './PeerList';
import ChatWindow from './ChatWindow';

export default function ChatWidget() {
  const { user } = useAuthStore();
  const {
    onlinePeers,
    conversations,
    openConversations,
    peerDisconnected,
    sendMessage,
    openConversation,
    closeConversation,
    getTotalUnread,
    isPeerOnline,
  } = useChat();

  const [isOpen, setIsOpen] = useState(false);
  const unread = getTotalUnread();

  const handleSelectPeer = useCallback(
    (userId: string) => {
      openConversation(userId);
    },
    [openConversation],
  );

  const handleSend = useCallback(
    (toUserId: string, content: string) => {
      sendMessage(toUserId, content);
    },
    [sendMessage],
  );

  // Only show for TECHNICIAN, TEACHER, STAFF
  if (!user || !['TECHNICIAN', 'TEACHER', 'STAFF'].includes(user.role)) return null;

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 z-50"
        >
          <MessageCircle className="w-6 h-6" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden z-50" style={{ height: '420px' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary-600 text-white">
            <h3 className="text-sm font-semibold">Chat</h3>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Peer List */}
          <PeerList
            peers={onlinePeers}
            onSelectPeer={handleSelectPeer}
            peerDisconnected={peerDisconnected}
          />
        </div>
      )}

      {/* Open conversation windows — stacked bottom-right */}
      <div className="fixed bottom-5 right-5 z-40 flex items-end gap-3 pointer-events-none" style={{ right: isOpen ? '340px' : '80px' }}>
        {[...openConversations].map((peerId) => {
          const peer = onlinePeers.find((p) => p.userId === peerId);
          const msgs = conversations.get(peerId) || [];
          const sessionEnded = peerDisconnected.has(peerId);
          return (
            <div key={peerId} className="pointer-events-auto">
              <ChatWindow
                peerName={peer?.name || 'Utilizador'}
                isOnline={!sessionEnded}
                messages={msgs}
                isSessionEnded={sessionEnded}
                onSend={(content) => handleSend(peerId, content)}
                onClose={() => closeConversation(peerId)}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
