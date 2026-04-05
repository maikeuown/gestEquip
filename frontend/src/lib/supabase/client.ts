import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ── Channel singleton ──
// Assigned by ChatProvider on first mount. Read via getChatChannel().

let _chatChannel: RealtimeChannel | null = null;

/**
 * Get (or create) the singleton chat channel.
 *
 * supabase.channel(name) returns a cached instance by name. After
 * supabase.removeChannel() the name is freed and a new call creates
 * a fresh instance.
 *
 * Always call this — never call supabase.channel('chat:global') directly.
 */
export function getChatChannel(): RealtimeChannel {
  if (_chatChannel) return _chatChannel;
  _chatChannel = supabase.channel('chat:global', {
    config: {
      presence: { key: 'chat' },
      broadcast: { ack: true },
    },
  });
  return _chatChannel;
}

/**
 * Reset the singleton reference. Call this during logout cleanup
 * AFTER supabase.removeChannel() so the next getChatChannel() creates
 * a brand-new instance.
 */
export function resetChatChannel() {
  _chatChannel = null;
}
