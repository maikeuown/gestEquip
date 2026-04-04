'use client';
import { Circle } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '@/store/auth';
import type { ChatPeer } from '@/hooks/useChat';

interface PeerListProps {
  peers: ChatPeer[];
  onSelectPeer: (userId: string) => void;
  peerDisconnected: Set<string>;
}

export default function PeerList({ peers, onSelectPeer, peerDisconnected }: PeerListProps) {
  const { user } = useAuthStore();

  const noPeersMessage = user?.role === 'TECHNICIAN'
    ? 'Nenhum utilizador online'
    : 'Nenhum técnico disponível';

  // Filter out disconnected peers from the list
  const availablePeers = peers.filter((p) => !peerDisconnected.has(p.userId));

  return (
    <div className="p-3 max-h-64 overflow-y-auto">
      {availablePeers.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-6">{noPeersMessage}</p>
      ) : (
        <ul className="space-y-1">
          {availablePeers.map((peer) => (
            <li key={peer.userId}>
              <button
                type="button"
                onClick={() => onSelectPeer(peer.userId)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-100 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary-700">
                    {peer.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{peer.name}</p>
                  <p className="text-xs text-gray-500">
                    {peer.role === 'TECHNICIAN' ? 'Técnico' : peer.role === 'TEACHER' ? 'Professor' : 'Funcionário'}
                  </p>
                </div>
                <Circle className="w-2.5 h-2.5 text-green-500 fill-green-500 flex-shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
