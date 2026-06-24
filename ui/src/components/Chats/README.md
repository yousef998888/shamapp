# Real-Time User Presence System

This chat system includes a comprehensive real-time user presence system that shows when users are online or offline.

## Features

- **Real-time online/offline status**: Users' online status is updated in real-time
- **Visual indicators**: Green dots for online users, gray dots for offline users
- **Last seen timestamps**: Shows when users were last active
- **Automatic updates**: Presence is updated automatically when users switch tabs, close windows, or navigate away
- **Database persistence**: Presence status is stored in the database for reliability

## How It Works

### 1. Presence Tracking
- When a user opens the chat page, they are marked as "online"
- Presence is updated every 30 seconds to maintain the online status
- When users switch tabs, close windows, or navigate away, they are marked as "offline"

### 2. Real-time Updates
- Uses Supabase's real-time presence system
- Subscribes to presence changes for all users in the user's orders
- Updates are received instantly when users come online or go offline

### 3. Visual Indicators
- **Chat Sidebar**: Shows online/offline status with colored dots and text
- **Chat Header**: Displays detailed presence information including last seen time
- **Connection Status**: Shows when the presence system is active

## Database Schema

The system uses a `user_presence` table with the following structure:
```sql
CREATE TABLE user_presence (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

- `ChatService.updateUserPresence()`: Updates user's online status
- `ChatService.subscribeToMultipleUsersPresence()`: Subscribes to presence for multiple users
- `ChatService.getUserOnlineStatus()`: Gets user's current online status from database

## Troubleshooting

If presence status is not updating:

1. **Check browser console** for any error messages
2. **Verify Supabase connection** is working properly
3. **Check database permissions** for the user_presence table
4. **Use the refresh button** to manually refresh presence status
5. **Check network connectivity** to ensure real-time subscriptions are working

## Testing

To test the presence system:

1. Open the chat page in two different browsers or incognito windows
2. Log in with different user accounts
3. Create an order between the two users
4. Observe the online/offline status changes in real-time
5. Close one browser window and see the status change to offline
6. Reopen the browser and see the status change back to online

## Performance Considerations

- Presence updates are throttled to every 30 seconds to avoid excessive API calls
- Real-time subscriptions are cleaned up properly when components unmount
- Database queries are optimized with proper indexing
- Presence state is cached locally to reduce unnecessary re-renders 