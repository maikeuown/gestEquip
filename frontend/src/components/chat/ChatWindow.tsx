'use client';
import { useState, useEffect, useRef } from 'react';
import { X, Circle } from 'lucide-react';
import clsx from 'clsx';

interface ChatMessage {
  fromUserId: string;
  fromName: string;
  content: string;
  timestamp: string;
  isOwn?: boolean;
}

interface ChatWindowProps {
  peerName: string;
  isOnline: boolean;
  messages: ChatMessage[];
  isSessionEnded: boolean;
  onSend: (content: string) => void;
  onClose: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatWindow({
  peerName,
  isOnline,
  messages,
  isSessionEnded,
  onSend,
  onClose,
}: ChatWindowProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-80 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ height: '420px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-xs font-bold text-primary-700">
              {peerName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">{peerName}</span>
            <Circle className={clsx('w-2.5 h-2.5', isOnline ? 'text-green-500 fill-green-500' : 'text-gray-400')} />
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">Inicia a conversa</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={clsx('flex', msg.isOwn ? 'justify-end' : 'justify-start')}>
            <div
              className={clsx(
                'max-w-[75%] px-3 py-2 rounded-lg text-sm',
                msg.isOwn ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm',
              )}
            >
              <p>{msg.content}</p>
              <p className={clsx('text-[10px] mt-0.5', msg.isOwn ? 'text-primary-200' : 'text-gray-400')}>
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}
        {isSessionEnded && (
          <p className="text-center text-gray-400 text-xs italic py-2">Sessão terminada</p>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-200 bg-white">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escreve uma mensagem..."
          className="flex-1 text-sm bg-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 placeholder-gray-400"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className={clsx(
            'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            input.trim() ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed',
          )}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
