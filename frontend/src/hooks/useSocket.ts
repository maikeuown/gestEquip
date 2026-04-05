// useSocket.ts is deprecated — Supabase Realtime is now used instead.
// This file is kept as a stub to avoid breaking imports.
import { supabase } from '@/lib/supabase/client';

export { supabase as getSocket };

export function useSocket() {
  return null;
}

export function disconnectSocket() {
  // No-op — Supabase handles cleanup automatically
}
