-- Enable Realtime for specific tables
-- This ensures that the 'subscribe()' calls in the frontend actually receive events.

-- 1. Add 'messages' to realtime publication
alter publication supabase_realtime add table messages;

-- 2. Add 'chats' to realtime publication (so we can listen for new chats in future)
alter publication supabase_realtime add table chats;

-- 3. Verify replication is enabled (Usually defaults to 'full' or 'default', but this ensures events are sent)
alter table messages replica identity full;
