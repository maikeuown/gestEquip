import { createClient } from '@supabase/supabase-js';

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

/**
 * Create a fresh Supabase channel for the global chat.
 * Called ONCE inside the hook — never at module level.
 *
 * NOTE: Each call returns a NEW channel instance.
 * The caller MUST subscribe exactly once and clean up with removeChannel().
 */
export function createChatChannel() {
  return supabase.channel('chat:global', {
    config: {
      presence: { key: 'chat' },
      broadcast: { ack: true },
    },
  });
}
