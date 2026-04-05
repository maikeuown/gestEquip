// Re-export everything from the context so existing imports keep working.
// The channel is now owned by <ChatProvider> — useChat() is just a context consumer.
export { useChat } from '@/contexts/ChatContext';
export type { ChatPeer, ChatMessage } from '@/contexts/ChatContext';
