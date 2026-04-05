# Chat Presence Status — Known Issue

## Problem

**Users do NOT appear online in the chat widget** after migrating from Socket.IO to Supabase Realtime.

The Supabase channel connects, presence is tracked, and messages broadcast, but the online users list remains empty in production.

## Current Architecture

### How it's supposed to work

1. `useChat.ts` hook creates a Supabase channel (`chat:global`) on mount
2. On `SUBSCRIBED` status, the user `.track()`s their presence (`userId`, `name`, `role`)
3. Presence `system` events (`sync`, `join`, `leave`) fire and call `getFilteredPeers()`
4. `getFilteredPeers()` reads `channel.presenceState()` and filters by role-pairing rules
5. The filtered peer list updates `onlinePeers` state → renders in `PeerList` component

### Where the data flows

```
frontend/src/hooks/useChat.ts          →  createChatChannel()
frontend/src/lib/supabase/client.ts    →  supabase.createClient() + channel factory
frontend/src/components/chat/ChatWidget.tsx  →  uses useChat() + renders PeerList
frontend/src/components/chat/PeerList.tsx    →  displays onlinePeers array
```

### Role Pairing Rules

| My Role    | I Can See          |
|------------|--------------------|
| TECHNICIAN | TEACHER, STAFF     |
| TEACHER    | TECHNICIAN         |
| STAFF      | TECHNICIAN         |

Admin, MANAGER, etc. cannot use chat at all.

## What's Been Tried

1. ✅ Socket.IO removed entirely — no more 400/504 polling errors
2. ✅ Channel lifecycle fixed — no more "tried to join multiple times" errors
3. ✅ Module-level singleton removed — `createChatChannel()` factory creates fresh channels
4. ✅ `isSubscribedRef` + `isTrackedRef` guard against duplicate subscribe/track
5. ✅ Cleanup on unmount: `untrack()` + `supabase.removeChannel()`
6. ✅ Exponential backoff reconnection on `CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`
7. ✅ **Fixed** — presence event type was `'system'` (wrong), changed to `'presence'` (correct supabase-js v2 API)

## Debug Checklist (for the next developer)

### 1. Supabase Realtime must be enabled
- Go to Supabase Dashboard → Database → Replication
- Ensure "Realtime" is toggled ON
- If it's OFF, Presence won't work at all

### 2. Supabase env vars must be set in Vercel
- `NEXT_PUBLIC_SUPABASE_URL` → `https://<project-ref>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → the anon/public key from Settings → API

### 3. Check browser console for Supabase errors
- Look for `SUBSCRIBED` status log
- Look for `CHANNEL_ERROR` or `TIMED_OUT`
- Add temporary `console.log` in `subscribe()` callback:
  ```ts
  channel.subscribe((status) => {
    console.log('[chat] subscribe status:', status);  // TEMP DEBUG
    // ...
  });
  ```

### 4. Check presence state directly
- Add a debug log after `sync` fires:
  ```ts
  channel.on('system', { event: 'sync' }, () => {
    const raw = channel.presenceState();
    console.log('[chat] raw presence state:', JSON.stringify(raw));  // TEMP DEBUG
    applyPeerList(getFilteredPeers());
  });
  ```
- If `raw` is empty `{}`, presence tracking itself is failing (`.track()` not succeeding)
- If `raw` has data but `getFilteredPeers()` returns `[]`, the role filter is wrong

### 5. Verify `.track()` is actually called
- The flow is: `SUBSCRIBED` → `isTrackedRef.current = true` → `channel.track({...})`
- Add a log: `console.log('[chat] tracking presence for', user.id);` inside the track block
- If it never logs, the `SUBSCRIBED` status is never received

### 6. Check if the channel is being subscribed to
- In `subscribeChannel()`, add: `console.log('[chat] subscribing, isSubscribed:', isSubscribedRef.current);`
- If `isSubscribedRef.current` is already `true`, the early return is blocking a fresh subscribe

### 7. Test with two users simultaneously
- Login as `tecnico@sgei.pt` / `Tech@1234` in one browser
- Login as `professor@sgei.pt` / `Teacher@1234` in another browser
- Both should see each other online (TECHNICIAN ↔ TEACHER pairing)

### 8. Check if the issue is local vs. production
- Run `npm run dev` locally with Supabase env vars set
- If it works locally but not on Vercel, the issue is env var configuration or CORS

## Key Code Locations

### Channel creation
```
frontend/src/lib/supabase/client.ts  →  createChatChannel()
```

### Subscribe + track logic
```
frontend/src/hooks/useChat.ts  →  subscribeChannel() function (lines ~110-165)
```

### Presence state reader + filter
```
frontend/src/hooks/useChat.ts  →  getFilteredPeers() (lines ~44-65)
```

### Where onlinePeers is rendered
```
frontend/src/components/chat/ChatWidget.tsx  →  <PeerList peers={onlinePeers} ... />
frontend/src/components/chat/PeerList.tsx    →  iterates onlinePeers
```

## Test Accounts

| Email | Password | Role | Can Chat With |
|-------|----------|------|---------------|
| tecnico@sgei.pt | Tech@1234 | TECHNICIAN | TEACHER, STAFF |
| professor@sgei.pt | Teacher@1234 | TEACHER | TECHNICIAN |
| staff@example.com | Staff@1234 | STAFF | TECHNICIAN |
| admin@sgei.pt | Admin@1234 | ADMIN | ❌ No chat access |

## Other Notes

- **No database tables needed** — Supabase Presence + Broadcast is entirely in-memory
- **No RLS policies needed** — no database writes for presence
- **Google OAuth** is configured, Tracking Prevention warnings are harmless browser-side
- **Backend (NestJS)** is untouched — REST APIs (assistance requests, maintenance, etc.) work fine
- **ChatWidget** listens for `chat:toggle` custom event from the sidebar
