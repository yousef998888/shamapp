# Real-Time Messaging Setup

This document explains how real-time messaging is implemented using Supabase real-time subscriptions.

## Overview

The chat system uses Supabase's real-time functionality to provide instant message delivery between users. Messages are sent and received in real-time without requiring page refreshes.

## Components

### 1. ChatService.ts
- **`subscribeToMessages()`**: Sets up real-time subscription to `order_messages` table
- **`subscribeToUserPresence()`**: Tracks user online/offline status
- **`sendMessage()`**: Sends messages and triggers real-time updates

### 2. ChatsPage.tsx
- Manages real-time subscriptions for the current chat
- Handles subscription cleanup and reconnection
- Tracks connection status

### 3. ChatHeader.tsx
- Displays real-time connection status (Live/Offline)
- Shows user presence (Online/Last seen)

## Database Requirements

### RLS Policies
The `order_messages` table must have Row Level Security enabled with the following policies. This is handled by the migration file `20250810000000_order_messages_rls_policies.sql`:

```sql
-- Enable RLS
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they are part of
CREATE POLICY "Users can view messages they are part of" ON public.order_messages
    FOR SELECT USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id
    );

-- Users can insert messages as sender
CREATE POLICY "Users can insert messages as sender" ON public.order_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
    );
```

### Running the Migration
The RLS policies are automatically applied when you run:
```bash
supabase db reset
```

Or manually apply the migration:
```bash
cd supabase
psql $DATABASE_URL -f migrations/20250810000000_order_messages_rls_policies.sql
```

### Table Structure
```sql
CREATE TABLE order_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    sender_id UUID NOT NULL REFERENCES users(id),
    receiver_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    message_type message_type DEFAULT 'text',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

## Supabase Configuration

### Client Setup
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
```

### Real-Time Channels
- **Message Channel**: `order_messages_{orderId}` - Listens for new messages
- **Presence Channel**: `presence_{userId}` - Tracks user online status

## How It Works

1. **Subscription Setup**: When a user opens a chat, `subscribeToMessages()` is called
2. **Real-Time Listening**: Supabase listens for INSERT/UPDATE events on the `order_messages` table
3. **Message Delivery**: New messages are automatically added to the chat in real-time
4. **Connection Monitoring**: Connection status is displayed to users

## Troubleshooting

### Messages Not Appearing in Real-Time
1. Check if RLS policies are properly configured
2. Verify Supabase real-time is enabled in your project
3. Check browser console for subscription errors
4. Ensure user authentication is working

### Connection Issues
1. Check network connectivity
2. Verify Supabase project URL and keys
3. Check if real-time quotas are exceeded
4. Monitor subscription status in console logs

### Performance Issues
1. Limit the number of active subscriptions
2. Implement proper cleanup on component unmount
3. Consider pagination for large message histories
4. Monitor real-time event frequency

## Testing Real-Time

1. Open two browser windows/tabs
2. Log in with different users
3. Start a chat between the users
4. Send messages from one window
5. Verify messages appear instantly in the other window

## Security Considerations

- RLS policies ensure users can only access their own conversations
- Real-time subscriptions respect the same security rules
- User authentication is required for all real-time operations
- Messages are validated before insertion

## Monitoring

- Connection status is displayed in the chat header
- Console logs show subscription status changes
- Error handling for failed subscriptions
- Automatic cleanup of unused subscriptions 